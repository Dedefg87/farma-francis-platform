import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  router,
} from "./_core/trpc";
import { z } from "zod";
import { like, or } from "drizzle-orm";
import { inboxRouter } from "./routers-inbox";
import { dashboardRouter } from "./routers-dashboard";
import { executionsRouter } from "./routers-executions";
import { agentsRouter } from "./routers-agents";
import { aiRouter } from "./routers-ai";
// import { tagsRouter } from "./routers-tags"; // Removido - tabelas de tags comentadas
import { agentRouter } from "./routers-agent";
import { queuesRouter } from "./routers-queues";
import {
  conversationsRouter,
  messagesRouter,
  internalMessagesRouter,
} from "./routers-conversations";
import { quickRepliesRouter } from "./routers-quick-replies";
import { pausesRouter } from "./routers-pauses";
import { dashboardStatsRouter } from "./routers-dashboard-stats";
import { dashboardDrilldownRouter } from "./routers-dashboard-drilldown";
import { getDb } from "./db";
import { customers } from "../drizzle/schema";
import { customersRouter } from "./routers-customers";
import { contactFetchRouter } from "./routers-contact-fetch";
import { apiConfigRouter } from "./routers-api-config";
import { crmRouter } from "./routers-crm";
import { telemetryRouter } from "./routers-telemetry";
import { automationRouter } from "./routers-automation";
import { surveyRouter } from "./routers-survey";
import { broadcastRouter } from "./routers-broadcast";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  apiConfig: apiConfigRouter,
  quickReplies: quickRepliesRouter,

  // Test flows are exposed via REST endpoints under /api/test/* in server/_core/index.ts
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input((raw: unknown) => {
        return z
          .object({
            email: z.string(), // Aceita username ou email
            password: z.string().min(5),
          })
          .parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const bcrypt = await import("bcrypt");
        const jwtModule = await import("jsonwebtoken");
        const jwt = jwtModule.default || jwtModule;
        const { JWT_SECRET } = await import("./_core/env");

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        console.log("[LOGIN] Tentativa de login:", { email: input.email });

        // Buscar usuário por email (aceita username ou email)
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email));

        console.log(
          "[LOGIN] Usuário encontrado:",
          user
            ? { id: user.id, email: user.email, hasHash: !!user.passwordHash }
            : "Não encontrado"
        );

        if (!user) {
          console.log("[LOGIN] ERRO: Usuário não encontrado");
          throw new Error("Usuário ou senha incorretos");
        }

        // Verificar senha (se existir hash)
        if (user.passwordHash) {
          console.log("[LOGIN] Verificando senha com bcrypt...");
          const isValid = await bcrypt.compare(
            input.password,
            user.passwordHash
          );
          if (!isValid) {
            console.log("[LOGIN] ERRO: Senha incorreta");
            throw new Error("Usuário ou senha incorretos");
          }
        } else {
          // Se não tem hash, criar um (primeiro login)
          const hash = await bcrypt.hash(input.password, 10);
          await db
            .update(users)
            .set({ passwordHash: hash, updatedAt: new Date() })
            .where(eq(users.id, user.id));
        }

        // Criar token JWT usando SDK
        const { sdk } = await import("./_core/sdk");
        console.log("[LOGIN] Criando session token para openId:", user.openId);

        const token = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: 7 * 24 * 60 * 60 * 1000, // 7 dias
        });

        console.log("[LOGIN] Token criado");

        // Definir cookie de sessão
        const cookieOptions = getSessionCookieOptions(ctx.req);
        console.log("[LOGIN] Cookie options:", cookieOptions);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        console.log("[LOGIN] Cookie definido com nome:", COOKIE_NAME);

        // Atualizar lastSignedIn
        await db
          .update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, user.id));

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions });
      return {
        success: true,
      } as const;
    }),
  }),

  // Employees management (Admin only)
  employees: router({
    list: adminProcedure.query(async () => {
      const { getAllEmployees } = await import("./db");
      return await getAllEmployees();
    }),
    create: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            name: z.string(),
            email: z.string(),
            password: z.string().min(6),
            cpf: z.string().optional(),
            phone: z.string().optional(),
            position: z.string().optional(),
            department: z.string().optional(),
            hireDate: z.date().optional(),
            status: z.enum(["active", "inactive", "vacation"]).optional(),
            skills: z.string().optional(),
            photoUrl: z.string().optional(),
            role: z.enum(["admin", "user"]).optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { users, employees } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const bcrypt = await import("bcrypt");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Criar hash da senha
        const passwordHash = await bcrypt.hash(input.password, 10);

        // Criar usuário primeiro
        // IMPORTANTE: input.name = username (usado para login), input.email = nome completo
        const openId = `employee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(users).values({
          openId,
          name: input.email, // Nome completo
          email: input.name, // Username (usado para login)
          passwordHash,
          role: input.role || "user",
          loginMethod: "email",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Buscar o usuário recém-criado pelo openId
        const [newUser] = await db
          .select()
          .from(users)
          .where(eq(users.openId, openId));
        if (!newUser) throw new Error("Failed to create user");

        // Criar employee vinculado ao usuário
        await db.insert(employees).values({
          userId: newUser.id,
          cpf: input.cpf || undefined,
          phone: input.phone || undefined,
          position: input.position || undefined,
          department: input.department || undefined,
          hireDate: input.hireDate,
          status: input.status || "active",
          skills: input.skills || undefined,
          photoUrl: input.photoUrl || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { success: true, userId: newUser.id };
      }),
    delete: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            userId: z.number(),
          })
          .parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { sql } = await import("drizzle-orm");
        const userId = input.userId;
        const replacementUserId = ctx.user.id;

        if (userId === replacementUserId) {
          throw new Error("Não é possível excluir o próprio usuário logado.");
        }

        const safeExec = async (label: string, fn: () => Promise<unknown>) => {
          try {
            await fn();
          } catch (e: any) {
            const code = e?.cause?.code || e?.code;
            const msg = String(e?.cause?.sqlMessage || e?.message || e);

            // Ignore missing tables/columns across different environments
            if (
              code === "ER_NO_SUCH_TABLE" ||
              code === "ER_BAD_FIELD_ERROR" ||
              msg.includes("doesn't exist")
            ) {
              console.log(`[deleteEmployee] Ignorando ${label}: ${msg}`);
              return;
            }

            // Re-throw anything else (FK constraints, etc.)
            throw e;
          }
        };

        try {
          // 1. Delete hard references that block user deletion
          await safeExec("agent_pauses", async () => {
            await db.execute(
              sql`DELETE FROM agent_pauses WHERE agent_id = ${userId}`
            );
          });

          await safeExec("queue_agents", async () => {
            await db.execute(
              sql`DELETE FROM queue_agents WHERE agent_id = ${userId}`
            );
          });

          // 2. Null out optional references
          await safeExec("conversation_messages.sender_id", async () => {
            await db.execute(
              sql`UPDATE conversation_messages SET sender_id = NULL WHERE sender_id = ${userId}`
            );
          });

          await safeExec("conversations.assigned_to", async () => {
            await db.execute(
              sql`UPDATE conversations SET assigned_to = NULL WHERE assigned_to = ${userId}`
            );
          });

          await safeExec("tickets.assigned_to", async () => {
            await db.execute(
              sql`UPDATE tickets SET assigned_to = NULL WHERE assigned_to = ${userId}`
            );
          });

          await safeExec("leads.assigned_to", async () => {
            await db.execute(
              sql`UPDATE leads SET assigned_to = NULL WHERE assigned_to = ${userId}`
            );
          });

          // survey_responses may not exist in some DBs; if it exists and agent_id is NOT NULL, delete rows
          await safeExec("survey_responses.agent_id NULL", async () => {
            await db.execute(
              sql`UPDATE survey_responses SET agent_id = NULL WHERE agent_id = ${userId}`
            );
          });
          await safeExec("survey_responses delete", async () => {
            await db.execute(
              sql`DELETE FROM survey_responses WHERE agent_id = ${userId}`
            );
          });

          await safeExec("ticket_comments.user_id", async () => {
            await db.execute(
              sql`UPDATE ticket_comments SET user_id = NULL WHERE user_id = ${userId}`
            );
          });

          await safeExec("interactions.user_id", async () => {
            await db.execute(
              sql`UPDATE interactions SET user_id = NULL WHERE user_id = ${userId}`
            );
          });

          // 3. Transfer ownership for NOT NULL created_by fields
          await safeExec("integration_settings.created_by", async () => {
            await db.execute(
              sql`UPDATE integration_settings SET created_by = ${replacementUserId} WHERE created_by = ${userId}`
            );
          });

          // 4. Delete employee record
          await safeExec("employees", async () => {
            await db.execute(
              sql`DELETE FROM employees WHERE user_id = ${userId}`
            );
          });

          // 5. Finally delete user
          await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);

          return { success: true };
        } catch (error) {
          console.error("[deleteEmployee] Error:", error);
          throw new Error(
            `Falha ao excluir funcionário: ${error instanceof Error ? error.message : "Erro desconhecido"}`
          );
        }
      }),
    update: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            userId: z.number(),
            name: z.string().optional(),
            email: z.string().optional(),
            cpf: z.string().optional(),
            phone: z.string().optional(),
            position: z.string().optional(),
            department: z.string().optional(),
            status: z.enum(["active", "inactive", "vacation"]).optional(),
            role: z.enum(["admin", "user"]).optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { users, employees } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Atualizar usuário
        // IMPORTANTE: input.name = username (usado para login), input.email = nome completo
        if (input.name || input.email || input.role !== undefined) {
          await db
            .update(users)
            .set({
              ...(input.name && { email: input.name }), // Username (usado para login)
              ...(input.email && { name: input.email }), // Nome completo
              ...(input.role !== undefined && { role: input.role }),
              updatedAt: new Date(),
            })
            .where(eq(users.id, input.userId));
        }

        // Atualizar employee
        if (
          input.cpf ||
          input.phone ||
          input.position ||
          input.department ||
          input.status
        ) {
          await db
            .update(employees)
            .set({
              ...(input.cpf && { cpf: input.cpf }),
              ...(input.phone && { phone: input.phone }),
              ...(input.position && { position: input.position }),
              ...(input.department && { department: input.department }),
              ...(input.status && { status: input.status }),
              updatedAt: new Date(),
            })
            .where(eq(employees.userId, input.userId));
        }

        return { success: true };
      }),
  }),

  // Customers management
  customers: router({
    list: adminProcedure.query(async () => {
      const { getAllCustomers } = await import("./db");
      return await getAllCustomers();
    }),
    getById: adminProcedure
      .input((raw: unknown) => {
        return z.object({ id: z.number() }).parse(raw);
      })
      .query(async ({ input }) => {
        const { getCustomerById } = await import("./db");
        return await getCustomerById(input.id);
      }),
    create: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            name: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
            cpfCnpj: z.string().optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zipCode: z.string().optional(),
            tags: z.string().optional(),
            notes: z.string().optional(),
            status: z.enum(["active", "inactive", "blocked"]).optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createCustomer } = await import("./db");
        const created = await createCustomer({
          ...input,
          createdBy: ctx.user.id,
        });

        // Best-effort CRM outbox event (never blocks UI)
        try {
          const { fireAndForget, enqueueCrmOutboxEvent } = await import(
            "./crm-core"
          );
          fireAndForget(async () => {
            await enqueueCrmOutboxEvent({
              eventName: "CustomerCreated",
              entityType: "customer",
              entityId: (created as any)?.id ?? null,
              actorUserId: ctx.user.id,
              payload: {
                name: input.name,
                email: input.email ?? null,
                phone: input.phone ?? null,
              },
            });
          });
        } catch {
          // ignore
        }

        return created;
      }),
    search: protectedProcedure
      .input(
        z.object({
          query: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { query } = input;

        if (!query || query.length < 2) {
          return [];
        }

        const results = await db
          .select({
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
          })
          .from(customers)
          .where(
            or(
              like(customers.name, `%${query}%`),
              like(customers.phone, `%${query}%`),
              like(customers.email, `%${query}%`)
            )
          )
          .limit(10);

        return results;
      }),
  }),

  // Leads management
  leads: router({
    list: adminProcedure.query(async () => {
      const { getAllLeads } = await import("./db");
      return await getAllLeads();
    }),
    create: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            customerId: z.number().optional(),
            name: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
            source: z.string().optional(),
            stage: z
              .enum([
                "prospect",
                "qualified",
                "proposal",
                "negotiation",
                "closed_won",
                "closed_lost",
              ])
              .optional(),
            value: z.number().optional(),
            assignedTo: z.number().optional(),
            followUpDate: z.date().optional(),
            notes: z.string().optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createLead } = await import("./db");
        const created = await createLead({ ...input, createdBy: ctx.user.id });

        // Best-effort CRM outbox event (never blocks UI)
        try {
          const { fireAndForget, enqueueCrmOutboxEvent } = await import(
            "./crm-core"
          );
          fireAndForget(async () => {
            await enqueueCrmOutboxEvent({
              eventName: "LeadCreated",
              entityType: "lead",
              entityId: (created as any)?.id ?? null,
              actorUserId: ctx.user.id,
              payload: {
                customerId: input.customerId ?? null,
                name: input.name,
                email: input.email ?? null,
                phone: input.phone ?? null,
                source: input.source ?? null,
                stage: input.stage ?? null,
                value: input.value ?? null,
              },
            });
          });
        } catch {
          // ignore
        }

        return created;
      }),
  }),

  // Tickets management
  tickets: router({
    list: adminProcedure.query(async () => {
      const { getAllTickets } = await import("./db");
      return await getAllTickets();
    }),
    getById: adminProcedure
      .input((raw: unknown) => {
        return z.object({ id: z.number() }).parse(raw);
      })
      .query(async ({ input }) => {
        const { getTicketById } = await import("./db");
        return await getTicketById(input.id);
      }),
    create: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            ticketNumber: z.string(),
            customerId: z.number().optional(),
            subject: z.string(),
            description: z.string().optional(),
            status: z
              .enum(["open", "in_progress", "pending", "resolved", "closed"])
              .optional(),
            priority: z.enum(["low", "medium", "high", "critical"]).optional(),
            category: z.string().optional(),
            channel: z
              .enum(["whatsapp", "instagram", "email", "phone", "web"])
              .optional(),
            assignedTo: z.number().optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createTicket } = await import("./db");
        const created = await createTicket({
          ...input,
          createdBy: ctx.user.id,
        });

        // Best-effort CRM outbox event (never blocks UI)
        try {
          const { fireAndForget, enqueueCrmOutboxEvent } = await import(
            "./crm-core"
          );
          fireAndForget(async () => {
            await enqueueCrmOutboxEvent({
              eventName: "TicketCreated",
              entityType: "ticket",
              entityId: (created as any)?.id ?? null,
              actorUserId: ctx.user.id,
              payload: {
                ticketNumber: input.ticketNumber,
                customerId: input.customerId ?? null,
                subject: input.subject,
                status: input.status ?? null,
                priority: input.priority ?? null,
                channel: input.channel ?? null,
                assignedTo: input.assignedTo ?? null,
              },
            });
          });
        } catch {
          // ignore
        }

        return created;
      }),
  }),

  // Notifications
  notifications: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const { getUserNotifications } = await import("./db");
      return await getUserNotifications(ctx.user.id);
    }),
  }),

  // Automation flows
  automation: router({
    list: adminProcedure.query(async () => {
      const { getAllAutomationFlows } = await import("./db");
      return await getAllAutomationFlows();
    }),
    create: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            name: z.string(),
            description: z.string().optional(),
            channel: z.enum(["whatsapp", "instagram", "both"]),
            trigger: z.string(),
            response: z.string(),
          })
          .parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createAutomationFlow } = await import("./db");
        return await createAutomationFlow({ ...input, createdBy: ctx.user.id });
      }),
    update: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            id: z.number(),
            name: z.string().optional(),
            description: z.string().optional(),
            channel: z.enum(["whatsapp", "instagram", "both"]).optional(),
            trigger: z.string().optional(),
            response: z.string().optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { updateAutomationFlow } = await import("./db");
        const { id, ...updates } = input;
        return await updateAutomationFlow(id, updates);
      }),
    delete: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            userId: z.number(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { getDb, getDbRaw } = await import("./db");
        const { users, employees, conversations, surveyResponses } =
          await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        const rawDb = await getDbRaw();
        if (!db || !rawDb) throw new Error("Database not available");

        const userId = input.userId;

        try {
          // Desassociar usuário de conversas (setar assignedTo para NULL)
          await db
            .update(conversations)
            .set({ assignedTo: null })
            .where(eq(conversations.assignedTo, userId));

          // Desassociar usuário de survey responses
          await db
            .update(surveyResponses)
            .set({ agentId: null })
            .where(eq(surveyResponses.agentId, userId));

          // Deletar employee primeiro (devido a foreign key)
          await db.delete(employees).where(eq(employees.userId, userId));

          // Limpar outras tabelas que podem ter referências ao usuário
          try {
            await rawDb.raw("DELETE FROM agent_status WHERE user_id = ?", [
              userId,
            ]);
          } catch (e) {
            /* ignore */
          }
          try {
            await rawDb.raw("DELETE FROM agent_pauses WHERE agent_id = ?", [
              userId,
            ]);
          } catch (e) {
            /* ignore */
          }
          try {
            await rawDb.raw(
              "DELETE FROM crm_outbox_events WHERE actor_user_id = ?",
              [userId]
            );
          } catch (e) {
            /* ignore */
          }
          try {
            await rawDb.raw(
              "DELETE FROM crm_audit_logs WHERE actor_user_id = ?",
              [userId]
            );
          } catch (e) {
            /* ignore */
          }
          try {
            await rawDb.raw("DELETE FROM quick_replies WHERE created_by = ?", [
              userId,
            ]);
          } catch (e) {
            /* ignore */
          }

          // Finalmente, deletar o usuário
          await db.delete(users).where(eq(users.id, userId));

          return { success: true };
        } catch (error) {
          console.error("[deleteEmployee] Error:", error);
          throw new Error(
            `Falha ao excluir funcionário: ${error instanceof Error ? error.message : "Erro desconhecido"}`
          );
        }
      }),
    toggle: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            id: z.number(),
            isActive: z.boolean(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { toggleAutomationFlow } = await import("./db");
        return await toggleAutomationFlow(input.id, input.isActive);
      }),
  }),

  // Visual flows (N8N-style automation builder)
  visualFlows: router({
    list: adminProcedure.query(async () => {
      const { getAllVisualFlows } = await import("./db");
      return await getAllVisualFlows();
    }),
    getById: adminProcedure
      .input((raw: unknown) => {
        return z.object({ id: z.number() }).parse(raw);
      })
      .query(async ({ input }) => {
        const { getVisualFlowById } = await import("./db");
        return await getVisualFlowById(input.id);
      }),
    create: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            name: z.string(),
            description: z.string().optional(),
            flowData: z.string(), // JSON string
          })
          .parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createVisualFlow } = await import("./db");
        return await createVisualFlow({ ...input, createdBy: ctx.user.id });
      }),
    update: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            id: z.number(),
            name: z.string().optional(),
            description: z.string().optional(),
            flowData: z.string().optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { updateVisualFlow } = await import("./db");
        const { id, ...updates } = input;
        return await updateVisualFlow(id, updates);
      }),
    delete: adminProcedure
      .input((raw: unknown) => {
        return z.object({ id: z.number() }).parse(raw);
      })
      .mutation(async ({ input }) => {
        const { deleteVisualFlow } = await import("./db");
        return await deleteVisualFlow(input.id);
      }),
    toggle: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            id: z.number(),
            isActive: z.boolean(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { toggleVisualFlow } = await import("./db");
        return await toggleVisualFlow(input.id, input.isActive);
      }),
  }),

  // URA menus
  uraMenus: router({
    list: adminProcedure.query(async () => {
      const { getAllUraMenus } = await import("./db");
      return await getAllUraMenus();
    }),
    getActive: adminProcedure.query(async () => {
      const { getActiveUraMenu } = await import("./db");
      return await getActiveUraMenu();
    }),
    getById: adminProcedure
      .input((raw: unknown) => {
        return z.object({ id: z.number() }).parse(raw);
      })
      .query(async ({ input }) => {
        const { getUraMenuById } = await import("./db");
        return await getUraMenuById(input.id);
      }),
    create: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            name: z.string(),
            welcomeMessage: z.string(),
            menuData: z.string(), // JSON string
            workingHours: z.string().optional(),
            offHoursMessage: z.string().optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createUraMenu } = await import("./db");
        return await createUraMenu({ ...input, createdBy: ctx.user.id });
      }),
    update: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            id: z.number(),
            name: z.string().optional(),
            welcomeMessage: z.string().optional(),
            menuData: z.string().optional(),
            workingHours: z.string().optional(),
            offHoursMessage: z.string().optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { updateUraMenu } = await import("./db");
        const { id, ...updates } = input;
        return await updateUraMenu(id, updates);
      }),
    delete: adminProcedure
      .input((raw: unknown) => {
        return z.object({ id: z.number() }).parse(raw);
      })
      .mutation(async ({ input }) => {
        const { getDbRaw } = await import("./db");
        const rawDb = await getDbRaw();
        if (!rawDb) throw new Error("Database not available");

        const userId = input.id;

        try {
          // 1. Deletar pausas do agente (agent_pauses)
          try {
            await rawDb.raw("DELETE FROM agent_pauses WHERE agent_id = ?", [
              userId,
            ]);
            console.log("[deleteEmployee] Pausas do agente deletadas");
          } catch (e: any) {
            if (e.message?.includes("doesn't exist")) {
              console.log("[deleteEmployee] Tabela agent_pauses não existe");
            } else {
              console.log(
                "[deleteEmployee] Erro ao deletar pausas:",
                e.message
              );
            }
          }

          // 2. Desassociar usuário de conversas
          try {
            await rawDb.raw(
              "UPDATE conversations SET assigned_to = NULL WHERE assigned_to = ?",
              [userId]
            );
            console.log("[deleteEmployee] Conversas desassociadas");
          } catch (e: any) {
            console.log(
              "[deleteEmployee] Conversas não atualizadas:",
              e.message
            );
          }

          // 3. Deletar employee
          try {
            await rawDb.raw("DELETE FROM employees WHERE user_id = ?", [
              userId,
            ]);
            console.log("[deleteEmployee] Employee deletado");
          } catch (e: any) {
            console.log("[deleteEmployee] Employee não deletado:", e.message);
          }

          // 4. Deletar usuário
          await rawDb.raw("DELETE FROM users WHERE id = ?", [userId]);
          console.log("[deleteEmployee] Usuário deletado com sucesso");

          return { success: true };
        } catch (error) {
          console.error("[deleteEmployee] Error:", error);
          throw new Error(
            `Falha ao excluir funcionário: ${error instanceof Error ? error.message : "Erro desconhecido"}`
          );
        }
      }),
    toggle: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            id: z.number(),
            isActive: z.boolean(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { getDbRaw } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const userId = input.id;

        try {
          // Tentar deletar usando SQL raw para ter mais controle
          const rawDb = await getDbRaw();

          // 1. Desassociar usuário de conversas
          try {
            await rawDb?.raw(
              "UPDATE conversations SET assigned_to = NULL WHERE assigned_to = ?",
              [userId]
            );
          } catch (e) {
            console.log(
              "[deleteEmployee] Conversas não atualizadas (tabela pode não existir):",
              e
            );
          }

          // 2. Deletar employee
          try {
            await rawDb?.raw("DELETE FROM employees WHERE user_id = ?", [
              userId,
            ]);
          } catch (e) {
            console.log(
              "[deleteEmployee] Employee não deletado (pode não existir):",
              e
            );
          }

          // 3. Deletar usuário
          await rawDb?.raw("DELETE FROM users WHERE id = ?", [userId]);

          return { success: true };
        } catch (error) {
          console.error("[deleteEmployee] Error:", error);
          throw new Error(
            `Falha ao excluir funcionário: ${error instanceof Error ? error.message : "Erro desconhecido"}`
          );
        }
      }),
  }),

  // AI Agents validation
  aiAgents: router({
    validateToken: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            provider: z.enum(["openai", "anthropic", "google", "meta"]),
            apiKey: z.string().min(1),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { validateAIToken } = await import("./ai-validation");
        return await validateAIToken(input.provider, input.apiKey);
      }),

    testAgent: adminProcedure
      .input((raw: unknown) => {
        return z
          .object({
            provider: z.enum(["openai", "anthropic", "google", "meta"]),
            apiKey: z.string().min(1),
            model: z.string(),
            prompt: z.string(),
            testMessage: z.string(),
            maxTokens: z.number().optional(),
            temperature: z.number().optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        const { testAIAgent } = await import("./ai-validation");
        return await testAIAgent(input);
      }),
  }),

  // AI Features (Whisper, Suggestions, Sentiment, OCR)
  ai: aiRouter,

  // Queues and Pauses management
  queues: queuesRouter,
  pauses: pausesRouter,
  contactFetch: contactFetchRouter,

  // Inbox
  inbox: inboxRouter,

  // Dashboard
  dashboard: dashboardRouter,

  // Executions (legacy, UI may be removed)
  executions: executionsRouter,

  // Tags management
  tags: tagsRouter,

  // Agent Area (Atendimento)
  agent: agentRouter,

  // Agents Performance Management
  agents: agentsRouter,

  // Conversations management
  conversations: conversationsRouter,

  // Messages management
  messages: messagesRouter,

  // Internal Messages (Admin ↔ Agente)
  internalMessages: internalMessagesRouter,

  // CRM - Gestão de Clientes e Recorrência
  crm: crmRouter,
  telemetry: telemetryRouter,

  // Survey - Pesquisa de Satisfação
  survey: surveyRouter,

  // Broadcast Lists - Listas de Transmissão
  broadcast: broadcastRouter,

  // Dashboard Statistics
  dashboardStats: dashboardStatsRouter,
  dashboardDrilldown: dashboardDrilldownRouter,

  // Automation SSE Integration
  automationSSE: automationRouter,
});

export type AppRouter = typeof appRouter;
import { tagsRouter } from "./routers-tags";
