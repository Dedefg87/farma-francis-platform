import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { approvals } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { z } from "zod";

export const approvalsRouter = router({
  // List approvals (filtered by status)
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        entityType: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      let query = db.select().from(approvals);

      if (input.status) {
        query = query.where(eq(approvals.status, input.status));
      }
      if (input.entityType) {
        query = query.where(eq(approvals.entityType, input.entityType));
      }

      const results = await query.limit(input.limit).offset(input.offset);
      return results;
    }),

  // Request approval (create new approval record)
  request: protectedProcedure
    .input(
      z.object({
        entityType: z.string().min(1),
        entityId: z.number().int().positive(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [newApproval] = await db
        .insert(approvals)
        .values({
          entityType: input.entityType,
          entityId: input.entityId,
          requestedBy: ctx.user.id,
          reason: input.reason,
        })
        .$returningId();

      return { id: newApproval.insertId, message: "Approval request created" };
    }),

  // Approve (pharmacist or admin)
  approve: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Check if user can approve (admin or pharmacist role)
      if (ctx.user.role !== "admin") {
        return { error: "Unauthorized: Only admins can approve" };
      }

      await db
        .update(approvals)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          reason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(approvals.id, input.id));

      return { message: "Approval granted" };
    }),

  // Reject
  reject: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      if (ctx.user.role !== "admin") {
        return { error: "Unauthorized: Only admins can reject" };
      }

      await db
        .update(approvals)
        .set({
          status: "rejected",
          approvedBy: ctx.user.id,
          reason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(approvals.id, input.id));

      return { message: "Approval rejected" };
    }),
});
