import { z } from 'zod';
import { protectedProcedure, adminProcedure, router } from './_core/trpc.js';
import { getDb } from './db.js';
import { users as dbUsers } from '../drizzle/schema.js';
import { eq, like } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

export const employeesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        role: z.string().optional(),
      }).optional()
    )
    .output(
      z.object({
        employees: z.array(z.object({
          userId: z.number(),
          name: z.string(),
          email: z.string().nullable(),
          role: z.enum(['user', 'admin']),
          status: z.string(),
          department: z.string().nullable(),
          position: z.string().nullable(),
          cpf: z.string().nullable(),
          phone: z.string().nullable(),
          hireDate: z.string().nullable(),
          skills: z.array(z.string()),
          photoUrl: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string(),
        })),
        pagination: z.object({
          page: z.number(),
          pageSize: z.number(),
          total: z.number(),
          totalPages: z.number(),
        }),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { page, pageSize, search, role } = input || {};

      // Simple query: only users table
      let query = db.select({
        id: dbUsers.id,
        name: dbUsers.name,
        email: dbUsers.email,
        role: dbUsers.role,
        createdAt: dbUsers.createdAt,
        updatedAt: dbUsers.updatedAt,
      }).from(dbUsers);

      if (search) {
        query = query.where(or(like(dbUsers.name, `%${search}%`), like(dbUsers.email, `%${search}%`)));
      }
      if (role && ['user', 'admin'].includes(role)) {
        query = query.where(eq(dbUsers.role, role));
      }

      // Count total - just count the filtered result set size
      const allRows = await query;
      const total = allRows.length;

      // Pagination - apply limit/offset after count
      const offset = (page - 1) * pageSize;
      const rows = await query.orderBy(desc(dbUsers.createdAt)).limit(pageSize).offset(offset);

      const employees = rows.map(r => ({
        userId: r.id,
        name: r.name || '',
        email: r.email || null,
        role: r.role || 'user',
        status: 'active',
        department: null,
        position: null,
        cpf: null,
        phone: null,
        hireDate: null,
        skills: [],
        photoUrl: null,
        createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: r.updatedAt?.toISOString() || new Date().toISOString(),
      }));

      return { employees, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
    }),

  get: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .output(
      z.object({
        employee: z.object({
          userId: z.number(),
          name: z.string(),
          email: z.string().nullable(),
          role: z.enum(['user', 'admin']),
          status: z.string(),
          department: z.string().nullable(),
          position: z.string().nullable(),
          cpf: z.string().nullable(),
          phone: z.string().nullable(),
          hireDate: z.string().nullable(),
          skills: z.array(z.string()),
          photoUrl: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string(),
        }),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const res = await db.select({
        id: dbUsers.id,
        name: dbUsers.name,
        email: dbUsers.email,
        role: dbUsers.role,
        createdAt: dbUsers.createdAt,
        updatedAt: dbUsers.updatedAt,
      }).from(dbUsers).where(eq(dbUsers.id, input.userId)).limit(1);

      if (res.length === 0) throw new Error('Funcionário não encontrado');

      const r = res[0];
      return {
        employee: {
          userId: r.id,
          name: r.name || '',
          email: r.email || null,
          role: r.role || 'user',
          status: 'active',
          department: null,
          position: null,
          cpf: null,
          phone: null,
          hireDate: null,
          skills: [],
          photoUrl: null,
          createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: r.updatedAt?.toISOString() || new Date().toISOString(),
        },
      };
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['user', 'admin']).default('user'),
      })
    )
    .output(z.object({ success: z.boolean(), userId: z.number(), message: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const existing = await db.select().from(dbUsers).where(eq(dbUsers.email, input.email)).limit(1);
      if (existing.length > 0) throw new Error('Email já cadastrado');

      const passwordHash = await bcrypt.hash(input.password, 10);
      const [newUser] = await db.insert(dbUsers).values({
        openId: `email:${input.email}`,
        name: input.name,
        email: input.email,
        passwordHash,
        loginMethod: 'email',
        role: input.role,
      }).returning();

      if (!newUser) throw new Error('Falha ao criar funcionário');

      return { success: true, userId: newUser.id, message: 'Funcionário criado com sucesso' };
    }),

  update: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(['user', 'admin']).optional(),
        password: z.string().min(6).optional(),
      })
    )
    .output(z.object({ success: z.boolean(), message: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const existing = await db.select().from(dbUsers).where(eq(dbUsers.id, input.userId)).limit(1);
      if (existing.length === 0) throw new Error('Funcionário não encontrado');

      const updates: any = {};
      if (input.name) updates.name = input.name;
      if (input.email) updates.email = input.email;
      if (input.role) updates.role = input.role;
      if (input.password) updates.passwordHash = await bcrypt.hash(input.password, 10);
      if (Object.keys(updates).length > 0) updates.updatedAt = new Date();

      if (Object.keys(updates).length > 0) {
        await db.update(dbUsers).set(updates).where(eq(dbUsers.id, input.userId));
      }

      return { success: true, message: 'Funcionário atualizado com sucesso' };
    }),

  delete: adminProcedure
    .input(z.object({ userId: z.number() }))
    .output(z.object({ success: z.boolean(), message: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const existing = await db.select().from(dbUsers).where(eq(dbUsers.id, input.userId)).limit(1);
      if (existing.length === 0) throw new Error('Funcionário não encontrado');

      if (input.userId === 1) throw new Error('Não é possível excluir o administrador principal');

      await db.delete(dbUsers).where(eq(dbUsers.id, input.userId));

      return { success: true, message: 'Funcionário excluído com sucesso' };
    }),
});
