import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  conversations,
  conversationMessages,
  customers,
  users,
  agentStatus,
  integrationSettings,
} from "../drizzle/schema";
import { eq, and, desc, sql, or, isNull } from "drizzle-orm";
import { storagePut } from "./storage";
import {
  sendWhatsAppImage,
  sendWhatsAppMessage,
  sendWhatsAppViewOnceMedia,
  sendInstagramImage,
  sendInstagramMessage,
  sendWhatsAppDocument,
  sendInstagramDocument,
  sendWhatsAppMedia,
  fetchEvolutionProfile,
} from "./messaging";
import { sseManager, EVENTS } from "./_core/sse";
import { fireAndForget, enqueueCrmOutboxEvent } from "./crm-core";
import { getPhoneSearchVariants } from "./db-messages";
import { formatPhoneBR } from "./utils/phone";

/**
 * Verificar se dois números são o mesmo contato brasileiro
 * Compara sem o + para consistência
 */
function isSameNumber(num1: string, num2: string): boolean {
  // Remover o + para comparação
  const clean = (n: string) => n.replace(/\D/g, "").replace(/^55/, "");
  return clean(num1) === clean(num2);
}

export const conversationsRouter = router({
  // Criar nova conversa
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        phoneOrEmail: z.string().optional(),
        channel: z.enum(["whatsapp", "instagram"]).default("whatsapp"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let customerId = input.customerId;
      let fetchedName: string | null = null;

      // Se forneceu phoneOrEmail, criar ou encontrar customer
      if (input.phoneOrEmail && !customerId) {
        const isEmail = input.phoneOrEmail.includes("@");

        if (!isEmail) {
          // É telefone - gerar variantes de busca a partir do número bruto
          // A função getPhoneSearchVariants normaliza internamente e gera com/sem 9, com +, etc.
          const phoneVariants = getPhoneSearchVariants(input.phoneOrEmail);
          const normalizedPhone = formatPhoneBR(input.phoneOrEmail); // Formato estrito para salvar

          console.log("[Conversations] Número processado:", {
            original: input.phoneOrEmail,
            normalized: normalizedPhone,
            variantsCount: phoneVariants.length,
          });

          const phoneCondition = phoneVariants.length > 1
            ? or(...phoneVariants.map(v => eq(customers.phone, v)))
            : eq(customers.phone, phoneVariants[0]);

          const [existingCustomer] = await db
            .select()
            .from(customers)
            .where(phoneCondition)
            .limit(1);

          if (existingCustomer) {
            console.log(
              "[Conversations] Customer encontrado (flexible search):",
              existingCustomer.name
            );
            customerId = existingCustomer.id;
          }
        } else {
          // É email
          const [existingCustomer] = await db
            .select()
            .from(customers)
            .where(eq(customers.email, input.phoneOrEmail))
            .limit(1);

          if (existingCustomer) {
            customerId = existingCustomer.id;
          }
        }

        // Se ainda não encontrou, criar novo customer
        if (!customerId) {
          // Novo customer - tentar buscar nome do WhatsApp
          if (input.channel === "whatsapp" && !isEmail) {
            console.log(
              "[Conversations] Buscando nome do WhatsApp para:",
              input.phoneOrEmail
            );
            try {
              const profile = await fetchEvolutionProfile(input.phoneOrEmail);
              if (profile?.name) {
                fetchedName = profile.name;
                console.log("[Conversations] Nome encontrado:", fetchedName);
              }
            } catch (err) {
              console.log(
                "[Conversations] Erro ao buscar nome (continuando):",
                err
              );
            }
          }

          const customerName = fetchedName || input.phoneOrEmail;
          const phoneToSave = formatPhoneBR(input.phoneOrEmail);
          const newCustomer = await db
            .insert(customers)
            .values({
              name: customerName,
              phone: phoneToSave,
              email: isEmail ? input.phoneOrEmail : null,
            })
            .$returningId();
          customerId = newCustomer[0].id;
          console.log("[Conversations] Novo customer criado:", customerName, "phone:", phoneToSave);
        }
      }

      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      // Buscar dados do customer
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Se o customer tem apenas telefone e não nome, tentar buscar nome do WhatsApp
      if (
        !fetchedName &&
        input.channel === "whatsapp" &&
        customer.phone &&
        customer.name === customer.phone
      ) {
        console.log(
          "[Conversations] Atualizando nome do WhatsApp para customer existente:",
          customer.phone
        );
        try {
          const profile = await fetchEvolutionProfile(customer.phone);
          if (profile?.name) {
            // Atualizar o nome do customer
            await db
              .update(customers)
              .set({
                name: profile.name,
                photoUrl: profile.profilePicture || customers.photoUrl,
              })
              .where(eq(customers.id, customer.id));
            customer.name = profile.name;
            console.log("[Conversations] Nome atualizado:", profile.name);
          }
        } catch (err) {
          console.log("[Conversations] Erro ao atualizar nome:", err);
        }
      }

      // Criar nova conversa
      const newConversation = await db
        .insert(conversations)
        .values({
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          channel: input.channel,
          status: "assigned",
          assignedTo: ctx.user.id,
          openedAt: new Date(),
          lastMessageAt: new Date(),
        })
        .$returningId();

      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "ConversationCreated",
          entityType: "conversation",
          entityId: newConversation[0].id,
          actorUserId: ctx.user.id,
          payload: {
            customerId: customer.id,
            channel: input.channel,
            assignedTo: ctx.user.id,
          },
        });
      });

      // Buscar conversa criada
      const [created] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, newConversation[0].id))
        .limit(1);

      return created;
    }),

  // Vincular/atualizar customer na conversa (usado pelo painel do agente)
  linkCustomer: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        customerId: z.number(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const update: any = {
        customerId: input.customerId,
      };
      if (input.customerName) update.customerName = input.customerName;
      if (input.customerPhone) update.customerPhone = input.customerPhone;

      await db
        .update(conversations)
        .set(update)
        .where(eq(conversations.id, input.conversationId));

      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "ConversationCustomerLinked",
          entityType: "conversation",
          entityId: input.conversationId,
          actorUserId: ctx.user.id,
          payload: {
            customerId: input.customerId,
          },
        });
      });

      return { success: true };
    }),

  // Listar conversas ativas do agente (inclui todas - open E assigned - para fila)
  // Usuários normais veem suas conversas atribuídas + conversas na fila (open sem assignedTo)
  // Admins veem todas
  listActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const userId = ctx.user.id;
    const userRole = ctx.user.role;
    
    // Build where clause
    // Admin: todas as conversas com status 'assigned' ou 'open'
    // Usuário normal: conversas atribuídas a ele OU conversas na fila (status='open' e assignedTo=null)
    const whereCondition = userRole === 'admin' 
      ? or(
          eq(conversations.status, "assigned"),
          eq(conversations.status, "open")
        )
      : or(
          // Conversas atribuídas ao usuário
          and(
            eq(conversations.status, "assigned"),
            eq(conversations.assignedTo, userId)
          ),
          // Conversas na fila (status=open, sem assignedTo)
          and(
            eq(conversations.status, "open"),
            isNull(conversations.assignedTo)
          )
        );
    
    const agentConversations = await db
      .select({
        id: conversations.id,
        customerId: conversations.customerId,
        customerName: conversations.customerName,
        customerPhone: conversations.customerPhone,
        customerAvatar: customers.photoUrl,
        channel: conversations.channel,
        status: conversations.status,
        assignedTo: conversations.assignedTo,
        assignedAgentName: users.name,
        openedAt: conversations.openedAt,
        lastMessageAt: conversations.lastMessageAt,
        lastMessage: sql<string>`(
          SELECT content 
          FROM conversation_messages 
          WHERE conversation_messages.conversation_id = ${conversations.id} 
          ORDER BY created_at DESC 
          LIMIT 1
        )`,
        unreadCount: sql<number>`(
          SELECT COUNT(*) 
          FROM conversation_messages 
          WHERE conversation_messages.conversation_id = ${conversations.id} 
          AND conversation_messages.sender_type = 'customer'
          AND conversation_messages.read_at IS NULL
        )`,
      })
      .from(conversations)
      .leftJoin(customers, eq(conversations.customerId, customers.id))
      .leftJoin(users, eq(conversations.assignedTo, users.id))
      .where(whereCondition)
      .orderBy(desc(conversations.lastMessageAt));

    const normalizePhone = (value?: string | null) => {
      if (!value) return "";
      const digits = value.replace(/\D/g, "");
      return digits || value;
    };

    const mergedByPhone = new Map<
      string,
      (typeof agentConversations)[number]
    >();

    for (const conv of agentConversations) {
      const key = normalizePhone(conv.customerPhone || conv.customerName);
      const existing = mergedByPhone.get(key);

      if (!existing) {
        mergedByPhone.set(key, conv);
        continue;
      }

      const existingName = existing.customerName || "";
      const incomingName = conv.customerName || "";
      const existingLooksLikePhone =
        existingName.replace(/\D/g, "").length >= 8;
      const incomingLooksLikePhone =
        incomingName.replace(/\D/g, "").length >= 8;

      if (existingLooksLikePhone && !incomingLooksLikePhone) {
        mergedByPhone.set(key, conv);
        continue;
      }

      if (!existingLooksLikePhone && incomingLooksLikePhone) {
        continue;
      }

      if (
        new Date(conv.lastMessageAt).getTime() >
        new Date(existing.lastMessageAt).getTime()
      ) {
        mergedByPhone.set(key, conv);
      }
    }

    return Array.from(mergedByPhone.values());
  }),

  loggedAgents: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const agents = await db
      .select({
        id: users.id,
        name: users.name,
        status: agentStatus.status,
      })
      .from(agentStatus)
      .innerJoin(users, eq(agentStatus.userId, users.id))
      .where(eq(agentStatus.status, "online"))
      .orderBy(desc(agentStatus.lastActivity));

    return agents.filter(agent => agent.id !== ctx.user.id);
  }),

  transfer: protectedProcedure
    .input(z.object({ conversationId: z.number(), agentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            ctx.user.role === "admin"
              ? sql`1=1`
              : eq(conversations.assignedTo, ctx.user.id)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error("Conversa não encontrada ou sem permissão");
      }

      await db
        .update(conversations)
        .set({
          assignedTo: input.agentId,
          status: "assigned",
        })
        .where(eq(conversations.id, input.conversationId));

      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "ConversationTransferred",
          entityType: "conversation",
          entityId: input.conversationId,
          actorUserId: ctx.user.id,
          payload: { toAgentId: input.agentId },
        });
      });

      return { success: true };
    }),

  close: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        reason: z
          .enum(["venda", "orcamento", "conversa_anterior", "engano"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { conversations } = await import("../drizzle/schema");
      const { eq, or, and } = await import("drizzle-orm");

      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            ctx.user.role === "admin"
              ? sql`1=1`
              : or(
                  eq(conversations.assignedTo, ctx.user.id),
                  eq(conversations.status, "open"),
                  and(
                    eq(conversations.status, "assigned"),
                    isNull(conversations.assignedTo)
                  )
                )
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error("Conversa não encontrada ou sem permissão");
      }

      await db
        .update(conversations)
        .set({
          status: "closed",
          closedAt: new Date(),
          closeReason: input.reason || "conversa_anterior",
          assignedTo: ctx.user.id,
        })
        .where(eq(conversations.id, input.conversationId));

      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "ConversationClosed",
          entityType: "conversation",
          entityId: input.conversationId,
          actorUserId: ctx.user.id,
          payload: { reason: input.reason || "conversa_anterior" },
        });
      });

      // Send closing message
      const { closeConversation } = await import("./chatbot");
      await closeConversation(
        input.conversationId,
        input.reason || "conversa_anterior"
      );

      return { success: true };
    }),

  // Pegar conversa da fila (atribuir a si mesmo)
  take: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { conversations } = await import("../drizzle/schema");
      const { eq, and, or } = await import("drizzle-orm");

      // Find conversation that is open (in queue)
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.status, "open")
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error("Conversa não encontrada ou já está atribuída");
      }

      // Assign to current user
      await db
        .update(conversations)
        .set({
          status: "assigned",
          assignedTo: ctx.user.id,
          queueId: null,
        })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  // Obter detalhes de uma conversa
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.id),
            eq(conversations.assignedTo, ctx.user.id)
          )
        )
        .limit(1);

      return conversation;
    }),

  // Endpoint temporário para corrigir conversas órfãs
  fixOrphaned: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Atualizar conversas com status="assigned" mas assignedTo=null
    await db
      .update(conversations)
      .set({ status: "open" })
      .where(
        and(
          eq(conversations.status, "assigned"),
          isNull(conversations.assignedTo)
        )
      );

    return {
      success: true,
      message:
        "Conversas órfãs corrigidas (status=assigned com assignedTo=null foram alteradas para status=open)",
    };
  }),
});

