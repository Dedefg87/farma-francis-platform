import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { like, or } from 'drizzle-orm';
import { inboxRouter } from "./routers-inbox";
import { dashboardRouter } from "./routers-dashboard";
import { executionsRouter } from "./routers-executions";
import { agentsRouter } from "./routers-agents";
import { aiRouter } from "./routers-ai";
// import { tagsRouter } from "./routers-tags"; // Removido - tabelas de tags comentadas
import { agentRouter } from "./routers-agent";
import { queuesRouter } from "./routers-queues";
import { conversationsRouter, messagesRouter } from "./routers-conversations";
import { quickRepliesRouter } from "./routers-quick-replies";
import { pausesRouter } from './routers-pauses';
import { dashboardStatsRouter } from './routers-dashboard-stats';
import { dashboardDrilldownRouter } from './routers-dashboard-drilldown';
import { getDb } from './db';
import { customers } from '../drizzle/schema';
import { customersRouter } from './routers-customers';
import { contactFetchRouter } from './routers-contact-fetch';
import { apiConfigRouter } from './routers-api-config';

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  apiConfig: apiConfigRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input((raw: unknown) => {
        return z.object({
          email: z.string(), // Aceita username ou email
          password: z.string().min(5),
        }).parse(raw);
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

        console.log('[LOGIN] Tentativa de login:', { email: input.email });

        // Buscar usuário por email (aceita username ou email)
        const [user] = await db.select().from(users).where(eq(users.email, input.email));
        
        console.log('[LOGIN] Usuário encontrado:', user ? { id: user.id, email: user.email, hasHash: !!user.passwordHash } : 'Não encontrado');
        
        if (!user) {
          console.log('[LOGIN] ERRO: Usuário não encontrado');
          throw new Error("Usuário ou senha incorretos");
        }

        // Verificar senha (se existir hash)
        if (user.passwordHash) {
          console.log('[LOGIN] Verificando senha com bcrypt...');
          const isValid = await bcrypt.compare(input.password, user.passwordHash);
          if (!isValid) {
            console.log('[LOGIN] ERRO: Senha incorreta');
            throw new Error("Usuário ou senha incorretos");
          }
        } else {
          // Se não tem hash, criar um (primeiro login)
          const hash = await bcrypt.hash(input.password, 10);
          await db.update(users)
            .set({ passwordHash: hash, updatedAt: new Date() })
            .where(eq(users.id, user.id));
        }

        // Criar token JWT usando SDK
        const { sdk } = await import("./_core/sdk");
        console.log('[LOGIN] Criando session token para openId:', user.openId);
        
        const token = await sdk.createSessionToken(user.openId, {
          name: user.name || '',
          expiresInMs: 7 * 24 * 60 * 60 * 1000 // 7 dias
        });
        
        console.log('[LOGIN] Token criado');

        // Definir cookie de sessão
        const cookieOptions = getSessionCookieOptions(ctx.req);
        console.log('[LOGIN] Cookie options:', cookieOptions);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        console.log('[LOGIN] Cookie definido com nome:', COOKIE_NAME);

        // Atualizar lastSignedIn
        await db.update(users)
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
        return z.object({
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
        }).parse(raw);
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
        const [newUser] = await db.select().from(users).where(eq(users.openId, openId));
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
        return z.object({
          userId: z.number(),
        }).parse(raw);
      })
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { users, employees } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Deletar employee primeiro (devido a foreign key)
        await db.delete(employees).where(eq(employees.userId, input.userId));
        
        // Deletar usuário
        await db.delete(users).where(eq(users.id, input.userId));

        return { success: true };
      }),
    update: adminProcedure
      .input((raw: unknown) => {
        return z.object({
          userId: z.number(),
          name: z.string().optional(),
          email: z.string().optional(),
          cpf: z.string().optional(),
          phone: z.string().optional(),
          position: z.string().optional(),
          department: z.string().optional(),
          status: z.enum(["active", "inactive", "vacation"]).optional(),
          role: z.enum(["admin", "user"]).optional(),
        }).parse(raw);
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
          await db.update(users)
            .set({
              ...(input.name && { email: input.name }), // Username (usado para login)
              ...(input.email && { name: input.email }), // Nome completo
              ...(input.role !== undefined && { role: input.role }),
              updatedAt: new Date(),
            })
            .where(eq(users.id, input.userId));
        }

        // Atualizar employee
        if (input.cpf || input.phone || input.position || input.department || input.status) {
          await db.update(employees)
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

        return z.object({
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
        }).parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createCustomer } = await import("./db");
        return await createCustomer({ ...input, createdBy: ctx.user.id });
      }),
    search: protectedProcedure
      .input(
        z.object({
          query: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

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

        return z.object({
          customerId: z.number().optional(),
          name: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
          source: z.string().optional(),
          stage: z.enum(["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]).optional(),
          value: z.number().optional(),
          assignedTo: z.number().optional(),
          followUpDate: z.date().optional(),
          notes: z.string().optional(),
        }).parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createLead } = await import("./db");
        return await createLead({ ...input, createdBy: ctx.user.id });
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

        return z.object({
          ticketNumber: z.string(),
          customerId: z.number().optional(),
          subject: z.string(),
          description: z.string().optional(),
          status: z.enum(["open", "in_progress", "pending", "resolved", "closed"]).optional(),
          priority: z.enum(["low", "medium", "high", "critical"]).optional(),
          category: z.string().optional(),
          channel: z.enum(["whatsapp", "instagram", "email", "phone", "web"]).optional(),
          assignedTo: z.number().optional(),
        }).parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createTicket } = await import("./db");
        return await createTicket({ ...input, createdBy: ctx.user.id });
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

        return z.object({
          name: z.string(),
          description: z.string().optional(),
          channel: z.enum(["whatsapp", "instagram", "both"]),
          trigger: z.string(),
          response: z.string(),
        }).parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createAutomationFlow } = await import("./db");
        return await createAutomationFlow({ ...input, createdBy: ctx.user.id });
      }),
    update: adminProcedure
      .input((raw: unknown) => {

        return z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          channel: z.enum(["whatsapp", "instagram", "both"]).optional(),
          trigger: z.string().optional(),
          response: z.string().optional(),
        }).parse(raw);
      })
      .mutation(async ({ input }) => {
        const { updateAutomationFlow } = await import("./db");
        const { id, ...updates } = input;
        return await updateAutomationFlow(id, updates);
      }),
    delete: adminProcedure
      .input((raw: unknown) => {

        return z.object({
          id: z.number(),
        }).parse(raw);
      })
      .mutation(async ({ input }) => {
        const { deleteAutomationFlow } = await import("./db");
        return await deleteAutomationFlow(input.id);
      }),
    toggle: adminProcedure
      .input((raw: unknown) => {

        return z.object({
          id: z.number(),
          isActive: z.boolean(),
        }).parse(raw);
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
        return z.object({
          name: z.string(),
          description: z.string().optional(),
          flowData: z.string(), // JSON string
        }).parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createVisualFlow } = await import("./db");
        return await createVisualFlow({ ...input, createdBy: ctx.user.id });
      }),
    update: adminProcedure
      .input((raw: unknown) => {
        return z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          flowData: z.string().optional(),
        }).parse(raw);
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
        return z.object({
          id: z.number(),
          isActive: z.boolean(),
        }).parse(raw);
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
        return z.object({
          name: z.string(),
          welcomeMessage: z.string(),
          menuData: z.string(), // JSON string
          workingHours: z.string().optional(),
          offHoursMessage: z.string().optional(),
        }).parse(raw);
      })
      .mutation(async ({ input, ctx }) => {
        const { createUraMenu } = await import("./db");
        return await createUraMenu({ ...input, createdBy: ctx.user.id });
      }),
    update: adminProcedure
      .input((raw: unknown) => {
        return z.object({
          id: z.number(),
          name: z.string().optional(),
          welcomeMessage: z.string().optional(),
          menuData: z.string().optional(),
          workingHours: z.string().optional(),
          offHoursMessage: z.string().optional(),
        }).parse(raw);
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
        const { deleteUraMenu } = await import("./db");
        return await deleteUraMenu(input.id);
      }),
    toggle: adminProcedure
      .input((raw: unknown) => {
        return z.object({
          id: z.number(),
          isActive: z.boolean(),
        }).parse(raw);
      })
      .mutation(async ({ input }) => {
        const { toggleUraMenu } = await import("./db");
        return await toggleUraMenu(input.id, input.isActive);
      }),
  }),

  // AI Agents validation
  aiAgents: router({
    validateToken: adminProcedure
      .input((raw: unknown) => {
        return z.object({
          provider: z.enum(["openai", "anthropic", "google", "meta"]),
          apiKey: z.string().min(1),
        }).parse(raw);
      })
      .mutation(async ({ input }) => {
        const { validateAIToken } = await import("./ai-validation");
        return await validateAIToken(input.provider, input.apiKey);
      }),
    
    testAgent: adminProcedure
      .input((raw: unknown) => {
        return z.object({
          provider: z.enum(["openai", "anthropic", "google", "meta"]),
          apiKey: z.string().min(1),
          model: z.string(),
          prompt: z.string(),
          testMessage: z.string(),
          maxTokens: z.number().optional(),
          temperature: z.number().optional(),
        }).parse(raw);
      })
      .mutation(async ({ input }) => {
        const { testAIAgent } = await import("./ai-validation");
        return await testAIAgent(input);
      }),
  }),

  // AI Configuration and Templates
  ai: router({
    getConfig: adminProcedure.query(async () => {
      return {
        providers: {
          openai: { apiKey: !!process.env.OPENAI_API_KEY, model: "gpt-3.5-turbo" },
          anthropic: { apiKey: !!process.env.ANTHROPIC_API_KEY, model: "claude-3-sonnet" },
          google: { apiKey: !!process.env.GOOGLE_API_KEY, model: "gemini-pro" },
        },
        knowledgeBases: ["faq_farmacia", "produtos_farmacia", "politicas_farmacia"],
        defaultPrompt: "Você é um assistente virtual da Farmácia Francis. Forneça informações precisas e profissionais sobre medicamentos, produtos e serviços.",
        maxTokens: 1000,
        temperature: 0.3,
        fallbackEnabled: true,
        validationEnabled: true,
        maxResponseTime: 10000,
        maxRetries: 3,
      };
    }),

    processConversation: adminProcedure
      .input((raw: unknown) => {
        return z.object({
          templateId: z.string(),
          customerId: z.number(),
          channelId: z.string(),
          message: z.string(),
          context: z.record(z.unknown()).optional(),
        }).parse(raw);
      })
      .mutation(async ({ input }) => {
        const { processAIConversation } = await import("./ai-integration");
        const req = {
          body: input,
          headers: {},
        } as any;
        const res = {
          json: (data: unknown) => data,
          status: (code: number) => res,
        } as any;
        return await processAIConversation(req, res);
      }),

    processAutomation: adminProcedure
      .input((raw: unknown) => {
        return z.object({
          flowId: z.string(),
          triggerType: z.string(),
          triggerData: z.record(z.unknown()).optional(),
          customerId: z.number().optional(),
        }).parse(raw);
      })
      .mutation(async ({ input }) => {
        const { processAutomationFlow } = await import("./ai-integration");
        const req = {
          body: input,
          headers: {},
        } as any;
        const res = {
          json: (data: unknown) => data,
          status: (code: number) => res,
        } as any;
        return await processAutomationFlow(req, res);
      }),
  }),

  // Inbox/Messages management
  inbox: inboxRouter,

  // Queues management
  queues: queuesRouter,

  // Conversations
  conversations: conversationsRouter,
  messages: messagesRouter,

  // Quick Replies
  quickReplies: quickRepliesRouter,

  // Pauses
  pauses: pausesRouter,

  // Dashboard statistics
  dashboardStats: dashboardStatsRouter,
  dashboardDrilldown: dashboardDrilldownRouter,

  // Contact fetch (auto-fetch names from WhatsApp/Instagram)
  contactFetch: contactFetchRouter,

  // Workflow Executions
  executions: executionsRouter,
  agents: agentsRouter,

  // AI Features (Whisper, Suggestions, Sentiment, OCR)
  ai: aiRouter,

  // Tags management
  // tags: tagsRouter, // Removido - tabelas de tags comentadas

  // Agent Area (Atendimento)
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;
