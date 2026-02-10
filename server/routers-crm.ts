import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { getDb } from "./db.js";
import {
  customers,
  customerTreatments,
  tags,
  customerTags,
  conversations,
  conversationMessages,
} from "../drizzle/schema.js";
import { like, eq, and, desc, gte, lte, sql, or } from "drizzle-orm";

const calculateEndDate = (
  purchaseDate: Date,
  quantity: number,
  dailyDosage: number
): Date => {
  const daysSupply = Math.floor(quantity / dailyDosage);
  const endDate = new Date(purchaseDate);
  endDate.setDate(endDate.getDate() + daysSupply);
  return endDate;
};

export const crmRouter = router({
  // ========================================
  // CLIENTES (CUSTOMERS)
  // ========================================

  // Buscar cliente por telefone
  getByPhone: publicProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const phone = input.phone.replace(/\D/g, "");

      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, `%${phone}%`))
        .limit(1);

      return customer[0] || null;
    }),

  // Criar cliente automaticamente (para webhooks)
  createIfNotExists: publicProcedure
    .input(
      z.object({
        phone: z.string(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const phone = input.phone.replace(/\D/g, "");

      // Verificar se já existe
      const existing = await db
        .select()
        .from(customers)
        .where(
          sql`REPLACE(REPLACE(${customers.phone}, '+', ''), ' ', '') LIKE ${"%" + phone.replace(/\D/g, "") + "%"}`
        )
        .limit(1);

      if (existing[0]) {
        return existing[0];
      }

      // Criar novo cliente
      const newCustomer = await db
        .insert(customers)
        .values({
          phone: input.phone,
          name: input.name || "Cliente",
          status: "active",
        })
        .$returningId();

      return { id: newCustomer[0].id };
    }),

  // Atualizar cliente
  updateCustomer: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(customers)
        .set({
          name: input.name,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, input.id));

      return { success: true };
    }),

  // ========================================
  // TRATAMENTOS (TREATMENTS)
  // ========================================

  // Criar tratamento
  createTreatment: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        nomeMedicamento: z.string(),
        posologiaDiaria: z.number().min(1),
        qtdCaixa: z.number().min(1),
        dataUltimaCompra: z.string(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const purchaseDate = new Date(input.dataUltimaCompra);
      const dataFimPrevisto = calculateEndDate(
        purchaseDate,
        input.qtdCaixa,
        input.posologiaDiaria
      );

      const newTreatment = await db
        .insert(customerTreatments)
        .values({
          customerId: input.customerId,
          nomeMedicamento: input.nomeMedicamento,
          posologiaDiaria: input.posologiaDiaria,
          qtdCaixa: input.qtdCaixa,
          dataUltimaCompra: purchaseDate,
          dataFimPrevisto: dataFimPrevisto,
          observacoes: input.observacoes,
        })
        .$returningId();

      return { id: newTreatment[0].id };
    }),

  // Listar tratamentos de um cliente
  getTreatments: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const treatments = await db
        .select()
        .from(customerTreatments)
        .where(
          and(
            eq(customerTreatments.customerId, input.customerId),
            eq(customerTreatments.isActive, 1)
          )
        )
        .orderBy(desc(customerTreatments.dataFimPrevisto));

      return treatments;
    }),

  // Atualizar tratamento
  updateTreatment: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        posologiaDiaria: z.number().optional(),
        qtdCaixa: z.number().optional(),
        dataUltimaCompra: z.string().optional(),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = { updatedAt: new Date() };

      if (input.posologiaDiaria)
        updateData.posologiaDiaria = input.posologiaDiaria;
      if (input.qtdCaixa) updateData.qtdCaixa = input.qtdCaixa;
      if (input.dataUltimaCompra) {
        updateData.dataUltimaCompra = new Date(input.dataUltimaCompra);
      }
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      // Recalcular dataFimPrevisto se necessário
      if (input.qtdCaixa && input.posologiaDiaria) {
        const treatment = await db
          .select()
          .from(customerTreatments)
          .where(eq(customerTreatments.id, input.id))
          .limit(1);

        if (treatment[0]?.dataUltimaCompra) {
          updateData.dataFimPrevisto = calculateEndDate(
            treatment[0].dataUltimaCompra,
            input.qtdCaixa,
            input.posologiaDiaria
          );
        }
      }

      await db
        .update(customerTreatments)
        .set(updateData)
        .where(eq(customerTreatments.id, input.id));

      return { success: true };
    }),

  // ========================================
  // TAGS
  // ========================================

  // Listar todas as tags
  getTags: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return db.select().from(tags).orderBy(tags.name);
  }),

  // Criar nova tag
  createTag: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        color: z.string().default("#6366f1"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const newTag = await db
        .insert(tags)
        .values({
          ...input,
          createdBy: ctx.user?.id,
        })
        .$returningId();

      return { id: newTag[0].id };
    }),

  // Adicionar tag a cliente
  addTagToCustomer: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        tagId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se já existe
      const existing = await db
        .select()
        .from(customerTags)
        .where(
          and(
            eq(customerTags.customerId, input.customerId),
            eq(customerTags.tagId, input.tagId)
          )
        )
        .limit(1);

      if (existing[0]) {
        return existing[0];
      }

      const newCustomerTag = await db
        .insert(customerTags)
        .values({
          customerId: input.customerId,
          tagId: input.tagId,
          addedBy: ctx.user?.id,
        })
        .$returningId();

      return { id: newCustomerTag[0].id };
    }),

  // Remover tag de cliente
  removeTagFromCustomer: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        tagId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(customerTags)
        .where(
          and(
            eq(customerTags.customerId, input.customerId),
            eq(customerTags.tagId, input.tagId)
          )
        );

      return { success: true };
    }),

  // ========================================
  // ALERTAS DE RECORRÊNCIA
  // ========================================

  // Buscar tratamentos próximos do fim (para alertas)
  getUpcomingTreatments: protectedProcedure
    .input(
      z.object({
        daysAhead: z.number().default(3),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + input.daysAhead);

      const treatments = await db
        .select({
          treatment: customerTreatments,
          customer: customers,
        })
        .from(customerTreatments)
        .innerJoin(customers, eq(customerTreatments.customerId, customers.id))
        .where(
          and(
            eq(customerTreatments.isActive, 1),
            gte(customerTreatments.dataFimPrevisto, today),
            lte(customerTreatments.dataFimPrevisto, futureDate)
          )
        )
        .orderBy(customerTreatments.dataFimPrevisto);

      return treatments;
    }),

  // ========================================
  // SCRIPT/JORNADAS
  // ========================================

  getScripts: protectedProcedure.query(async () => {
    return [
      {
        id: "alerta_fim",
        name: "Alerta de Fim de Medicamento",
        template:
          "Olá {nome}! Notamos que seu {remedio} deve acabar dia {data}. Quer que eu separe a reposição?",
        variables: ["nome", "remedio", "data"],
      },
      {
        id: "aniversario",
        name: "Parabéns de Aniversário",
        template:
          "Parabéns {nome}! Hoje tem presente especial na Farma Francis.",
        variables: ["nome"],
      },
      {
        id: "reativacao",
        name: "Reativação",
        template: "Oi {nome}, tudo bem? Faz tempo que não nos falamos.",
        variables: ["nome"],
      },
      {
        id: "lembrete_recarga",
        name: "Lembrete de Recarga",
        template:
          "Olá {nome}! É hora de renovar sua receita de {remedio}. Passa aqui na gente!",
        variables: ["nome", "remedio"],
      },
      {
        id: "bem_vindo",
        name: "Bem-vindo",
        template:
          "Olá {nome}! Seja bem-vindo à Farma Francis. Como podemos ajudar?",
        variables: ["nome"],
      },
    ];
  }),

  // ========================================
  // DADOS COMPLETOS DO CLIENTE (PARA FRONTEND)
  // ========================================

  getCustomerFullData: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.customerId))
        .limit(1);

      if (!customer[0]) return null;

      const treatments = await db
        .select()
        .from(customerTreatments)
        .where(
          and(
            eq(customerTreatments.customerId, input.customerId),
            eq(customerTreatments.isActive, 1)
          )
        );

      const customerTagsList = await db
        .select({
          tag: tags,
        })
        .from(customerTags)
        .innerJoin(tags, eq(customerTags.tagId, tags.id))
        .where(eq(customerTags.customerId, input.customerId));

      return {
        ...customer[0],
        treatments,
        tags: customerTagsList.map(t => t.tag),
      };
    }),
});
