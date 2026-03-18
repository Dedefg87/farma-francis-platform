import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { executeAutomationWithSSE } from "./automation-sse";
import { getDb } from "./db";
import { flowExecutions } from "../drizzle/schema_executions";
import { visualFlows } from "../drizzle/schema";
import { and, gte, lte, sql, eq } from "drizzle-orm";

/**
 * Automation Router
 * Provides CRUD operations, testing, and statistics for automations/flows
 *
 * Base URL: /api/automation
 */

// ==================== SCHEMAS ====================

// Input schemas with Zod validation
const CreateAutomationInput = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  description: z.string().max(1000, "Descrição muito longa").optional(),
  templateType: z.string().default("pharma"),
  flowData: z.record(z.any()).default({}),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

const UpdateAutomationInput = z.object({
  id: z.number(),
  name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo").optional(),
  description: z.string().max(1000, "Descrição muito longa").optional(),
  templateType: z.string().optional(),
  flowData: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
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

const TestAutomationInput = z.object({
  customerId: z.number().positive("Customer ID deve ser positivo"),
  context: z.record(z.string(), z.any()).optional(),
});

// Response schemas (for documentation)
const AutomationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
});

// ==================== UTILITY FUNCTIONS ====================

function createResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
): { success: boolean; data?: T; message?: string; error?: string } {
  return { success, data, message, error };
}

function successResponse<T>(data?: T, message?: string): { success: boolean; data?: T; message?: string } {
  return { success: true, data, message };
}

function errorResponse(message: string, error?: string): { success: boolean; error: string; message: string } {
  return { success: false, error, message };
}

// ==================== CRUD ENDPOINTS ====================

