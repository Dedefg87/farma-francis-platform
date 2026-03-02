import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { flowExecutionLogs } from "../drizzle/schema_logs";
import { eq, desc } from "drizzle-orm";

export const logsRouter = router({
  // Get logs for an execution
  getByExecution: protectedProcedure
    .input(z.object({
      executionId: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        
        const logs = await db
          .select()
          .from(flowExecutionLogs)
          .where(eq(flowExecutionLogs.executionId, input.executionId))
          .orderBy(flowExecutionLogs.createdAt);

        return logs;
      } catch (error) {
        console.error("Error fetching execution logs:", error);
        return [];
      }
    }),

  // Get recent logs
  getRecent: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        
        const logs = await db
          .select()
          .from(flowExecutionLogs)
          .orderBy(desc(flowExecutionLogs.createdAt))
          .limit(input.limit);

        return logs;
      } catch (error) {
        console.error("Error fetching recent logs:", error);
        return [];
      }
    }),

  // Create log entry
  create: protectedProcedure
    .input(z.object({
      executionId: z.number(),
      nodeId: z.string(),
      nodeName: z.string(),
      nodeType: z.string(),
      status: z.enum(["started", "completed", "failed"]),
      input: z.string().optional(),
      output: z.string().optional(),
      error: z.string().optional(),
      duration: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        
        const log = await db
          .insert(flowExecutionLogs)
          .values({
            executionId: input.executionId,
            nodeId: input.nodeId,
            nodeName: input.nodeName,
            nodeType: input.nodeType,
            status: input.status,
            input: input.input,
            output: input.output,
            error: input.error,
            duration: input.duration,
          })
          .returning();

        return log[0];
      } catch (error) {
        console.error("Error creating log:", error);
        throw error;
      }
    }),
});
