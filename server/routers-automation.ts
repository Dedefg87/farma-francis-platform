import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { executeAutomationWithSSE } from "./automation-sse";
import { db } from "./_core/db";
import { flowExecutions, visualFlows } from "@/drizzle/schema_executions";
import { and, gte, lte, sql, eq } from "drizzle-orm";

export const automationRouter = router({
  // Execute automation with SSE integration
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
        return result;
      } catch (error) {
        console.error("Automation execution error:", error);
        return { success: false, error: (error as Error).message };
      }
    }),

  // Test endpoint for SSE integration
  test: router({
    welcome: protectedProcedure
      .input((raw: unknown) => {
        return z
          .object({
            customerId: z.number(),
            context: z.record(z.string(), z.any()).optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        try {
          const result = await executeAutomationWithSSE({
            automationId: "welcome-message",
            templateType: "pharma",
            customerId: input.customerId,
            context: input.context,
          });
          return result;
        } catch (error) {
          console.error("Test welcome automation error:", error);
          return { success: false, error: (error as Error).message };
        }
      }),

    followUp2h: protectedProcedure
      .input((raw: unknown) => {
        return z
          .object({
            customerId: z.number(),
            context: z.record(z.string(), z.any()).optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        try {
          const result = await executeAutomationWithSSE({
            automationId: "follow-up-2h",
            templateType: "pharma",
            customerId: input.customerId,
            context: input.context,
          });
          return result;
        } catch (error) {
          console.error("Test follow-up 2h error:", error);
          return { success: false, error: (error as Error).message };
        }
      }),

    urgentNotification: protectedProcedure
      .input((raw: unknown) => {
        return z
          .object({
            customerId: z.number(),
            context: z.record(z.string(), z.any()).optional(),
          })
          .parse(raw);
      })
      .mutation(async ({ input }) => {
        try {
          const result = await executeAutomationWithSSE({
            automationId: "urgent-notification",
            templateType: "pharma",
            customerId: input.customerId,
            context: input.context,
          });
          return result;
        } catch (error) {
          console.error("Test urgent notification error:", error);
          return { success: false, error: (error as Error).message };
        }
      }),
  }),

  // Analytics and Statistics
  stats: protectedProcedure
    .input(z.object({
      period: z.enum(["today", "week", "month"]).default("today"),
    }))
    .query(async ({ input }) => {
      try {
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

        // Get total executions
        const executions = await db
          .select()
          .from(flowExecutions)
          .where(gte(flowExecutions.startedAt, startDate));

        const totalExecutions = executions.length;
        const successfulExecutions = executions.filter(e => e.status === "completed").length;
        const failedExecutions = executions.filter(e => e.status === "failed").length;

        // Calculate average duration
        const durationsWithValues = executions.filter(e => e.duration !== null && e.duration > 0);
        const avgDuration = durationsWithValues.length > 0
          ? Math.round(durationsWithValues.reduce((sum, e) => sum + (e.duration || 0), 0) / durationsWithValues.length / 1000)
          : 0;

        // Get flows with execution counts
        const flows = await db
          .select()
          .from(visualFlows);

        // Calculate conversions (placeholder - would need business logic)
        const conversions = Math.round(successfulExecutions * 0.15);
        const conversionRate = totalExecutions > 0 ? Math.round((conversions / totalExecutions) * 100) : 0;

        // Channel breakdown (mock for now - would need channel tracking)
        const whatsappExecutions = Math.round(totalExecutions * 0.7);
        const instagramExecutions = Math.round(totalExecutions * 0.3);

        return {
          totalExecutions,
          successfulExecutions,
          failedExecutions,
          avgResponseTime: avgDuration,
          totalConversations: totalExecutions,
          whatsappExecutions,
          instagramExecutions,
          conversions,
          conversionRate,
        };
      } catch (error) {
        console.error("Error fetching automation stats:", error);
        return {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          avgResponseTime: 0,
          totalConversations: 0,
          whatsappExecutions: 0,
          instagramExecutions: 0,
          conversions: 0,
          conversionRate: 0,
        };
      }
    }),
});
