import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { getDb } from './db';
import { quickReplies } from '../drizzle/schema';
import { eq, like, or, desc } from 'drizzle-orm';

export const quickRepliesRouter = router({
  // Listar todas as respostas rápidas
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      let query = db.select().from(quickReplies);

      // Aplicar filtros se fornecidos
      if (input?.search) {
        query = query.where(
          or(
            like(quickReplies.title, `%${input.search}%`),
            like(quickReplies.content, `%${input.search}%`)
          )
        ) as any;
      }

      if (input?.category) {
        query = query.where(eq(quickReplies.category, input.category)) as any;
      }

      const replies = await query.orderBy(desc(quickReplies.createdAt));
      return replies;
    }),

  // Listar categorias disponíveis
  listCategories: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const categories = await db
      .selectDistinct({ category: quickReplies.category })
      .from(quickReplies)
      .where(eq(quickReplies.category, quickReplies.category));

    return categories
      .map(c => c.category)
      .filter((c): c is string => c !== null);
  }),

  // Criar nova resposta rápida
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Título é obrigatório'),
        content: z.string().min(1, 'Conteúdo é obrigatório'),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [reply] = await db
        .insert(quickReplies)
        .values({
          title: input.title,
          content: input.content,
          category: input.category || null,
          createdBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .$returningId();

      return { success: true, id: reply.id };
    }),

  // Atualizar resposta rápida
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1, 'Título é obrigatório'),
        content: z.string().min(1, 'Conteúdo é obrigatório'),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .update(quickReplies)
        .set({
          title: input.title,
          content: input.content,
          category: input.category || null,
          updatedAt: new Date(),
        })
        .where(eq(quickReplies.id, input.id));

      return { success: true };
    }),

  // Deletar resposta rápida
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .delete(quickReplies)
        .where(eq(quickReplies.id, input.id));

      return { success: true };
    }),
});
