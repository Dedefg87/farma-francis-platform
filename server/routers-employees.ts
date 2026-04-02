import { z } from 'zod';
import { protectedProcedure, adminProcedure, router } from './_core/trpc.js';
import { getDb } from './db.js';
import { users as dbUsers, employees as dbEmployees } from '../drizzle/schema.js';
import { eq, or, like, desc, leftJoin } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

export const employeesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        role: z.string().optional(),
        status: z.string().optional(),
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

      const { page, pageSize, search, role, status } = input || {};

      // Base query: users LEFT JOIN employees
      let query = db
        .select({
          id: dbUsers.id,
          name: dbUsers.name,
          email: dbUsers.email,
          role: dbUsers.role,
          createdAt: dbUsers.createdAt,
          updatedAt: dbUsers.updatedAt,
          empStatus: dbEmployees.status,
          department: dbEmployees.department,
          position: dbEmployees.position,
          cpf: dbEmployees.cpf,
          phone: dbEmployees.phone,
          hireDate: dbEmployees.hireDate,
          skills: dbEmployees.skills,
          photoUrl: dbEmployees.photoUrl,
        })
        .from(dbUsers)
        .leftJoin(dbEmployees, eq(dbUsers.id, dbEmployees.userId));

      // Filters
      if (search) {
        query = query.where(
          or(
            like(dbUsers.name, `%${search}%`),
            like(dbUsers.email, `%${search}%`),
            like(dbEmployees.cpf, `%${search}%`),
            like(dbEmployees.phone, `%${search}%`)
          )
        );
      }
      if (role && ['user', 'admin'].includes(role)) {
        query = query.where(eq(dbUsers.role, role));
      }
      if (status) {
        query = query.where(eq(dbEmployees.status, status));
      }

      // Count
      let countQ = db.select({ count: sql`COUNT(*)` }).from(dbUsers).leftJoin(dbEmployees, eq(dbUsers.id, dbEmployees.userId));
      if (search) {
        countQ = countQ.where(or(like(dbUsers.name, `%${search}%`), like(dbUsers.email, `%${search}%`), like(dbEmployees.cpf, `%${search}%`), like(dbEmployees.phone, `%${search}%`)));
      }
      if (role && ['user', 'admin'].includes(role)) {
        countQ = countQ.where(eq(dbUsers.role, role));
      }
      if (status) {
        countQ = countQ.where(eq(dbEmployees.status, status));
      }
      const countRes = await countQ.limit(1);
      const total = Number(countRes[0].count) || 0;

      // Fetch
      const rows = await query.orderBy(desc(dbUsers.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
      const employees = rows.map(r => ({
        userId: r.id,
        name: r.name || '',
        email: r.email || null,
        role: r.role || 'user',
        status: r.empStatus || 'active',
        department: r.department || null,
        position: r.position || null,
        cpf: r.cpf || null,
        phone: r.phone || null,
        hireDate: r.hireDate?.toISOString() || null,
        skills: r.skills ? JSON.parse(r.skills) : [],
        photoUrl: r.photoUrl || null,
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

      const res = await db
        .select({
          id: dbUsers.id,
          name: dbUsers.name,
          email: dbUsers.email,
          role: dbUsers.role,
          createdAt: dbUsers.createdAt,
          updatedAt: dbUsers.updatedAt,
          empStatus: dbEmployees.status,
          department: dbEmployees.department,
          position: dbEmployees.position,
          cpf: dbEmployees.cpf,
          phone: dbEmployees.phone,
          hireDate: dbEmployees.hireDate,
          skills: dbEmployees.skills,
          photoUrl: dbEmployees.photoUrl,
        })
        .from(dbUsers)
        .leftJoin(dbEmployees, eq(dbUsers.id, dbEmployees.userId))
        .where(eq(dbUsers.id, input.userId))
        .limit(1);

      if (res.length === 0) throw new Error('Funcionário não encontrado');

      const r = res[0];
      return {
        employee: {
          userId: r.id,
          name: r.name || '',
          email: r.email || null,
          role: r.role || 'user',
          status: r.empStatus || 'active',
          department: r.department || null,
          position: r.position || null,
          cpf: r.cpf || null,
          phone: r.phone || null,
          hireDate: r.hireDate?.toISOString() || null,
          skills: r.skills ? JSON.parse(r.skills) : [],
          photoUrl: r.photoUrl || null,
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
        department: z.string().optional(),
        position: z.string().optional(),
        cpf: z.string().optional(),
        phone: z.string().optional(),
        status: z.enum(['active', 'inactive', 'vacation']).default('active'),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        userId: z.number(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const existing = await db.select().from(dbUsers).where(eq(dbUsers.email, input.email)).limit(1);
      if (existing.length > 0) throw new Error('Email já cadastrado');

      const passwordHash = await bcrypt.hash(input.password, 10);
      const openId = `email:${input.email}`;

      const [newUser] = await db.insert(dbUsers).values({
        openId,
        name: input.name,
        email: input.email,
        passwordHash,
        loginMethod: 'email',
        role: input.role,
      }).returning();

      if (!newUser) throw new Error('Falha ao criar funcionário');

      await db.insert(dbEmployees).values({
        userId: newUser.id,
        cpf: input.cpf || null,
        phone: input.phone || null,
        position: input.position || null,
        department: input.department || null,
        status: input.status,
        skills: null,
        hireDate: new Date(),
        photoUrl: null,
      });

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
        department: z.string().optional(),
        position: z.string().optional(),
        cpf: z.string().optional(),
        phone: z.string().optional(),
        status: z.enum(['active', 'inactive', 'vacation']).optional(),
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

      const empUpdates: any = {};
      if (input.department !== undefined) empUpdates.department = input.department;
      if (input.position !== undefined) empUpdates.position = input.position;
      if (input.cpf !== undefined) empUpdates.cpf = input.cpf;
      if (input.phone !== undefined) empUpdates.phone = input.phone;
      if (input.status !== undefined) empUpdates.status = input.status;
      if (Object.keys(empUpdates).length > 0) empUpdates.updatedAt = new Date();

      const empExists = await db.select().from(dbEmployees).where(eq(dbEmployees.userId, input.userId)).limit(1);
      if (empExists.length > 0) {
        if (Object.keys(empUpdates).length > 0) {
          await db.update(dbEmployees).set(empUpdates).where(eq(dbEmployees.userId, input.userId));
        }
      } else {
        await db.insert(dbEmployees).values({
          userId: input.userId,
          cpf: input.cpf || null,
          phone: input.phone || null,
          position: input.position || null,
          department: input.department || null,
          status: input.status || 'active',
          skills: null,
          hireDate: new Date(),
          photoUrl: null,
        });
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

      await db.delete(dbEmployees).where(eq(dbEmployees.userId, input.userId));
      await db.delete(dbUsers).where(eq(dbUsers.id, input.userId));

      return { success: true, message: 'Funcionário excluído com sucesso' };
    }),
});
