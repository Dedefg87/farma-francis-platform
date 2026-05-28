import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { executeAutomationWithSSE } from "./automation-sse";
import { getDb } from "./db";
import { flowExecutions } from "../drizzle/schema_executions";
import { automationFlows, visualFlows, workflowExecutions } from "../drizzle/schema";
import { and, gte, lte, sql, eq } from "drizzle-orm";

/**
 * Automation Router - UNIFICADO
 * Provides CRUD operations, testing, and statistics for automations/flows
 * 
 * UNIFICAÇÃO: Busca em visualFlows + automationFlows
 */

// Input schemas
const CreateAutomationInput = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  description: z.string().max(1000, "Descrição muito longa").optional(),
  templateType: z.string().default("pharma"),
  flowData: z.any().optional(),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

const AutomationFilterInput = z.object({
  isActive: z.boolean().optional(),
  templateType: z.string().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

function successResponse<T>(data?: T, message?: string): { success: boolean; data?: T; message?: string } {
  return { success: true, data, message };
}

function errorResponse(message: string, error?: string): { success: boolean; error: string; message: string } {
  return { success: false, error, message };
}

export const automationRouter = router({
  // CREATE
  create: protectedProcedure
    .input(CreateAutomationInput)
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database não disponível");

        const [result] = await db.insert(visualFlows).values({
          name: input.name,
          description: input.description,
          templateType: input.templateType,
          flowData: JSON.stringify(input.flowData),
          isActive: input.isActive,
          tags: input.tags ? JSON.stringify(input.tags) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const lastId = (result as any).insertId || (result as any).$mysqlInsertId();
        if (!lastId) throw new Error("Failed to get inserted ID");

        const [newFlow] = await db
          .select()
          .from(visualFlows)
          .where(eq(visualFlows.id, lastId))
          .limit(1);

        return { id: newFlow.id, name: newFlow.name };
      } catch (error) {
        console.error("Error creating automation:", error);
        return errorResponse("Falha ao criar automação", (error as Error).message);
      }
    }),

  // LIST - UNIFICADO: visualFlows + automationFlows
  list: protectedProcedure
    .input(AutomationFilterInput)
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database não disponível");

        const allItems: any[] = [];

        // 1. Buscar fluxos visuais (N8N-style)
        let visualQuery = db.select().from(visualFlows);
        const visualConditions: any[] = [];

        if (input.isActive !== undefined) {
          visualConditions.push(eq(visualFlows.isActive, input.isActive));
        }
        if (input.search) {
          visualConditions.push(
            sql`${visualFlows.name} ILIKE ${`%${input.search}%`} OR ${visualFlows.description} ILIKE ${`%${input.search}%`}`
          );
        }

        if (visualConditions.length > 0) {
          visualQuery = visualQuery.where(and(...visualConditions));
        }

        const visualItemsRaw = await visualQuery.limit(100);
        const visualItems = visualItemsRaw.map(item => ({
          ...item,
          flowData: item.flowData ? JSON.parse(item.flowData as string) : null,
          tags: item.tags ? JSON.parse(item.tags as string) : [],
          source: 'visual_flows',
        }));

        allItems.push(...visualItems);

        // 2. Buscar fluxos simples (legacy) - converter para formato unificado
        if (!input.templateType) {
          const legacyItemsRaw = await db.select().from(automationFlows).limit(50);
          const legacyItems = legacyItemsRaw.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            templateType: item.channel || 'whatsapp',
            flowData: {
              nodes: [
                {
                  id: 'trigger-node',
                  type: 'trigger',
                  data: {
                    label: 'Gatilho',
                    nodeType: 'webhook-trigger',
                    config: [{ key: 'keywords', label: 'Palavras-chave', type: 'string', defaultValue: item.trigger }]
                  }
                },
                {
                  id: 'response-node',
                  type: 'message',
                  data: {
                    label: 'Resposta',
                    nodeType: 'message',
                    config: [{ key: 'message', label: 'Mensagem', type: 'prompt', defaultValue: item.response }]
                  }
                }
              ],
              edges: [{ id: 'e1', source: 'trigger-node', target: 'response-node' }]
            },
            isActive: item.isActive === 1,
            tags: [],
            responseCount: item.responseCount || 0,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            source: 'automation_flows',
          }));

          allItems.push(...legacyItems);
        }

        // Apply filters
        let filteredItems = allItems;
        if (input.isActive !== undefined) {
          filteredItems = allItems.filter(item => item.isActive === input.isActive);
        }
        if (input.search) {
          const searchTerm = input.search.toLowerCase();
          filteredItems = filteredItems.filter(item =>
            item.name?.toLowerCase().includes(searchTerm) ||
            item.description?.toLowerCase().includes(searchTerm)
          );
        }

        // Sort by updatedAt desc
        filteredItems.sort((a: any, b: any) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        const total = filteredItems.length;
        const paginatedItems = filteredItems.slice(input.offset, input.offset + input.limit);

        return {
          items: paginatedItems,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("Error listing automations:", error);
        return errorResponse("Falha ao listar automações", (error as Error).message);
      }
    }),

  // GET BY ID - UNIFICADO
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database não disponível");

        // Primeiro tenta visualFlows
        const visualItems = await db
          .select()
          .from(visualFlows)
          .where(eq(visualFlows.id, input.id))
          .limit(1);

        if (visualItems.length > 0) {
          const flow = visualItems[0];
          return successResponse({
            id: flow.id,
            name: flow.name,
            description: flow.description,
            templateType: flow.templateType,
            flowData: flow.flowData ? JSON.parse(flow.flowData as string) : null,
            isActive: flow.isActive,
            tags: flow.tags ? JSON.parse(flow.tags as string) : [],
            createdAt: flow.createdAt,
            updatedAt: flow.updatedAt,
            source: 'visual_flows',
          });
        }

        // Se não encontrar, tenta automationFlows (legacy)
        const legacyItems = await db
          .select()
          .from(automationFlows)
          .where(eq(automationFlows.id, input.id))
          .limit(1);

        if (legacyItems.length === 0) {
          return errorResponse("Automação não encontrada", "NOT_FOUND");
        }

        const item = legacyItems[0];
        return successResponse({
          id: item.id,
          name: item.name,
          description: item.description,
          templateType: item.channel || 'whatsapp',
          flowData: {
            nodes: [
              {
                id: 'trigger-node',
                type: 'trigger',
                data: {
                  label: 'Gatilho',
                  nodeType: 'webhook-trigger',
                  config: [{ key: 'keywords', label: 'Palavras-chave', type: 'string', defaultValue: item.trigger }]
                }
              },
              {
                id: 'response-node',
                type: 'message',
                data: {
                  label: 'Resposta',
                  nodeType: 'message',
                  config: [{ key: 'message', label: 'Mensagem', type: 'prompt', defaultValue: item.response }]
                }
              }
            ],
            edges: [{ id: 'e1', source: 'trigger-node', target: 'response-node' }]
          },
          isActive: item.isActive === 1,
          tags: [],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          source: 'automation_flows',
        });
      } catch (error) {
        console.error("Error getting automation:", error);
        return errorResponse("Falha ao obter automação", (error as Error).message);
      }
    }),

  // UPDATE - suporta ambos os tipos
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      templateType: z.string().optional(),
      flowData: z.any().optional(),
      isActive: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database não disponível");

        // Primeiro tenta atualizar visualFlows
        const visualUpdate = await db
          .update(visualFlows)
          .set({
            ...input.name && { name: input.name },
            ...input.description && { description: input.description },
            ...input.templateType && { templateType: input.templateType },
            ...input.flowData && { flowData: JSON.stringify(input.flowData) },
            ...input.isActive !== undefined && { isActive: input.isActive },
            ...input.tags && { tags: JSON.stringify(input.tags) },
            updatedAt: new Date(),
          })
          .where(eq(visualFlows.id, input.id));

        if ((visualUpdate as any).affectedRows > 0 || (visualUpdate as any).changes > 0) {
          return successResponse({ id: input.id }, "Automação atualizada com sucesso");
        }

        // Se não encontrar em visualFlows, tenta automationFlows
        const legacyUpdate = await db
          .update(automationFlows)
          .set({
            ...input.name && { name: input.name },
            ...input.description && { description: input.description },
            ...input.isActive !== undefined && { isActive: input.isActive ? 1 : 0 },
            ...input.updatedAt && { updatedAt: input.updatedAt },
          })
          .where(eq(automationFlows.id, input.id));

        if ((legacyUpdate as any).affectedRows > 0 || (legacyUpdate as any).changes > 0) {
          return successResponse({ id: input.id }, "Automação atualizada com sucesso");
        }

        return errorResponse("Automação não encontrada", "NOT_FOUND");
      } catch (error) {
        console.error("Error updating automation:", error);
        return errorResponse("Falha ao atualizar automação", (error as Error).message);
      }
    }),

  // DELETE - remove ambos
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database não disponível");

        // Remove de visualFlows primeiro
        const visualDelete = await db
          .delete(visualFlows)
          .where(eq(visualFlows.id, input.id));

        // Remove de automationFlows também
        const legacyDelete = await db
          .delete(automationFlows)
          .where(eq(automationFlows.id, input.id));

        return successResponse(
          { id: input.id },
          "Automação excluída com sucesso"
        );
      } catch (error) {
        console.error("Error deleting automation:", error);
        return errorResponse("Falha ao deletar automação", (error as Error).message);
      }
    }),

  // EXECUTIONS - histórico
  executions: protectedProcedure
    .input(z.object({
      id: z.number(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database não disponível");

        const executions = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.automationId, String(input.id)))
          .limit(input.limit)
          .offset(input.offset);

        const totalResult = await db
          .select({ count: sql`count(*)` })
          .from(workflowExecutions)
          .where(eq(workflowExecutions.automationId, String(input.id)));

        return {
          items: executions,
          total: Number(totalResult[0].count),
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("Error getting executions:", error);
        return errorResponse("Falha ao obter execuções", (error as Error).message);
      }
    }),
});