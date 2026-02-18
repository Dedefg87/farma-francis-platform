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
  fetchEvolutionProfile,
} from "./messaging";
import { sseManager, EVENTS } from "./_core/sse";
import { fireAndForget, enqueueCrmOutboxEvent } from "./crm-core";

/**
 * Normalizar número de telefone brasileiro
 * Remove o 9 do celular se presente (padroniza para DDD + número fixo)
 * Adiciona o + no início para consistência
 *
 * Exemplo:
 * +5531986337081 → +5531986337081 (mantém)
 * +5531986337081 com 9 → +5531986337081 (remove o 9)
 */
function normalizeBrazilianNumber(value: string): string {
  const cleaned = value.replace(/\D/g, "");

  let normalized = cleaned;

  // Adicionar 55 se não tiver
  if (!normalized.startsWith("55")) {
    normalized = "55" + normalized;
  }

  // Se tem 13 dígitos (55 + DDD + 9 + 8 dígitos), remover o 9
  // 55 31 9 86337081 → 55 31 86337081
  if (normalized.length === 13 && normalized.startsWith("55")) {
    // Manter 55 + DDD (2 dígitos) + remover o 9 + resto
    normalized = normalized.substring(0, 4) + normalized.substring(5);
  }

  // Sempre adicionar o + no início
  return "+" + normalized;
}

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
          // É telefone - normalizar número brasileiro
          const normalizedPhone = normalizeBrazilianNumber(input.phoneOrEmail);
          console.log("[Conversations] Número normalizado:", {
            original: input.phoneOrEmail,
            normalized: normalizedPhone,
          });

          // Buscar customer existente por número normalizado (com ou sem 9)
          const [existingCustomer] = await db
            .select()
            .from(customers)
            .where(eq(customers.phone, normalizedPhone))
            .limit(1);

          if (existingCustomer) {
            console.log(
              "[Conversations] Customer encontrado pelo número normalizado:",
              existingCustomer.name
            );
            customerId = existingCustomer.id;
          } else {
            // Tentar buscar por outros formatos possíveis
            const possibleFormats = [
              normalizedPhone,
              normalizedPhone.startsWith("55")
                ? normalizedPhone.substring(0, 2) + normalizedPhone.substring(4)
                : normalizedPhone, // sem 9
            ];

            console.log(
              "[Conversations] Procurando formatos alternativos:",
              possibleFormats
            );

            // Tentar cada formato
            for (const format of possibleFormats) {
              const [altCustomer] = await db
                .select()
                .from(customers)
                .where(eq(customers.phone, format))
                .limit(1);

              if (altCustomer) {
                console.log(
                  "[Conversations] Customer encontrado por formato alternativo:",
                  altCustomer.name
                );
                customerId = altCustomer.id;
                break;
              }
            }
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
          const newCustomer = await db
            .insert(customers)
            .values({
              name: customerName,
              phone: normalizeBrazilianNumber(input.phoneOrEmail),
              email: isEmail ? input.phoneOrEmail : null,
            })
            .$returningId();
          customerId = newCustomer[0].id;
          console.log("[Conversations] Novo customer criado:", customerName);
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
  listActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
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
      .where(
        or(
          eq(conversations.status, "assigned"),
          eq(conversations.status, "open")
        )
      )
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
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, input.conversation_id))
        .orderBy(conversationMessages.createdAt);

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

      // Gerar chave única para o arquivo
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = input.fileName.split(".").pop();
      const fileKey = `chat-files/${ctx.user.id}/${timestamp}-${randomSuffix}.${fileExtension}`;

      // Upload para S3
      const { url: fileUrl } = await storagePut(
        fileKey,
        fileBuffer,
        input.fileType
      );

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

      const destination = conversation.customerPhone;
      if (!destination) {
        throw new Error("Destino não encontrado para esta conversa");
      }

      const isImage = Boolean(
        input.fileUrl && input.fileType?.startsWith("image/")
      );
      const isVideo = Boolean(
        input.fileUrl && input.fileType?.startsWith("video/")
      );

      try {
        if (conversation.channel === "whatsapp") {
          if ((isImage || isVideo) && input.fileUrl) {
            if (input.viewOnce) {
              await sendWhatsAppViewOnceMedia({
                to: destination,
                mediaUrl: input.fileUrl,
                mediaType: isVideo ? "video" : "image",
                caption: input.content,
              });
            } else {
              await sendWhatsAppImage({
                to: destination,
                imageUrl: input.fileUrl,
                caption: input.content,
              });
            }
          } else {
            await sendWhatsAppMessage({
              to: destination,
              message: input.content,
            });
          }
        } else if (conversation.channel === "instagram") {
          if (isImage && input.fileUrl) {
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