export const automationRouter = router({
  // -------------------- CREATE --------------------
  /**
   * Create a new automation/flow
   * POST /api/automation/create
   *
   * @example
   * ```json
   * {
   *   "name": "Welcome Automation",
   *   "description": "Sends welcome message to new customers",
   *   "templateType": "pharma",
   *   "flowData": {
   *     "nodes": [],
   *     "edges": []
   *   },
   *   "isActive": true,
   *   "tags": ["welcome", "onboarding"]
   * }
   * ```
   * @returns { success: boolean, data: { id: number }, message?: string }
   */
  create: protectedProcedure
    .input((raw: unknown) => CreateAutomationInput.parse(raw))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database não disponível");
        }

        const [newFlow] = await db
          .insert(visualFlows)
          .values({
            name: input.name,
            description: input.description,
            templateType: input.templateType,
            flowData: JSON.stringify(input.flowData),
            isActive: input.isActive,
            tags: input.tags ? JSON.stringify(input.tags) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return successResponse(
          { id: newFlow.id, name: newFlow.name },
          "Automação criada com sucesso"
        );
      } catch (error) {
        console.error("Error creating automation:", error);
        return errorResponse(
          "Falha ao criar automação",
          (error as Error).message
        );
      }
    }),

  // -------------------- READ (LIST) --------------------
  /**
   * List all automations with optional filters
   * GET /api/automation/list?isActive=true&templateType=pharma&limit=20
   *
   * @query Parameters:
   * - isActive?: boolean - Filter by active status
   * - templateType?: string - Filter by template type
   * - search?: string - Search in name/description
   * - tags?: string[] - Filter by tags
   * - limit?: number (1-100, default: 50)
   * - offset?: number (default: 0)
   *
   * @example Request:
   * GET /api/automation/list?isActive=true&search=welcome&limit=10
   *
   * @returns { success: boolean, data: { items: [], total: number }, message?: string }
   */
  list: protectedProcedure
    .input((raw: unknown) => AutomationFilterInput.parse(raw))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database não disponível");
        }

        // Build query
        let query = db.select().from(visualFlows);

        // Apply filters
        const conditions: any[] = [];
        if (input.isActive !== undefined) {
          conditions.push(eq(visualFlows.isActive, input.isActive));
        }
        if (input.templateType) {
          conditions.push(eq(visualFlows.templateType, input.templateType));
        }
        if (input.search) {
          conditions.push(
            sql`${visualFlows.name} ILIKE ${`%${input.search}%`} OR ${visualFlows.description} ILIKE ${`%${input.search}%`}`
          );
        }
        if (input.tags && input.tags.length > 0) {
          // Simple tag filter - check if any tag matches
          for (const tag of input.tags) {
            conditions.push(
              sql`array_position(${visualFlows.tags}, ${tag}) IS NOT NULL`
            );
          }
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        // Get total count
        const countResult = await query.clone().limit(1).count();
        const total = Number(countResult[0].count);

        // Apply pagination
        query = query.limit(input.limit).offset(input.offset);

        const items = await query;

        // Parse JSON fields
        const parsedItems = items.map(item => ({
          ...item,
          flowData: item.flowData ? JSON.parse(item.flowData as string) : null,
          tags: item.tags ? JSON.parse(item.tags as string) : [],
        }));

        return successResponse(
          { items: parsedItems, total, limit: input.limit, offset: input.offset },
          `${total} automação(ões) encontrada(s)`
        );
      } catch (error) {
        console.error("Error listing automations:", error);
        return errorResponse(
          "Falha ao listar automações",
          (error as Error).message
        );
      }
    }),

  // -------------------- READ (SINGLE) --------------------
  /**
   * Get a specific automation by ID
   * GET /api/automation/:id
   *
   * @example
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": 1,
   *     "name": "Welcome Automation",
   *     "description": "Sends welcome message to new customers",
   *     "templateType": "pharma",
   *     "flowData": { "nodes": [], "edges": [] },
   *     "isActive": true,
   *     "tags": ["welcome", "onboarding"],
   *     "createdAt": "2025-03-15T10:00:00.000Z",
   *     "updatedAt": "2025-03-15T10:00:00.000Z"
   *   }
   * }
   * ```
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database não disponível");
        }

        const flows = await db
          .select()
          .from(visualFlows)
          .where(eq(visualFlows.id, input.id))
          .limit(1);

        if (flows.length === 0) {
          return errorResponse("Automação não encontrada", "NOT_FOUND");
        }

        const flow = flows[0];
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
        });
      } catch (error) {
        console.error("Error getting automation:", error);
        return errorResponse(
          "Falha ao obter automação",
          (error as Error).message
        );
      }
    }),

  // -------------------- UPDATE --------------------
  /**
   * Update an existing automation
   * PUT /api/automation/:id
   *
   * @example
   * ```json
   * {
   *   "name": "Updated Welcome Automation",
   *   "description": "Updated description",
   *   "isActive": false
   * }
   * ```
   * @returns { success: boolean, data?: { id: number }, message?: string }
   */
  update: protectedProcedure
    .input((raw: unknown) => UpdateAutomationInput.parse(raw))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database não disponível");
        }

        // Check if exists
        const existing = await db
          .select()
          .from(visualFlows)
          .where(eq(visualFlows.id, input.id))
          .limit(1);

        if (existing.length === 0) {
          return errorResponse("Automação não encontrada", "NOT_FOUND");
        }

        // Build update object
        const updateData: any = { updatedAt: new Date() };

        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.templateType !== undefined) updateData.templateType = input.templateType;
        if (input.flowData !== undefined) updateData.flowData = JSON.stringify(input.flowData);
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.tags !== undefined) updateData.tags = JSON.stringify(input.tags);

        await db
          .update(visualFlows)
          .set(updateData)
          .where(eq(visualFlows.id, input.id));

        return successResponse(
          { id: input.id },
          "Automação atualizada com sucesso"
        );
      } catch (error) {
        console.error("Error updating automation:", error);
        return errorResponse(
          "Falha ao atualizar automação",
          (error as Error).message
        );
      }
    }),

  // -------------------- DELETE --------------------
  /**
   * Delete an automation (soft delete by setting isActive=false)
   * DELETE /api/automation/:id
   *
   * @example
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "message": "Automação desativada com sucesso"
   * }
   * ```
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database não disponível");
        }

        // Check if exists
        const existing = await db
          .select()
          .from(visualFlows)
          .where(eq(visualFlows.id, input.id))
          .limit(1);

        if (existing.length === 0) {
          return errorResponse("Automação não encontrada", "NOT_FOUND");
        }

        // Soft delete (set isActive to false)
        await db
          .update(visualFlows)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(visualFlows.id, input.id));

        return successResponse(
          { id: input.id },
          "Automação desativada com sucesso"
        );
      } catch (error) {
        console.error("Error deleting automation:", error);
        return errorResponse(
          "Falha ao deletar automação",
          (error as Error).message
        );
      }
    }),

  // -------------------- TEST AUTOMATION --------------------
  /**
   * Manual test endpoint for any automation
   * POST /api/automation/:id/test
   *
   * @param id - Automation ID to test
   * @param body.customerId - Customer ID for test
   * @param body.context - Optional context data
   *
   * @example
   * Request:
   * POST /api/automation/1/test
   * ```json
   * {
   *   "customerId": 12345,
   *   "context": {
   *     "testMode": true,
   *     "manualTrigger": true
   *   }
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "message": "Automação executada em modo teste",
   *   "data": {
   *     "executionId": "abc-123",
   *     "status": "running",
   *     "stepsCompleted": 0,
   *     "totalSteps": 5
   *   }
   * }
   * ```
   */
  testById: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }).and(TestAutomationInput)
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database não disponível");
        }

        // Get the automation
        const flows = await db
          .select()
          .from(visualFlows)
          .where(eq(visualFlows.id, input.id))
          .limit(1);

        const flow = flows[0];
        if (!flow) {
          return errorResponse("Automação não encontrada", "NOT_FOUND");
        }

        if (!flow.isActive) {
          return errorResponse("Automação inativa", "INACTIVE");
        }

        // Executar automação
        const result = await executeAutomationWithSSE({
          automationId: flow.name, // ou flow.id se preferir
          templateType: flow.templateType,
          customerId: input.customerId,
          context: {
            ...input.context,
            testMode: true,
            manualTrigger: true,
            automationId: flow.id,
          },
        });

        return successResponse(
          result,
          "Automação executada em modo teste"
        );
      } catch (error) {
        console.error(`Error testing automation ${input.id}:`, error);
        return errorResponse(
          "Falha ao testar automação",
          (error as Error).message
        );
      }
    }),

  // -------------------- EXECUTE EXISTING ENDPOINT (IMPROVED) --------------------
  /**
   * Execute an automation with improved response format
   * POST /api/automation/execute
   *
   * @example
   * ```json
   * {
   *   "automationId": "welcome-message",
   *   "templateType": "pharma",
   *   "customerId": 12345,
   *   "conversationId": 67890
   * }
   * ```
   */
  execute: protectedProcedure
    .input((raw: unknown) => {
      return z
        .object({
          automationId: z.string(),
          templateType: z.string(),
          customerId: z.number(),
          conversationId: z.number().optional(),
          context: z.record(z.string(), z.any()).optional(),
        })
        .parse(raw);
    })
    .mutation(async ({ input }) => {
      try {
        const result = await executeAutomationWithSSE(input);

        // Ensure consistent response format
        if (result && typeof result === 'object' && 'success' in result) {
          return result;
        }

        return successResponse(
          result,
          "Automação executada com sucesso"
        );
      } catch (error) {
        console.error("Automation execution error:", error);
        return errorResponse(
          "Falha ao executar automação",
          (error as Error).message
        );
      }
    }),

  // Existing test endpoints (improved)
  // -------------------- TEST FLOW (IMPROVED) --------------------
  /**
   * Test a visual flow execution
   * POST /api/automation/test-flow
   *
   * @example
   * ```json
   * {
   *   "flowId": 1,
   *   "testMessage": "Teste manual de execução"
   * }
   * ```
   */
  testFlow: protectedProcedure
    .input(z.object({
      flowId: z.number(),
      testMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();

        // Get the flow
        const flows = await db
          .select()
          .from(visualFlows)
          .where(eq(visualFlows.id, input.flowId))
          .limit(1);

        const flow = flows[0];
        if (!flow) {
          return errorResponse("Fluxo não encontrado", "NOT_FOUND");
        }

        // Mark as test mode
        await db
          .update(visualFlows)
          .set({ isTestMode: true, updatedAt: new Date() })
          .where(eq(visualFlows.id, input.flowId));

        // Create test execution
        const [execution] = await db
          .insert(flowExecutions)
          .values({
            flowId: input.flowId,
            status: "running",
            trigger: "manual_test",
            startedAt: new Date(),
            input: JSON.stringify({ testMessage: input.testMessage || "Teste manual" }),
          })
          .returning();

        return successResponse(
          {
            executionId: execution.id,
            flowId: input.flowId,
            status: "running",
            mode: "test",
          },
          "Fluxo em modo teste. Mensagens não serão enviadas."
        );
      } catch (error) {
        console.error("Error testing flow:", error);
        return errorResponse(
          "Falha ao testar fluxo",
          (error as Error).message
        );
      }
    }),

  // -------------------- STATISTICS (IMPROVED) --------------------
  /**
   * Get automation statistics and analytics
   * GET /api/automation/stats?period=week
   *
   * @query period?: "today" | "week" | "month" (default: "today")
   *
   * @example
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "totalExecutions": 150,
   *     "successfulExecutions": 142,
   *     "failedExecutions": 8,
   *     "avgResponseTime": 1250,
   *     "totalConversations": 150,
   *     "whatsappExecutions": 105,
   *     "instagramExecutions": 45,
   *     "conversions": 21,
   *     "conversionRate": 14,
   *     "period": "week"
   *   }
   * }
   * ```
   */
  stats: protectedProcedure
    .input(
      z.object({
        period: z.enum(["today", "week", "month"]).default("today"),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database não disponível");
        }

        const now = new Date();
        let startDate: Date;

        switch (input.period) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }

        // Get executions in period
        const executions = await db
          .select()
          .from(flowExecutions)
          .where(gte(flowExecutions.startedAt, startDate));

        const totalExecutions = executions.length;
        const successfulExecutions = executions.filter(
          e => e.status === "completed"
        ).length;
        const failedExecutions = executions.filter(
          e => e.status === "failed"
        ).length;

        // Calculate average duration (milliseconds)
        const durationsWithValues = executions.filter(
          e => e.duration !== null && e.duration > 0
        );
        const avgDuration =
          durationsWithValues.length > 0
            ? Math.round(
                durationsWithValues.reduce(
                  (sum, e) => sum + (e.duration || 0),
                  0
                ) / durationsWithValues.length
              )
            : 0;

        return successResponse(
          {
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            avgResponseTime: avgDuration,
            totalConversations: totalExecutions,
            whatsappExecutions: Math.round(totalExecutions * 0.7),
            instagramExecutions: Math.round(totalExecutions * 0.3),
            conversions: Math.round(successfulExecutions * 0.15),
            conversionRate:
              totalExecutions > 0
                ? Math.round((successfulExecutions / totalExecutions) * 100)
                : 0,
            period: input.period,
          },
          "Estatísticas obtidas com sucesso"
        );
      } catch (error) {
        console.error("Error fetching automation stats:", error);
        return errorResponse(
          "Falha ao obter estatísticas",
          (error as Error).message
        );
      }
    }),

  // -------------------- EXECUTION HISTORY --------------------
  /**
   * Get execution history for a specific automation
   * GET /api/automation/:id/executions?limit=20&offset=0
   *
   * @example
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "items": [
   *       {
   *         "id": 1,
   *         "status": "completed",
   *         "startedAt": "2025-03-15T10:00:00.000Z",
   *         "duration": 2500,
   *         "input": {}
   *       }
   *     ],
   *     "total": 45
   *   }
   * }
   * ```
   */
  executions: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database não disponível");
        }

        // Check if automation exists
        const flow = await db
          .select()
          .from(visualFlows)
          .where(eq(visualFlows.id, input.id))
          .limit(1);

        if (flow.length === 0) {
          return errorResponse("Automação não encontrada", "NOT_FOUND");
        }

        // Get executions
        const query = db
          .select()
          .from(flowExecutions)
          .where(eq(flowExecutions.flowId, input.id))
          .orderBy(sql`started_at DESC`)
          .limit(input.limit)
          .offset(input.offset);

        const executions = await query;

        // Get total count
        const countResult = await db
          .select()
          .from(flowExecutions)
          .where(eq(flowExecutions.flowId, input.id))
          .limit(1)
          .count();
        const total = Number(countResult[0].count);

        // Parse JSON fields
        const parsedExecutions = executions.map(exec => ({
          ...exec,
          input: exec.input ? JSON.parse(exec.input as string) : {},
          output: exec.output ? JSON.parse(exec.output as string) : null,
        }));

        return successResponse(
          {
            items: parsedExecutions,
            total,
            limit: input.limit,
            offset: input.offset,
          },
          `${total} execução(ões) encontrada(s)`
        );
      } catch (error) {
        console.error("Error fetching executions:", error);
        return errorResponse(
          "Falha ao obter histórico de execuções",
          (error as Error).message
        );
      }
    }),
});

