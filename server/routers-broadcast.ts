import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  broadcastLists,
  broadcastListMembers,
  broadcastMessages,
  customers,
} from "../drizzle/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

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

  // Enviar mensagem para a lista
  sendMessage: protectedProcedure
    .input(
      z.object({
        listId: z.number(),
        content: z.string().min(1),
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

      // Buscar membros
      const members = await db
        .select({
          customerId: broadcastListMembers.customerId,
          phone: customers.phone,
        })
        .from(broadcastListMembers)
        .leftJoin(customers, eq(broadcastListMembers.customerId, customers.id))
        .where(eq(broadcastListMembers.listId, input.listId));

      if (members.length === 0) {
        throw new Error("Lista não possui membros");
      }

      // Registrar o envio
      const [message] = await db
        .insert(broadcastMessages)
        .values({
          listId: input.listId,
          content: input.content,
          sentBy: ctx.user.id,
          totalRecipients: members.length,
          successfulSends: 0,
          failedSends: 0,
        })
        .$returningId();

      // TODO: Integrar com Evolution API para envio real
      // Por enquanto, apenas registramos no banco

      return {
        success: true,
        messageId: message.id,
        totalRecipients: members.length,
      };
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
});
