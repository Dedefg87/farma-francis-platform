/**
 * tRPC Routers for Workflow Executions
 * Provides API for execution history, logs, and monitoring
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { workflowExecutions, executionData, visualFlows } from "../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export const executionsRouter = router({
  /**
   * List all executions with filters and pagination
   */
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      status: z.enum(['all', 'running', 'success', 'error', 'canceled']).default('all'),
      workflowId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { executions: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };

      const { page, pageSize, status, workflowId, startDate, endDate } = input;
      const offset = (page - 1) * pageSize;

      // Build filter conditions
      const conditions = [];
      
      if (status !== 'all') {
        conditions.push(eq(workflowExecutions.status, status));
      }
      
      if (workflowId) {
        conditions.push(eq(workflowExecutions.workflowId, workflowId));
      }
      
      if (startDate) {
        conditions.push(gte(workflowExecutions.startedAt, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(workflowExecutions.startedAt, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get executions with workflow names
      const executions = await db
        .select({
          id: workflowExecutions.id,
          workflowId: workflowExecutions.workflowId,
          workflowName: visualFlows.name,
          status: workflowExecutions.status,
          mode: workflowExecutions.mode,
          startedAt: workflowExecutions.startedAt,
          finishedAt: workflowExecutions.finishedAt,
          executionTime: workflowExecutions.executionTime,
          error: workflowExecutions.error,
        })
        .from(workflowExecutions)
        .leftJoin(visualFlows, eq(workflowExecutions.workflowId, visualFlows.id))
        .where(whereClause)
        .orderBy(desc(workflowExecutions.startedAt))
        .limit(pageSize)
        .offset(offset);

      // Count total
      const allExecutions = await db
        .select()
        .from(workflowExecutions)
        .where(whereClause);
      
      const total = allExecutions.length;

      return {
        executions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * Get all executions for a workflow
   */
  getByWorkflow: protectedProcedure
    .input(z.object({
      workflowId: z.number(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const executions = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, input.workflowId))
        .orderBy(desc(workflowExecutions.startedAt))
        .limit(input.limit)
        .offset(input.offset);

      return executions;
    }),

  /**
   * Get execution by ID with all node data
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      // Get execution
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, input.id));

      if (!execution) return null;

      // Get all node executions
      const nodes = await db
        .select()
        .from(executionData)
        .where(eq(executionData.executionId, input.id))
        .orderBy(executionData.startedAt);

      return {
        ...execution,
        nodes,
      };
    }),

  /**
   * Get execution statistics
   */
  getStats: protectedProcedure
    .input(z.object({
      workflowId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return {
        total: 0,
        success: 0,
        error: 0,
        running: 0,
        avgExecutionTime: 0,
      };

      const conditions = [];
      if (input.workflowId) {
        conditions.push(eq(workflowExecutions.workflowId, input.workflowId));
      }
      if (input.startDate) {
        conditions.push(gte(workflowExecutions.startedAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(workflowExecutions.startedAt, input.endDate));
      }

      const executions = await db
        .select()
        .from(workflowExecutions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = executions.length;
      const success = executions.filter(e => e.status === "success").length;
      const error = executions.filter(e => e.status === "error").length;
      const running = executions.filter(e => e.status === "running").length;
      
      const completedExecutions = executions.filter(e => e.executionTime);
      const avgExecutionTime = completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / completedExecutions.length
        : 0;

      return {
        total,
        success,
        error,
        running,
        avgExecutionTime: Math.round(avgExecutionTime),
        successRate: total > 0 ? Math.round((success / total) * 100) : 0,
      };
    }),

  /**
   * Get recent executions (all workflows)
   */
  getRecent: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const executions = await db
        .select({
          id: workflowExecutions.id,
          workflowId: workflowExecutions.workflowId,
          workflowName: visualFlows.name,
          status: workflowExecutions.status,
          mode: workflowExecutions.mode,
          startedAt: workflowExecutions.startedAt,
          finishedAt: workflowExecutions.finishedAt,
          executionTime: workflowExecutions.executionTime,
          error: workflowExecutions.error,
        })
        .from(workflowExecutions)
        .leftJoin(visualFlows, eq(workflowExecutions.workflowId, visualFlows.id))
        .orderBy(desc(workflowExecutions.startedAt))
        .limit(input.limit);

      return executions;
    }),

  /**
   * Retry failed execution
   */
  retry: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get original execution
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, input.id));

      if (!execution) {
        throw new Error("Execution not found");
      }

      // Import and execute workflow
      const { executeWorkflow } = await import("./workflow-executor");
      
      const triggerData = execution.triggerData ? JSON.parse(execution.triggerData) : undefined;
      const result = await executeWorkflow(execution.workflowId, triggerData, ctx.user.id);

      return result;
    }),

  /**
   * Cancel running execution
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(workflowExecutions)
        .set({ 
          status: "canceled",
          finishedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, input.id));

      return { success: true };
    }),

  /**
   * Delete execution
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Delete execution data first
      await db
        .delete(executionData)
        .where(eq(executionData.executionId, input.id));

      // Delete execution
      await db
        .delete(workflowExecutions)
        .where(eq(workflowExecutions.id, input.id));

      return { success: true };
    }),

  /**
   * Export executions to CSV or PDF
   */
  export: protectedProcedure
    .input(z.object({
      format: z.enum(['csv', 'pdf']),
      status: z.enum(['all', 'running', 'success', 'error', 'canceled']).default('all'),
      workflowId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Build filter conditions (same as list)
      const conditions = [];
      
      if (input.status !== 'all') {
        conditions.push(eq(workflowExecutions.status, input.status));
      }
      
      if (input.workflowId) {
        conditions.push(eq(workflowExecutions.workflowId, input.workflowId));
      }
      
      if (input.startDate) {
        conditions.push(gte(workflowExecutions.startedAt, input.startDate));
      }
      
      if (input.endDate) {
        conditions.push(lte(workflowExecutions.startedAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get all executions (no pagination for export)
      const executions = await db
        .select({
          id: workflowExecutions.id,
          workflowId: workflowExecutions.workflowId,
          workflowName: visualFlows.name,
          status: workflowExecutions.status,
          mode: workflowExecutions.mode,
          startedAt: workflowExecutions.startedAt,
          finishedAt: workflowExecutions.finishedAt,
          executionTime: workflowExecutions.executionTime,
          error: workflowExecutions.error,
        })
        .from(workflowExecutions)
        .leftJoin(visualFlows, eq(workflowExecutions.workflowId, visualFlows.id))
        .where(whereClause)
        .orderBy(desc(workflowExecutions.startedAt));

      if (input.format === 'csv') {
        // Generate CSV
        const headers = ['ID', 'Fluxo', 'Status', 'Modo', 'Início', 'Fim', 'Tempo (ms)', 'Erro'];
        const rows = executions.map(e => [
          e.id,
          e.workflowName || `Fluxo ${e.workflowId}`,
          e.status,
          e.mode,
          e.startedAt?.toISOString() || '',
          e.finishedAt?.toISOString() || '',
          e.executionTime || '',
          e.error || '',
        ]);

        const csv = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return {
          format: 'csv' as const,
          data: csv,
          filename: `execucoes_${new Date().toISOString().split('T')[0]}.csv`,
        };
      } else {
        // Generate PDF (simplified - return data for client-side PDF generation)
        return {
          format: 'pdf' as const,
          data: JSON.stringify(executions),
          filename: `execucoes_${new Date().toISOString().split('T')[0]}.pdf`,
        };
      }
    }),

  /**
   * Clear all executions for a workflow
   */
  clearByWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all execution IDs
      const executions = await db
        .select({ id: workflowExecutions.id })
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, input.workflowId));

      const executionIds = executions.map(e => e.id);

      // Delete execution data
      for (const id of executionIds) {
        await db
          .delete(executionData)
          .where(eq(executionData.executionId, id));
      }

      // Delete executions
      await db
        .delete(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, input.workflowId));

      return { success: true, deleted: executionIds.length };
    }),
});

  /** * Get analytics data for dashboard charts */
  getAnalytics: protectedProcedure
    .input(z.object({
      period: z.enum(['7d', '30d', '90d']).default('7d'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          summary: { total: 0, success: 0, failed: 0, avgTime: 0, successRate: 0 },
          dailyStats: [],
        };
      }

      const days = { '7d': 7, '30d': 30, '90d': 90 }[input.period];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const executions = await db
        .select()
        .from(workflowExecutions)
        .where(gte(workflowExecutions.startedAt, startDate))
        .orderBy(workflowExecutions.startedAt);

      const total = executions.length;
      const success = executions.filter(e => e.status === 'success').length;
      const failed = executions.filter(e => e.status === 'error').length;
      const completedWithTime = executions.filter(e => e.executionTime);
      const avgTime = completedWithTime.length > 0
        ? Math.round(completedWithTime.reduce((sum, e) => sum + (e.executionTime || 0), 0) / completedWithTime.length)
        : 0;

      const dailyMap = new Map();
      executions.forEach(exec => {
        const dateKey = exec.startedAt.toISOString().split('T')[0];
        const current = dailyMap.get(dateKey) || { success: 0, failed: 0 };
        if (exec.status === 'success') current.success++;
        if (exec.status === 'error') current.failed++;
        dailyMap.set(dateKey, current);
      });

      const dailyStats = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const stats = dailyMap.get(dateKey) || { success: 0, failed: 0 };
        dailyStats.push({ date: dateKey, success: stats.success, failed: stats.failed });
      }

      return {
        summary: { total, success, failed, avgTime, successRate: total > 0 ? Math.round((success / total) * 100) : 0 },
        dailyStats,
      };
    }),
});
