import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  broadcastLists,
  broadcastListMembers,
  broadcastMessages,
  broadcastMembersSent,
  customers,
  integrationSettings,
} from "../drizzle/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { normalizeWhatsAppNumber } from "./utils/phone";

export const broadcastRouter = router({
  // Listar todas as listas de transmissão
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const lists = await db
      .select({
        id: broadcastLists.id,
        name: broadcastLists.name,
        description: broadcastLists.description,
        status: broadcastLists.status,
        createdAt: broadcastLists.createdAt,
        memberCount: sql<number>`COUNT(${broadcastListMembers.id})`,
      })
      .from(broadcastLists)
      .leftJoin(
        broadcastListMembers,
        eq(broadcastLists.id, broadcastListMembers.listId)
      )
      .where(
        and(
          eq(broadcastLists.createdBy, ctx.user.id),
          eq(broadcastLists.status, "active")
        )
      )
      .groupBy(broadcastLists.id)
      .orderBy(desc(broadcastLists.createdAt));

    return lists;
  }),

  // Criar nova lista de transmissão
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [list] = await db
        .insert(broadcastLists)
        .values({
          name: input.name,
          description: input.description,
          createdBy: ctx.user.id,
          status: "active",
        })
        .$returningId();

      return { success: true, listId: list.id };
    }),

  // Buscar detalhes de uma lista específica com membros
  getById: protectedProcedure
    .input(z.object({ listId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar a lista
      const [list] = await db
        .select()
        .from(broadcastLists)
        .where(
          and(
            eq(broadcastLists.id, input.listId),
            eq(broadcastLists.createdBy, ctx.user.id)
          )
        )
        .limit(1);

      if (!list) {
        throw new Error("Lista não encontrada");
      }

      // Buscar membros da lista
      const members = await db
        .select({
          id: broadcastListMembers.id,
          customerId: broadcastListMembers.customerId,
          addedAt: broadcastListMembers.addedAt,
          customerName: customers.name,
          customerPhone: customers.phone,
          customerEmail: customers.email,
        })
        .from(broadcastListMembers)
        .leftJoin(customers, eq(broadcastListMembers.customerId, customers.id))
        .where(eq(broadcastListMembers.listId, input.listId));

      return { ...list, members };
    }),

  // Adicionar contato à lista
  addMember: protectedProcedure
    .input(
      z.object({
        listId: z.number(),
        customerId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se a lista pertence ao usuário
      const [list] = await db
        .select()
        .from(broadcastLists)
        .where(
          and(
            eq(broadcastLists.id, input.listId),
            eq(broadcastLists.createdBy, ctx.user.id)
          )
        )
        .limit(1);

      if (!list) {
        throw new Error("Lista não encontrada");
      }

      // Verificar se já tem 50 membros
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(broadcastListMembers)
        .where(eq(broadcastListMembers.listId, input.listId));

      if (count >= 50) {
        throw new Error("Limite máximo de 50 contatos atingido");
      }

      // Verificar se o contato já está na lista
      const [existing] = await db
        .select()
        .from(broadcastListMembers)
        .where(
          and(
            eq(broadcastListMembers.listId, input.listId),
            eq(broadcastListMembers.customerId, input.customerId)
          )
        )
        .limit(1);

      if (existing) {
        throw new Error("Contato já está na lista");
      }

      // Adicionar membro
      await db.insert(broadcastListMembers).values({
        listId: input.listId,
        customerId: input.customerId,
      });

      return { success: true };
    }),

  // Remover contato da lista
  removeMember: protectedProcedure
    .input(
      z.object({
        memberId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar o membro para verificar a lista
      const [member] = await db
        .select()
        .from(broadcastListMembers)
        .where(eq(broadcastListMembers.id, input.memberId))
        .limit(1);

      if (!member) {
        throw new Error("Membro não encontrado");
      }

      // Verificar se a lista pertence ao usuário
      const [list] = await db
        .select()
        .from(broadcastLists)
        .where(
          and(
            eq(broadcastLists.id, member.listId),
            eq(broadcastLists.createdBy, ctx.user.id)
          )
        )
        .limit(1);

      if (!list) {
        throw new Error("Permissão negada");
      }

      await db
        .delete(broadcastListMembers)
        .where(eq(broadcastListMembers.id, input.memberId));

      return { success: true };
    }),

  // Excluir lista de transmissão
  delete: protectedProcedure
    .input(z.object({ listId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se a lista pertence ao usuário
      const [list] = await db
        .select()
        .from(broadcastLists)
        .where(
          and(
            eq(broadcastLists.id, input.listId),
            eq(broadcastLists.createdBy, ctx.user.id)
          )
        )
        .limit(1);

      if (!list) {
        throw new Error("Lista não encontrada");
      }

      // Soft delete - apenas marcar como deleted
      await db
        .update(broadcastLists)
        .set({ status: "deleted" })
        .where(eq(broadcastLists.id, input.listId));

      return { success: true };
    }),

  // Buscar contatos disponíveis para adicionar à lista
  searchCustomers: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        excludeListId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db
        .select({
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
        })
        .from(customers)
        .where(eq(customers.status, "active"))
        .limit(50);

      if (input.query) {
        query = db
          .select({
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
          })
          .from(customers)
          .where(
            and(
              eq(customers.status, "active"),
              sql`${customers.name} LIKE ${`%${input.query}%`}`
            )
          )
          .limit(50);
      }

      const results = await query;

      // Se tiver excludeListId, filtrar contatos já na lista
      if (input.excludeListId) {
        const members = await db
          .select({ customerId: broadcastListMembers.customerId })
          .from(broadcastListMembers)
          .where(eq(broadcastListMembers.listId, input.excludeListId));

        const memberIds = members.map(m => m.customerId);
        return results.filter(c => !memberIds.includes(c.id));
      }

      return results;
    }),

  // Enviar mensagem para a lista (com suporte a arquivos)
  sendMessage: protectedProcedure
    .input(
      z.object({
        listId: z.number(),
        content: z.string().optional().default(''),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar a lista e seus membros
      const [list] = await db
        .select()
        .from(broadcastLists)
        .where(
          and(
            eq(broadcastLists.id, input.listId),
            eq(broadcastLists.createdBy, ctx.user.id),
            eq(broadcastLists.status, "active")
          )
        )
        .limit(1);

      if (!list) {
        throw new Error("Lista não encontrada ou inativa");
      }

      // Buscar membros (apenas com telefone válido)
      const members = await db
        .select({
          customerId: broadcastListMembers.customerId,
          phone: customers.phone,
        })
        .from(broadcastListMembers)
        .leftJoin(customers, eq(broadcastListMembers.customerId, customers.id))
        .where(
          and(
            eq(broadcastListMembers.listId, input.listId),
            sql`${customers.phone} IS NOT NULL` // Apenas membros com telefone
          )
        );

      // Filtrar no código também (segurança extra)
      const validMembers = members.filter(m => m.phone && m.customerId);

      if (validMembers.length === 0) {
        throw new Error("Lista não possui membros com telefone válido");
      }

      // 1. Extraia e valide os dados recebidos do Frontend
      const { content, fileUrl, fileName, fileType, fileSize } = input;

      if (!validMembers || validMembers.length === 0) {
        console.error("[Broadcast] Erro: Lista de destinatários vazia ou inválida", { listId: input.listId, memberCount: validMembers?.length });
        throw new Error("Nenhum destinatário selecionado para o envio.");
      }

      // Declaração da variável no escopo superior
      let finalMessageId: number;

      try {
        // 2. Salva a Mensagem Principal Primeiro (SEM .returning())
        const result = await db
          .insert(broadcastMessages)
          .values({
            listId: input.listId,
            content: content || "",
            fileUrl: fileUrl || null,
            fileName: fileName || null,
            fileType: fileType || null,
            fileSize: fileSize || null,
            sentBy: ctx.user.id,
            totalRecipients: validMembers.length,
            successfulSends: 0,
            failedSends: 0,
          });

        // Extrai o ID dependendo do driver (mysql2, sqlite, etc.)
        const rawId = Array.isArray(result) ? result[0]?.insertId : result?.insertId || result?.lastInsertRowid;
        finalMessageId = Number(rawId);

        console.log("[Broadcast] ID da mensagem criada:", finalMessageId);

        if (!finalMessageId || isNaN(finalMessageId)) {
          throw new Error("Mensagem salva, mas falha ao recuperar o ID (insertId não encontrado).");
        }

        // 3. Filtro Anti-Duplicata SUPERIOR (Baseado no telefone limpo)
        const uniqueMembersMap = new Map<string, any>();

        validMembers.forEach(m => {
          if (m && m.customerId && m.phone) {
            // Limpa o número removendo +, traços e espaços para comparação perfeita
            const cleanPhone = String(m.phone).replace(/\D/g, '');

            // Usa o telefone limpo como chave! Se houver 2 IDs com o mesmo telefone, só 1 passa.
            uniqueMembersMap.set(cleanPhone, {
              messageId: finalMessageId,
              customerId: Number(m.customerId),
              phone: cleanPhone,
              status: 'pending' as const
            });
          }
        });

        const membersToInsert = Array.from(uniqueMembersMap.values());

        if (membersToInsert.length === 0) {
          throw new Error("Nenhum cliente válido sobrou após a filtragem de duplicatas.");
        }

        // 4. DEBUG AGRESSIVO - Insere no banco e captura ERRO REAL
        try {
          if (!finalMessageId) {
            throw new Error("O finalMessageId está nulo ou inválido antes do insert.");
          }

          // Sanitização final forçada
          const sanitizedMembers = membersToInsert.map(m => ({
            messageId: Number(m.messageId),
            customerId: Number(m.customerId),
            phone: String(m.phone),
            status: 'pending' // Confirme se o schema aceita 'pending' (case-sensitive)
          }));

          console.log("[Broadcast] Dados sanitizados para insert:", sanitizedMembers);

          // Usa Drizzle nativo para melhor captura de erros do driver
          await db.insert(broadcastMembersSent).values(sanitizedMembers);
          console.log("[Broadcast] Inserção concluída com sucesso");
        } catch (dbError: any) {
          console.error("[Broadcast DB Error Completo]:", dbError);

          // Tenta buscar a causa raiz profunda do erro (driver do banco)
          const realCause = dbError?.cause?.message || dbError?.sqlMessage || dbError?.code || dbError?.message;

          // RETORNA OS DADOS NA TELA PARA DEBUG
          const failedData = membersToInsert.length > 0 ? JSON.stringify(membersToInsert[0]) : "vazio";
          const errorMsg = `Erro Real: ${realCause} | Dados Tentados: ${failedData}`;

          // Lança erro para o frontend exibir
          throw new Error(errorMsg);
        }
      } catch (error: any) {
        console.error("[Broadcast] Erro fatal na gravação:", error);
        throw error; // Deixa o erro subir para o handler TRPC
      }

      // Processar envio em background (não bloquear resposta)
      setImmediate(async () => {
        try {
          // Obtém uma nova conexão para o background (evita problemas de escopo/closed db)
          const bgDb = await getDb();
          if (!bgDb) throw new Error("Database not available in background");
          await processBroadcastSend(finalMessageId, bgDb);
        } catch (error) {
          console.error("[Broadcast] Erro no processamento:", error);
        }
      });

      return {
        success: true,
        messageId: finalMessageId,
        totalRecipients: validMembers.length,
      };
    }),

  // 🔧 ROTA TEMPORÁRIA: Criar tabela broadcast_members_sent
  // USO: Apenas para setup inicial do banco
  setupDatabase: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Segurança: apenas usuários autenticados podem usar (protectedProcedure já garante isso)
    // Se quiser adicionar restrição extra, descomente abaixo:
    // if (!ctx.user.email?.endsWith('@farmacia.com')) throw new Error('Acesso negado');

    const sql = `
      CREATE TABLE IF NOT EXISTS \`broadcast_members_sent\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`message_id\` int NOT NULL,
        \`customer_id\` int NOT NULL,
        \`phone\` varchar(20) NOT NULL,
        \`status\` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
        \`error\` text,
        \`sent_at\` timestamp NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        FOREIGN KEY (\`message_id\`) REFERENCES \`broadcast_messages\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE KEY \`broadcast_members_sent_message_id_phone_unique\` (\`message_id\`,\`phone\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
      await db.execute(sql);
      return {
        success: true,
        message: "Tabela broadcast_members_sent criada ou já existente"
      };
    } catch (error: any) {
      console.error("[SetupDB] Error:", error);
      throw new Error(`Falha ao criar tabela: ${error.message}`);
    }
  }),

  // Buscar histórico de mensagens enviadas
  getMessageHistory: protectedProcedure
    .input(z.object({ listId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se a lista pertence ao usuário
      const [list] = await db
        .select()
        .from(broadcastLists)
        .where(
          and(
            eq(broadcastLists.id, input.listId),
            eq(broadcastLists.createdBy, ctx.user.id)
          )
        )
        .limit(1);

      if (!list) {
        throw new Error("Lista não encontrada");
      }

      const messages = await db
        .select({
          id: broadcastMessages.id,
          content: broadcastMessages.content,
          totalRecipients: broadcastMessages.totalRecipients,
          successfulSends: broadcastMessages.successfulSends,
          failedSends: broadcastMessages.failedSends,
          sentAt: broadcastMessages.sentAt,
        })
        .from(broadcastMessages)
        .where(eq(broadcastMessages.listId, input.listId))
        .orderBy(desc(broadcastMessages.sentAt));

      return messages;
    }),

  // Upload de arquivo temporário para broadcast (retorna URL pública no R2)
  uploadTempFile: protectedProcedure
    .input(
      z.object({
        file: z.custom<File>(), // Será recebido via FormData (multipart)
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Nota: Input via FormData não é suportado diretamente no tRPC.
      // Esta mutation será chamada via endpoint REST especial.
      // Mantemos a assinatura para documentação.
      throw new Error(
        "Use o endpoint REST /api/broadcast/upload-temp-file para upload de arquivos"
      );
    }),
});

/**
 * ============================================================
 * FUNÇÕES AUXILIARES - Broadcast
 * ============================================================
 */

/**
 * Busca configuração da Evolution API do banco
 */
async function getEvolutionConfig(db: Database) {
  const [configRecord] = await db
    .select()
    .from(integrationSettings)
    .where(eq(integrationSettings.integrationType, "evolution_api"))
    .limit(1);

  if (!configRecord?.config) return null;

  const configData =
    typeof configRecord.config === "string"
      ? JSON.parse(configRecord.config)
      : configRecord.config;

  // Obter a instância "Meu" ou a primeira
  const instance = (configData.instances as any[])?.find(
    (i: any) => i.name === "Meu"
  ) || (configData.instances as any[])?.[0];

  return instance;
}

/**
 * Processa o envio de um broadcast em background
 */
async function processBroadcastSend(messageId: number) {
  console.log("[Broadcast][Process] Starting processing for message:", messageId);

  const db = await getDb();
  if (!db) {
    console.error("[Broadcast][Process] Database not available");
    return;
  }

  try {
    // 1. Buscar mensagem de broadcast
    const [message] = await db
      .select({
        id: broadcastMessages.id,
        listId: broadcastMessages.listId,
        content: broadcastMessages.content,
        fileUrl: broadcastMessages.fileUrl,
        fileName: broadcastMessages.fileName,
        fileType: broadcastMessages.fileType,
        fileSize: broadcastMessages.fileSize,
        totalRecipients: broadcastMessages.totalRecipients,
      })
      .from(broadcastMessages)
      .where(eq(broadcastMessages.id, messageId))
      .limit(1);

    if (!message) {
      console.error("[Broadcast][Process] Message not found:", messageId);
      return;
    }

    // 2. Buscar membros pendentes
    const pendingMembers = await db
      .select({
        id: broadcastMembersSent.id,
        customerId: broadcastMembersSent.customerId,
        phone: broadcastMembersSent.phone,
      })
      .from(broadcastMembersSent)
      .where(
        and(
          eq(broadcastMembersSent.messageId, messageId),
          eq(broadcastMembersSent.status, "pending")
        )
      );

    if (pendingMembers.length === 0) {
      console.log("[Broadcast][Process] No pending members found");
      return;
    }

    console.log(
      "[Broadcast][Process] Processing",
      pendingMembers.length,
      "recipients"
    );

    // 3. Buscar config Evolution API
    const instance = await getEvolutionConfig(db);
    if (!instance?.url || !instance?.apiKey) {
      console.error("[Broadcast][Process] Evolution API not configured");
      // Marcar todos como falha
      await db
        .update(broadcastMembersSent)
        .set({
          status: "failed",
          error: "Evolution API não configurada",
        })
        .where(
          and(
            eq(broadcastMembersSent.messageId, messageId),
            eq(broadcastMembersSent.status, "pending")
          )
        );
      await db
        .update(broadcastMessages)
        .set({
          failedSends: sql<number>`failed_sends + ${pendingMembers.length}`,
        })
        .where(eq(broadcastMessages.id, messageId));
      return;
    }

    const baseUrl = (instance.url as string).replace(/\/$/, "");
    const apiKey = instance.apiKey as string;

    // 4. Processar cada membro
    for (const member of pendingMembers) {
      try {
        // Normalizar número (garante formato com 9º dígito para Brasil)
        const normalizedPhone = normalizeWhatsAppNumber(member.phone);
        const toNumber = `${normalizedPhone}@s.whatsapp.net`;

        // Decidir se envia texto puro ou mídia
        if (message.fileUrl) {
          // Enviar com mídia
          const mediaUrl = message.fileUrl;
          const fileName = message.fileName || "arquivo";
          const mimeType = message.fileType || "application/octet-stream";

          // Baixar o arquivo da URL (R2 ou WhatsApp CDN) e re-enviar?
          // Evolution API aceita URL pública diretamente se for acessível
          // Para R2 URLs são públicas. Para WhatsApp URLs temporárias, precisamos baixar e re-hospedar?
          // Decisão: Usar mediaUrl diretamente se for R2 (r2.dev), caso contrário baixar e reenviar como base64
          let sendUrl: string;
          let sendData: any;

          if (mediaUrl.includes("r2.dev") || mediaUrl.startsWith("http")) {
            // URL pública - Evolution API pode baixar diretamente
            sendUrl = `${baseUrl}/chat/sendMediaMessage/${instance.name}`;
            sendData = {
              number: toNumber,
              options: {
                mediaUrl,
                fileName,
                mediaType: mimeType,
                caption: message.content || undefined,
              },
            };
          } else {
            // URL temporária (whatsapp) - precisa baixar e enviar como base64
            // (simplificado: por enquanto só suporta R2 / URLs públicas)
            throw new Error("URL de mídia temporária não suportada no broadcast");
          }

          const response = await fetch(sendUrl, {
            method: "POST",
            headers: {
              "apikey": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(sendData),
            signal: AbortSignal.timeout(30000),
          });

          if (!response.ok) {
            const err = await response.text();
            throw new Error(`Evolution error: ${response.status} - ${err}`);
          }

          console.log(
            "[Broadcast][Process] Media sent to",
            normalizedPhone,
            "status:",
            response.status
          );
        } else {
          // Enviar texto puro
          const sendUrl = `${baseUrl}/chat/sendText/${instance.name}`;
          const response = await fetch(sendUrl, {
            method: "POST",
            headers: {
              "apikey": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              number: toNumber,
              text: message.content,
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (!response.ok) {
            const err = await response.text();
            throw new Error(`Evolution error: ${response.status} - ${err}`);
          }

          console.log(
            "[Broadcast][Process] Text sent to",
            normalizedPhone,
            "status:",
            response.status
          );
        }

        // Marcar como enviado com sucesso
        await db
          .update(broadcastMembersSent)
          .set({
            status: "sent",
            sentAt: new Date(),
          })
          .where(eq(broadcastMembersSent.id, member.id));

        await db
          .update(broadcastMessages)
          .set({
            successfulSends: sql<number>`successful_sends + 1`,
          })
          .where(eq(broadcastMessages.id, messageId));
      } catch (error: any) {
        console.error(
          "[Broadcast][Process] Failed to send to",
          member.phone,
          ":",
          error.message
        );

        // Marcar como falha
        await db
          .update(broadcastMembersSent)
          .set({
            status: "failed",
            error: error.message,
          })
          .where(eq(broadcastMembersSent.id, member.id));

        await db
          .update(broadcastMessages)
          .set({
            failedSends: sql<number>`failed_sends + 1`,
          })
          .where(eq(broadcastMessages.id, messageId));
      }
    }

    console.log("[Broadcast][Process] Completed for message:", messageId);
  } catch (error: any) {
    console.error("[Broadcast][Process] Critical error:", error);
  }
}

// Normalização de números feita via utils/phone.ts (normalizeWhatsAppNumber)