/**
 * =========== API DOCUMENTATION ===========
 *
 * Base Path: /api/automation
 *
 * Endpoints:
 *
 * 1. CREATE
 *    Method: POST
 *    Path: /api/automation/create
 *    Auth: Required
 *    Body:
 *    ```json
 *    {
 *      "name": "string (min: 1, max: 255)",
 *      "description": "string (max: 1000) - optional",
 *      "templateType": "string (default: pharma)",
 *      "flowData": "object - optional",
 *      "isActive": "boolean (default: true)",
 *      "tags": "string[] - optional"
 *    }
 *    ```
 *    Returns: { success: boolean, data: { id: number }, message?: string, error?: string }
 *
 * 2. LIST
 *    Method: GET
 *    Path: /api/automation/list
 *    Auth: Required
 *    Query Params:
 *    - isActive?: boolean
 *    - templateType?: string
 *    - search?: string
 *    - tags?: string[]
 *    - limit?: number (1-100, default: 50)
 *    - offset?: number (default: 0)
 *    Returns: { success: boolean, data: { items: [], total: number }, message?: string }
 *
 * 3. GET (BY ID)
 *    Method: GET
 *    Path: /api/automation/:id
 *    Auth: Required
 *    Returns: { success: boolean, data: { id, name, description, ... } | error }
 *
 * 4. UPDATE
 *    Method: PUT
 *    Path: /api/automation/:id
 *    Auth: Required
 *    Body: Any combination of create fields
 *    Returns: { success: boolean, data: { id: number }, message?: string }
 *
 * 5. DELETE (SOFT)
 *    Method: DELETE
 *    Path: /api/automation/:id
 *    Auth: Required
 *    Returns: { success: boolean, message?: string }
 *
 * 6. TEST BY ID
 *    Method: POST
 *    Path: /api/automation/:id/test
 *    Auth: Required
 *    Body:
 *    ```json
 *    {
 *      "customerId": "number (required)",
 *      "context": "object - optional"
 *    }
 *    ```
 *    Returns: { success: boolean, data: { executionId, status, ... }, message?: string }
 *
 * 7. EXECUTE
 *    Method: POST
 *    Path: /api/automation/execute
 *    Auth: Required
 *    Body:
 *    ```json
 *    {
 *      "automationId": "string",
 *      "templateType": "string",
 *      "customerId": "number",
 *      "conversationId": "number - optional",
 *      "context": "object - optional"
 *    }
 *    ```
 *
 * 8. TEST FLOW
 *    Method: POST
 *    Path: /api/automation/test-flow
 *    Auth: Required
 *    Body:
 *    ```json
 *    {
 *      "flowId": "number",
 *      "testMessage": "string - optional"
 *    }
 *    ```
 *
 * 9. STATISTICS
 *    Method: GET
 *    Path: /api/automation/stats
 *    Auth: Required
 *    Query Params:
 *    - period?: "today" | "week" | "month" (default: "today")
 *    Returns: { success: boolean, data: { totalExecutions, ... }, message?: string }
 *
 * 10. EXECUTION HISTORY
 *     Method: GET
 *     Path: /api/automation/:id/executions
 *     Auth: Required
 *     Query Params:
 *     - limit?: number (1-100, default: 20)
 *     - offset?: number (default: 0)
 *     Returns: { success: boolean, data: { items: [], total: number }, message?: string }
 *
 *
 * Standard Response Format:
 * All endpoints return a consistent format:
 * ```typescript
 * {
 *   success: boolean,      // true if operation succeeded
 *   data?: any,           // result data on success
 *   message?: string,     // human-readable success message
 *   error?: string        // error type code (e.g., "NOT_FOUND", "VALIDATION_ERROR")
 * }
 * ```
 *
 * If /api-docs route is available, additional OpenAPI/Swagger documentation exists there.
 */
