import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { executeAutomationWithSSE } from "./automation-sse";

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
});