export const messagesRouter = router({
  // Listar mensagens de uma conversa
  list: protectedProcedure
    .input(z.object({ conversation_id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Verificar se o agente tem acesso a esta conversa
      // Admin pode ver todas, user apenas as atribuídas a ele ou na fila
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversation_id),
            ctx.user.role === "admin"
              ? sql`1=1` // Admin vê todas
              : or(
                  eq(conversations.assignedTo, ctx.user.id),
                  eq(conversations.status, "open"),
                  and(
                    eq(conversations.status, "assigned"),
                    isNull(conversations.assignedTo)
                  )
                )
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error("Conversa não encontrada ou sem permissão");
      }

      const messagesList = await db
        .select({
          id: conversationMessages.id,
          conversationId: conversationMessages.conversationId,
          senderId: conversationMessages.senderId,
          senderType: conversationMessages.senderType,
          content: conversationMessages.content,
          fileUrl: conversationMessages.fileUrl,
          fileName: conversationMessages.fileName,
          fileType: conversationMessages.fileType,
          fileSize: conversationMessages.fileSize,
          readAt: conversationMessages.readAt,
          createdAt: conversationMessages.createdAt,
          // Nome formatado do agente: "Nome do Agente" ou "Nome - Admin"
          senderName: sql<string>`CASE 
            WHEN ${conversationMessages.senderType} = 'agent' AND ${users.role} = 'admin' 
            THEN CONCAT(${users.name}, ' - Gerente')
            WHEN ${conversationMessages.senderType} = 'agent' 
            THEN ${users.name}
            ELSE NULL 
          END`.as('senderName'),
        })
        .from(conversationMessages)
        .leftJoin(users, eq(conversationMessages.senderId, users.id))
        .where(eq(conversationMessages.conversationId, input.conversation_id))
        .orderBy(conversationMessages.createdAt);

      // Log para debug de arquivos
      console.log("[MESSAGES LIST] Total messages:", messagesList.length);
      messagesList.forEach((msg: any) => {
        console.log("[MESSAGES LIST] Message", msg.id, 
          "senderType:", msg.senderType,
          "senderName:", msg.senderName,
          "content:", msg.content ? msg.content.substring(0, 30) + "..." : "null");
        if (msg.fileUrl) {
          console.log("[MESSAGES LIST]   fileUrl length:", msg.fileUrl?.length,
            "fileType:", msg.fileType,
            "fileName:", msg.fileName);
        }
      });

      return messagesList;
    }),

  // Upload de arquivo
  uploadFile: protectedProcedure
    .input(
      z.object({
        conversation_id: z.number(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        fileData: z.string(), // Base64 encoded
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log("[UPLOAD FILE] Iniciando upload:", input.fileName, input.fileType, input.fileSize);
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se o agente tem acesso a esta conversa
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversation_id),
            ctx.user.role === "admin"
              ? sql`1=1`
              : or(
                  eq(conversations.assignedTo, ctx.user.id),
                  eq(conversations.status, "open"),
                  and(
                    eq(conversations.status, "assigned"),
                    isNull(conversations.assignedTo)
                  )
                )
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error("Conversa não encontrada ou sem permissão");
      }

      // Validar tamanho do arquivo (máximo 16MB)
      if (input.fileSize > 16 * 1024 * 1024) {
        throw new Error("Arquivo muito grande. Tamanho máximo: 16MB");
      }

      // Decodificar base64 para Buffer
      const fileBuffer = Buffer.from(input.fileData, "base64");

      // Infer MIME type from extension if not provided
      const ext = (
        (input.fileName?.split(".").pop() || "") as string
      ).toLowerCase();
      const mimeFromExt = (ext: string): string => {
        switch (ext) {
          case "jpg":
          case "jpeg":
            return "image/jpeg";
          case "png":
            return "image/png";
          case "gif":
            return "image/gif";
          case "webp":
            return "image/webp";
          case "pdf":
            return "application/pdf";
          case "doc":
            return "application/msword";
          case "docx":
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          case "txt":
            return "text/plain";
          case "mp4":
            return "video/mp4";
          case "mov":
            return "video/quicktime";
          case "webm":
            return "video/webm";
          default:
            return "application/octet-stream";
        }
      };
      const mime = input.fileType || mimeFromExt(ext);

      // Gerar chave única para o arquivo
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = ext;
      const fileKey = `chat-files/${ctx.user.id}/${timestamp}-${randomSuffix}.${fileExtension}`;

      console.log("[UPLOAD FILE] Upload para S3:", fileKey);

      // Upload para S3
      const { url: fileUrl } = await storagePut(fileKey, fileBuffer, mime);

      console.log("[UPLOAD FILE] Upload concluído. URL:", fileUrl);

      return {
        success: true,
        fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
      };
    }),

  // Enviar mensagem
  send: protectedProcedure
    .input(
      z.object({
        conversation_id: z.number(),
        content: z.string().min(1),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
        viewOnce: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Verificar se o agente tem acesso a esta conversa
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversation_id),
            ctx.user.role === "admin"
              ? sql`1=1`
              : or(
                  eq(conversations.assignedTo, ctx.user.id),
                  eq(conversations.status, "open"),
                  and(
                    eq(conversations.status, "assigned"),
                    isNull(conversations.assignedTo)
                  )
                )
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error("Conversa não encontrada ou sem permissão");
      }

      let destination = conversation.customerPhone;
      if (!destination) {
        throw new Error("Destino não encontrado para esta conversa");
      }

      // 🎯 DETECÇÃO DE GRUPO WHATSAPP
      // Grupos podem ter hífen (antigos) ou ser muito longos (novos, >14 dígitos)
      // Se for grupo e não tiver sufixo, adicionar @g.us
      // Se for contato normal e não tiver sufixo, adicionar @s.whatsapp.net
      const cleanNumber = destination.replace(/\D/g, '');
      const isGroup = destination.includes('-') || cleanNumber.length > 14;
      if (isGroup && !destination.includes('@')) {
        destination = `${destination}@g.us`;
      } else if (!isGroup && !destination.includes('@')) {
        destination = `${destination}@s.whatsapp.net`;
      }

      // Buscar dados do agente para formatar nome
      const [agent] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const agentName = agent?.name || "Agente";
      const roleSuffix = agent?.role === "admin" ? " - Gerente" : "";
      const formattedAgentName = `${agentName}${roleSuffix}`;

      // Prefixar nome do agente nas mensagens enviadas ao WhatsApp
      // Usar Markdown (*negrito*) apenas
      const prefixedContent = `*${formattedAgentName}*\n${input.content}`;

      console.log("[SEND MESSAGE] Input:", JSON.stringify({
        content: input.content,
        prefixedContent,
        agentName: formattedAgentName,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        viewOnce: input.viewOnce,
      }));

      const isImage = Boolean(
        input.fileUrl && input.fileType?.startsWith("image/")
      );
      const isVideo = Boolean(
        input.fileUrl && input.fileType?.startsWith("video/")
      );
      const isAudio = Boolean(
        input.fileUrl && input.fileType?.startsWith("audio/")
      );
      const isDocument = Boolean(
        input.fileUrl && 
        (input.fileType?.startsWith("application/") || 
         input.fileType === "text/plain" ||
         input.fileType?.startsWith("text/"))
      );

      console.log("[SEND MESSAGE] Type detection:", {
        isImage,
        isVideo,
        isAudio,
        isDocument,
        fileType: input.fileType
      });

      try {
        if (conversation.channel === "whatsapp") {
          if (isDocument && input.fileUrl) {
            // Enviar documento (PDF, DOC, XLS, etc.)
            console.log("[SEND MESSAGE] Sending DOCUMENT to WhatsApp:", {
              to: destination,
              documentUrl: input.fileUrl,
              filename: input.fileName,
              mimeType: input.fileType,
              caption: prefixedContent,
            });
            await sendWhatsAppDocument({
              to: destination,
              documentUrl: input.fileUrl,
              filename: input.fileName || "documento",
              mimeType: input.fileType || "application/octet-stream",
              caption: prefixedContent,
            });
          } else if (isAudio && input.fileUrl) {
            // Enviar áudio
            console.log("[SEND MESSAGE] Sending AUDIO to WhatsApp");
            await sendWhatsAppMedia({
              to: destination,
              mediaUrl: input.fileUrl,
              mediaType: "audio",
              mimeType: input.fileType || "audio/mp3",
            });
          } else if ((isImage || isVideo) && input.fileUrl) {
            console.log("[SEND MESSAGE] Sending IMAGE/VIDEO to WhatsApp, viewOnce:", input.viewOnce);
            if (input.viewOnce) {
              await sendWhatsAppViewOnceMedia({
                to: destination,
                mediaUrl: input.fileUrl,
                mediaType: isVideo ? "video" : "image",
                caption: prefixedContent,
              });
            } else {
              await sendWhatsAppImage({
                to: destination,
                imageUrl: input.fileUrl,
                caption: prefixedContent,
              });
            }
          } else {
            console.log("[SEND MESSAGE] Sending TEXT to WhatsApp");
            await sendWhatsAppMessage({
              to: destination,
              message: prefixedContent,
            });
          }
        } else if (conversation.channel === "instagram") {
          if (isDocument && input.fileUrl) {
            // Enviar documento via Instagram
            await sendInstagramDocument({
              to: destination,
              documentUrl: input.fileUrl,
              filename: input.fileName || "documento",
              mimeType: input.fileType || "application/octet-stream",
            });
          } else if (isImage && input.fileUrl) {
            await sendInstagramImage({
              to: destination,
              imageUrl: input.fileUrl,
            });
          } else {
            await sendInstagramMessage({
              to: destination,
              message: input.content,
            });
          }
        }
      } catch (error) {
        console.error("[Messages] Failed to send outbound message", error);
        throw new Error((error as Error).message || "Falha ao enviar mensagem");
      }

      // Criar mensagem
      const [message] = await db
        .insert(conversationMessages)
        .values({
          conversationId: input.conversation_id,
          senderId: ctx.user.id,
          senderType: "agent",
          content: input.content,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          createdAt: new Date(),
        })
        .$returningId();

      // Atualizar última mensagem da conversa
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
        })
        .where(eq(conversations.id, input.conversation_id));

      sseManager.emitToUser(String(ctx.user.id), {
        type: EVENTS.MESSAGE_STATUS,
        data: {
          messageId: message.id,
          conversationId: input.conversation_id,
          status: "sent",
        },
        timestamp: Date.now(),
      });

      return { success: true, messageId: message.id };
    }),
});

