import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { getDb } from './db';
import { conversations, conversationMessages, customers, users, agentStatus, integrationSettings } from '../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { storagePut } from './storage';
import { sendWhatsAppImage, sendWhatsAppMessage, sendInstagramImage, sendInstagramMessage, fetchEvolutionProfile } from './messaging';
import { sseManager, EVENTS } from './_core/sse';

export const conversationsRouter = router({
  // Criar nova conversa
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        phoneOrEmail: z.string().optional(),
        channel: z.enum(['whatsapp', 'instagram']).default('whatsapp'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      let customerId = input.customerId;
      let fetchedName: string | null = null;

      // Se forneceu phoneOrEmail, criar ou encontrar customer
      if (input.phoneOrEmail && !customerId) {
        const isEmail = input.phoneOrEmail.includes('@');
        
        // Tentar encontrar customer existente
        const [existingCustomer] = await db
          .select()
          .from(customers)
          .where(
            isEmail
              ? eq(customers.email, input.phoneOrEmail)
              : eq(customers.phone, input.phoneOrEmail)
          )
          .limit(1);

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Novo customer - tentar buscar nome do WhatsApp
          if (input.channel === 'whatsapp' && !isEmail) {
            console.log('[Conversations] Buscando nome do WhatsApp para:', input.phoneOrEmail);
            try {
              const profile = await fetchEvolutionProfile(input.phoneOrEmail);
              if (profile?.name) {
                fetchedName = profile.name;
                console.log('[Conversations] Nome encontrado:', fetchedName);
              }
            } catch (err) {
              console.log('[Conversations] Erro ao buscar nome (continuando com telefone):', err);
            }
          }

          // Criar novo customer com nome encontrado ou telefone
          const customerName = fetchedName || input.phoneOrEmail;
          const newCustomer = await db
            .insert(customers)
            .values({
              name: customerName,
              phone: isEmail ? null : input.phoneOrEmail,
              email: isEmail ? input.phoneOrEmail : null,
            }).$returningId();
          customerId = newCustomer[0].id;
        }
      }

      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      // Buscar dados do customer
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Se o customer tem apenas telefone e não nome, tentar buscar nome do WhatsApp
      if (!fetchedName && input.channel === 'whatsapp' && customer.phone && customer.name === customer.phone) {
        console.log('[Conversations] Atualizando nome do WhatsApp para customer existente:', customer.phone);
        try {
          const profile = await fetchEvolutionProfile(customer.phone);
          if (profile?.name) {
            // Atualizar o nome do customer
            await db
              .update(customers)
              .set({ name: profile.name, photoUrl: profile.profilePicture || customers.photoUrl })
              .where(eq(customers.id, customer.id));
            customer.name = profile.name;
            console.log('[Conversations] Nome atualizado:', profile.name);
          }
        } catch (err) {
          console.log('[Conversations] Erro ao atualizar nome:', err);
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
          status: 'assigned',
          assignedTo: ctx.user.id,
          openedAt: new Date(),
          lastMessageAt: new Date(),
        }).$returningId();

      // Buscar conversa criada
      const [created] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, newConversation[0].id))
        .limit(1);

      return created;
    }),

  // Listar conversas ativas do agente
  listActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const agentConversations = await db
      .select({
        id: conversations.id,
        customerName: conversations.customerName,
        customerPhone: conversations.customerPhone,
        customerAvatar: customers.photoUrl,
        channel: conversations.channel,
        status: conversations.status,
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
        and(
          eq(conversations.assignedTo, ctx.user.id),
          eq(conversations.status, 'assigned')
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    const normalizePhone = (value?: string | null) => {
      if (!value) return '';
      const digits = value.replace(/\D/g, '');
      return digits || value;
    };

    const mergedByPhone = new Map<string, typeof agentConversations[number]>();

    for (const conv of agentConversations) {
      const key = normalizePhone(conv.customerPhone || conv.customerName);
      const existing = mergedByPhone.get(key);

      if (!existing) {
        mergedByPhone.set(key, conv);
        continue;
      }

      const existingName = existing.customerName || '';
      const incomingName = conv.customerName || '';
      const existingLooksLikePhone = existingName.replace(/\D/g, '').length >= 8;
      const incomingLooksLikePhone = incomingName.replace(/\D/g, '').length >= 8;

      if (existingLooksLikePhone && !incomingLooksLikePhone) {
        mergedByPhone.set(key, conv);
        continue;
      }

      if (!existingLooksLikePhone && incomingLooksLikePhone) {
        continue;
      }

      if (new Date(conv.lastMessageAt).getTime() > new Date(existing.lastMessageAt).getTime()) {
        mergedByPhone.set(key, conv);
      }
    }

    return Array.from(mergedByPhone.values());
  }),

  loggedAgents: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const agents = await db
      .select({
        id: users.id,
        name: users.name,
        status: agentStatus.status,
      })
      .from(agentStatus)
      .innerJoin(users, eq(agentStatus.userId, users.id))
      .where(eq(agentStatus.status, 'online'))
      .orderBy(desc(agentStatus.lastActivity));

    return agents.filter(agent => agent.id !== ctx.user.id);
  }),

  transfer: protectedProcedure
    .input(z.object({ conversationId: z.number(), agentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.assignedTo, ctx.user.id)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error('Conversa não encontrada ou sem permissão');
      }

      await db
        .update(conversations)
        .set({
          assignedTo: input.agentId,
          status: 'assigned',
        })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  close: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        reason: z.enum(['venda', 'orcamento', 'conversa_anterior', 'engano']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.assignedTo, ctx.user.id)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error('Conversa não encontrada ou sem permissão');
      }

      await db
        .update(conversations)
        .set({
          status: 'closed',
          closedAt: new Date(),
          closeReason: input.reason || 'conversa_anterior',
        })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  // Obter detalhes de uma conversa
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
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
});

