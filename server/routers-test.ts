import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { users as dbUsers, employees as dbEmployees } from "../drizzle/schema";
import { sql } from "drizzle-orm";

export const testRouter = router({
  echo: publicProcedure
    .input(z.object({ msg: z.string() }))
    .mutation(({ input }) => {
      return { received: input.msg, timestamp: new Date().toISOString() };
    }),

  // Diagnóstico: retorna contagens de usuários e employees
  counts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [usersCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(dbUsers);
    const [employeesCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(dbEmployees);
    const [rows] = await db.execute(sql`
      SELECT u.id, u.name, u.role, e.status as empStatus
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      ORDER BY u.id DESC
      LIMIT 5
    `);

    return {
      totalUsers: Number(usersCount.count),
      totalEmployees: Number(employeesCount.count),
      sampleRows: rows,
    };
  }),
});