// Router para mensagens internas (Admin ↔ Agente)
export const internalMessagesRouter = router({
  // Listar mensagens internas de uma conversa
  list: protectedProcedure
    .input(z.object({ conversation_id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { internalMessages, users } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");

      // Admin vê todas, agente vê apenas as que enviou ou recebeu
      const messages = await db
        .select({
          id: internalMessages.id,
          content: internalMessages.content,
          senderId: internalMessages.senderId,
          recipientId: internalMessages.recipientId,
          readAt: internalMessages.readAt,
          createdAt: internalMessages.createdAt,
          senderName: users.name,
        })
        .from(internalMessages)
        .leftJoin(users, eq(internalMessages.senderId, users.id))
        .where(eq(internalMessages.conversationId, input.conversation_id))
        .orderBy(desc(internalMessages.createdAt));

      return messages;
    }),

  // Enviar mensagem interna
  send: protectedProcedure
    .input(
      z.object({
        conversation_id: z.number(),
        recipient_id: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { internalMessages, conversations } = await import(
        "../drizzle/schema"
      );
      const { eq } = await import("drizzle-orm");

      // Verificar se a conversa existe
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversation_id))
        .limit(1);

      if (!conversation) {
        throw new Error("Conversa não encontrada");
      }

      // Criar mensagem interna
      const [message] = await db
        .insert(internalMessages)
        .values({
          conversationId: input.conversation_id,
          senderId: ctx.user.id,
          recipientId: input.recipient_id,
          content: input.content,
          createdAt: new Date(),
        })
        .$returningId();

      // Notificar o agente via SSE
      sseManager.emitToUser(String(input.recipient_id), {
        type: "INTERNAL_MESSAGE",
        data: {
          messageId: message.id,
          conversationId: input.conversation_id,
          senderId: ctx.user.id,
          senderName: ctx.user.name,
          content: input.content,
          customerName: conversation.customerName,
        },
        timestamp: Date.now(),
      });

      return { success: true, messageId: message.id };
    }),

  // Marcar como lida
  markAsRead: protectedProcedure
    .input(z.object({ message_id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { internalMessages } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(internalMessages)
        .set({ readAt: new Date() })
        .where(eq(internalMessages.id, input.message_id));

      return { success: true };
    }),

  // Marcar conversa como lida (zerar contador de não lidas)
  markConversationAsRead: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      console.log(`[markConversationAsRead] Conversation ${input.conversationId} by user ${ctx.user.id}`);

      // 1. Zerar unreadCount da conversa
      await db
        .update(conversations)
        .set({ unreadCount: 0 })
        .where(eq(conversations.id, input.conversationId));

      // 2. Marcar todas mensagens do cliente como lidas
      await db
        .update(conversationMessages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(conversationMessages.conversationId, input.conversationId),
            eq(conversationMessages.senderType, "customer"),
            isNull(conversationMessages.readAt)
          )
        );

      // 3. Notificar via SSE para sincronizar outros clients
      sseManager.emitToUser(String(ctx.user.id), {
        type: EVENTS.CONVERSATION_READ,
        data: { conversationId: input.conversationId }
      });

      console.log(`[markConversationAsRead] Success for conversation ${input.conversationId}`);

      return { success: true };
    }),

  // Contar mensagens não lidas
  countUnread: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const { internalMessages } = await import("../drizzle/schema");
    const { eq, and, isNull } = await import("drizzle-orm");

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(internalMessages)
      .where(
        and(
          eq(internalMessages.recipientId, ctx.user.id),
          isNull(internalMessages.readAt)
        )
      );

    return result[0]?.count || 0;
  }),
});