export const messagesRouter = router({
  // Listar mensagens de uma conversa
  list: protectedProcedure
    .input(z.object({ conversation_id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      // Verificar se o agente tem acesso a esta conversa
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversation_id),
            eq(conversations.assignedTo, ctx.user.id)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error('Conversa não encontrada ou sem permissão');
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
      if (!db) throw new Error('Database not available');

      // Verificar se o agente tem acesso a esta conversa
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversation_id),
            eq(conversations.assignedTo, ctx.user.id)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error('Conversa não encontrada ou sem permissão');
      }

      // Validar tamanho do arquivo (máximo 16MB)
      if (input.fileSize > 16 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Tamanho máximo: 16MB');
      }

      // Decodificar base64 para Buffer
      const fileBuffer = Buffer.from(input.fileData, 'base64');

      // Gerar chave única para o arquivo
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = input.fileName.split('.').pop();
      const fileKey = `chat-files/${ctx.user.id}/${timestamp}-${randomSuffix}.${fileExtension}`;

      // Upload para S3
      const { url: fileUrl } = await storagePut(fileKey, fileBuffer, input.fileType);

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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      // Verificar se o agente tem acesso a esta conversa
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversation_id),
            eq(conversations.assignedTo, ctx.user.id)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new Error('Conversa não encontrada ou sem permissão');
      }

      const destination = conversation.customerPhone;
      if (!destination) {
        throw new Error('Destino não encontrado para esta conversa');
      }

      const isImage = Boolean(input.fileUrl && input.fileType?.startsWith('image/'));

      try {
        if (conversation.channel === 'whatsapp') {
          if (isImage && input.fileUrl) {
            await sendWhatsAppImage({
              to: destination,
              imageUrl: input.fileUrl,
              caption: input.content,
            });
          } else {
            await sendWhatsAppMessage({
              to: destination,
              message: input.content,
            });
          }
        } else if (conversation.channel === 'instagram') {
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
        console.error('[Messages] Failed to send outbound message', error);
        throw new Error((error as Error).message || 'Falha ao enviar mensagem');
      }

      // Criar mensagem
      const [message] = await db
        .insert(conversationMessages)
        .values({
          conversationId: input.conversation_id,
          senderId: ctx.user.id,
          senderType: 'agent',
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
          status: 'sent',
        },
        timestamp: Date.now(),
      });

      return { success: true, messageId: message.id };
    }),
});
