import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import {
  agentStatus,
  broadcastLists,
  broadcastListMembers,
  broadcastMessages,
  broadcastMembersSent,
  conversations,
  conversationMessages,
  customers,
  queues,
  agentPauses,
  integrationSettings,
  processedWebhookMessages,
  receivedMessages,
  users,
} from "../drizzle/schema";
import {
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  router,
} from "./_core/trpc";
import jwt from "jsonwebtoken";

// System health
export const systemRouter = router({
  health: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),
});

// Auth (login, logout, me)
export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const [user] = await users
        .select()
        .where(eq(users.email, input.email))
        .limit(1);

      // 1. Verifica se o usuário existe
      if (!user) {
        throw new Error("Credenciais inválidas");
      }

      // 2. Compara a senha digitada com o Hash salvo no banco usando bcrypt
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new Error("Credenciais inválidas");
      }

      // 3. Gera o token se estiver tudo certo
      const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
      return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }),

  logout: publicProcedure.mutation(() => {
    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await users.select().where(eq(users.id, ctx.user.id)).limit(1);
    if (!user) throw new Error("User not found");
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }),
});
// Queues
export const queuesRouter = router({
  list: protectedProcedure.query(async () => {
    return await queues.select().orderBy(queues.priority);
  }),
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [q] = await queues.select().where(eq(queues.id, input.id)).limit(1);
      return q;
    }),
});
