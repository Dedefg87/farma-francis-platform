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
  accounts,
  accountContacts,
  dealPipelines,
  dealStages,
  deals,
  crmTasks,
  crmActivities,
  customFieldDefinitions,
  customFieldValues,
} from "../drizzle/schema.js";
import { like, eq, and, desc, gte, lte, sql, or } from "drizzle-orm";
import {
  fireAndForget,
  appendCrmAuditLog,
  enqueueCrmOutboxEvent,
} from "./crm-core";

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

      fireAndForget(async () => {
        await appendCrmAuditLog({
          action: "customer.update",
          entityType: "customer",
          entityId: input.id,
          actorUserId: null,
          after: input,
        });
        await enqueueCrmOutboxEvent({
          eventName: "CustomerUpdated",
          entityType: "customer",
          entityId: input.id,
          actorUserId: null,
          payload: input,
        });
      });

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
    .mutation(async ({ input, ctx }) => {
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

      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "CustomerTreatmentCreated",
          entityType: "customer",
          entityId: input.customerId,
          actorUserId: ctx.user.id,
          payload: { treatmentId: newTreatment[0].id, ...input },
        });
      });

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
    .mutation(async ({ input, ctx }) => {
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

      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "CustomerTreatmentUpdated",
          entityType: "treatment",
          entityId: input.id,
          actorUserId: ctx.user.id,
          payload: input,
        });
      });

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

      fireAndForget(async () => {
        await enqueueCrmOutboxEvent({
          eventName: "TagCreated",
          entityType: "tag",
          entityId: newTag[0].id,
          actorUserId: ctx.user?.id ?? null,
          payload: input,
        });
      });

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

  // ========================================
  // ENTERPRISE: ACCOUNTS (B2B)
  // ========================================

  accounts: router({
    list: protectedProcedure
      .input(
        z
          .object({
            query: z.string().optional(),
            limit: z.number().min(1).max(100).default(25),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const q = input?.query?.trim();
        const limit = input?.limit ?? 25;

        const where = q
          ? or(
              like(accounts.name, `%${q}%`),
              like(accounts.legalName, `%${q}%`),
              like(accounts.cnpj, `%${q}%`)
            )
          : undefined;

        return await db
          .select()
          .from(accounts)
          .where(where)
          .orderBy(desc(accounts.updatedAt))
          .limit(limit);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2),
          legalName: z.string().optional(),
          cnpj: z.string().optional(),
          industry: z.string().optional(),
          website: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          ownerUserId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .insert(accounts)
          .values({
            name: input.name,
            legalName: input.legalName || null,
            cnpj: input.cnpj || null,
            industry: input.industry || null,
            website: input.website || null,
            phone: input.phone || null,
            address: input.address || null,
            city: input.city || null,
            state: input.state || null,
            zipCode: input.zipCode || null,
            ownerUserId: input.ownerUserId ?? ctx.user.id,
            createdBy: ctx.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .$returningId();

        fireAndForget(async () => {
          await enqueueCrmOutboxEvent({
            eventName: "AccountCreated",
            entityType: "account",
            entityId: result[0].id,
            actorUserId: ctx.user.id,
            payload: input,
          });
        });

        return { id: result[0].id };
      }),

    linkContact: protectedProcedure
      .input(
        z.object({
          accountId: z.number(),
          customerId: z.number(),
          role: z.string().optional(),
          isPrimary: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .insert(accountContacts)
          .values({
            accountId: input.accountId,
            customerId: input.customerId,
            role: input.role || null,
            isPrimary: input.isPrimary ? 1 : 0,
            createdAt: new Date(),
          })
          .onDuplicateKeyUpdate({
            set: {
              role: input.role || null,
              isPrimary: input.isPrimary ? 1 : 0,
            },
          } as any);

        fireAndForget(async () => {
          await enqueueCrmOutboxEvent({
            eventName: "AccountContactLinked",
            entityType: "account",
            entityId: input.accountId,
            actorUserId: ctx.user.id,
            payload: input,
          });
        });

        return { success: true };
      }),
  }),

  // ========================================
  // ENTERPRISE: DEALS
  // ========================================

  deals: router({
    pipelines: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db
        .select()
        .from(dealPipelines)
        .where(eq(dealPipelines.isActive, 1));
    }),

    stages: protectedProcedure
      .input(z.object({ pipelineId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        return await db
          .select()
          .from(dealStages)
          .where(eq(dealStages.pipelineId, input.pipelineId))
          .orderBy(dealStages.sortOrder);
      }),

    list: protectedProcedure
      .input(
        z
          .object({
            pipelineId: z.number().optional(),
            stageId: z.number().optional(),
            ownerUserId: z.number().optional(),
            limit: z.number().min(1).max(100).default(25),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const limit = input?.limit ?? 25;

        const conditions = [] as any[];
        if (input?.pipelineId)
          conditions.push(eq(deals.pipelineId, input.pipelineId));
        if (input?.stageId) conditions.push(eq(deals.stageId, input.stageId));
        if (input?.ownerUserId)
          conditions.push(eq(deals.ownerUserId, input.ownerUserId));

        return await db
          .select()
          .from(deals)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(deals.updatedAt))
          .limit(limit);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(2),
          pipelineId: z.number(),
          stageId: z.number(),
          accountId: z.number().optional(),
          customerId: z.number().optional(),
          amountCents: z.number().int().optional(),
          closeDate: z.string().optional(),
          ownerUserId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .insert(deals)
          .values({
            title: input.title,
            pipelineId: input.pipelineId,
            stageId: input.stageId,
            accountId: input.accountId ?? null,
            customerId: input.customerId ?? null,
            amountCents: input.amountCents ?? null,
            closeDate: input.closeDate ? new Date(input.closeDate) : null,
            ownerUserId: input.ownerUserId ?? ctx.user.id,
            createdBy: ctx.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: "open",
          })
          .$returningId();

        fireAndForget(async () => {
          await enqueueCrmOutboxEvent({
            eventName: "DealCreated",
            entityType: "deal",
            entityId: result[0].id,
            actorUserId: ctx.user.id,
            payload: input,
          });
        });

        return { id: result[0].id };
      }),

    moveStage: protectedProcedure
      .input(z.object({ dealId: z.number(), stageId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db
          .update(deals)
          .set({ stageId: input.stageId, updatedAt: new Date() })
          .where(eq(deals.id, input.dealId));

        fireAndForget(async () => {
          await enqueueCrmOutboxEvent({
            eventName: "DealStageChanged",
            entityType: "deal",
            entityId: input.dealId,
            actorUserId: ctx.user.id,
            payload: input,
          });
        });

        return { success: true };
      }),
  }),

  // ========================================
  // ENTERPRISE: TASKS
  // ========================================

  tasks: router({
    list: protectedProcedure
      .input(
        z
          .object({
            assignedTo: z.number().optional(),
            status: z.enum(["open", "done", "cancelled"]).optional(),
            limit: z.number().min(1).max(100).default(50),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const conditions = [] as any[];
        conditions.push(
          eq(crmTasks.assignedTo, input?.assignedTo ?? ctx.user.id)
        );
        if (input?.status) conditions.push(eq(crmTasks.status, input.status));

        return await db
          .select()
          .from(crmTasks)
          .where(and(...conditions))
          .orderBy(desc(crmTasks.updatedAt))
          .limit(input?.limit ?? 50);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(2),
          description: z.string().optional(),
          dueAt: z.string().optional(),
          priority: z.enum(["low", "medium", "high"]).optional(),
          relatedEntityType: z.string().optional(),
          relatedEntityId: z.number().optional(),
          assignedTo: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .insert(crmTasks)
          .values({
            title: input.title,
            description: input.description || null,
            dueAt: input.dueAt ? new Date(input.dueAt) : null,
            priority: input.priority || "medium",
            relatedEntityType: input.relatedEntityType || null,
            relatedEntityId: input.relatedEntityId ?? null,
            assignedTo: input.assignedTo ?? ctx.user.id,
            createdBy: ctx.user.id,
            status: "open",
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null,
          })
          .$returningId();

        fireAndForget(async () => {
          await enqueueCrmOutboxEvent({
            eventName: "TaskCreated",
            entityType: "task",
            entityId: result[0].id,
            actorUserId: ctx.user.id,
            payload: input,
          });
        });

        return { id: result[0].id };
      }),

    complete: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db
          .update(crmTasks)
          .set({
            status: "done",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(crmTasks.id, input.taskId));

        fireAndForget(async () => {
          await enqueueCrmOutboxEvent({
            eventName: "TaskCompleted",
            entityType: "task",
            entityId: input.taskId,
            actorUserId: ctx.user.id,
            payload: input,
          });
        });

        return { success: true };
      }),
  }),

  // ========================================
  // ENTERPRISE: ACTIVITIES (timeline)
  // ========================================

  activities: router({
    listByEntity: protectedProcedure
      .input(
        z.object({
          entityType: z.string().min(1).max(40),
          entityId: z.number(),
          limit: z.number().min(1).max(200).default(50),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        return await db
          .select()
          .from(crmActivities)
          .where(
            and(
              eq(crmActivities.entityType, input.entityType),
              eq(crmActivities.entityId, input.entityId)
            )
          )
          .orderBy(desc(crmActivities.occurredAt))
          .limit(input.limit);
      }),
  }),

  // ========================================
  // ENTERPRISE: CUSTOM FIELDS
  // ========================================

  customFields: router({
    listDefinitions: protectedProcedure
      .input(z.object({ entityType: z.string().min(1).max(40) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        return await db
          .select()
          .from(customFieldDefinitions)
          .where(
            and(
              eq(customFieldDefinitions.entityType, input.entityType),
              eq(customFieldDefinitions.isActive, 1)
            )
          )
          .orderBy(desc(customFieldDefinitions.updatedAt));
      }),

    upsertValue: protectedProcedure
      .input(
        z.object({
          entityType: z.string().min(1).max(40),
          entityId: z.number(),
          fieldDefinitionId: z.number(),
          valueText: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .insert(customFieldValues)
          .values({
            entityType: input.entityType,
            entityId: input.entityId,
            fieldDefinitionId: input.fieldDefinitionId,
            valueText: input.valueText ?? null,
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .onDuplicateKeyUpdate({
            set: {
              valueText: input.valueText ?? null,
              updatedBy: ctx.user.id,
              updatedAt: new Date(),
            },
          } as any);

        fireAndForget(async () => {
          await enqueueCrmOutboxEvent({
            eventName: "CustomFieldValueUpserted",
            entityType: input.entityType,
            entityId: input.entityId,
            actorUserId: ctx.user.id,
            payload: input,
          });
        });

        return { success: true };
      }),
  }),
});
