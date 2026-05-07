import { z } from 'zod';
import { protectedProcedure, adminProcedure, router } from './_core/trpc.js';
import { getDb } from './db.js';
import { users as dbUsers, employees as dbEmployees } from '../drizzle/schema.js';
import { eq, or, like, desc, leftJoin, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

export const employeesRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      search: z.string().optional().nullish(),
      role: z.string().optional().nullish(),
      status: z.string().optional().nullish(),
    }).nullish())
    .output(z.object({
      employees: z.array(z.object({
        userId: z.number(),
        username: z.string(),          // login name
        displayName: z.string(),       // name shown to agents
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
      pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() })
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const safeInput = (input && typeof input === 'object') ? input : {};
      const { page, pageSize, search, role, status } = safeInput;

      // Query: users LEFT JOIN employees
      let query = db.select({
        id: dbUsers.id,
        username: dbUsers.name, // name is the login username
        displayName: dbUsers.displayName,
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
      }).from(dbUsers).leftJoin(dbEmployees, eq(dbUsers.id, dbEmployees.userId));

      if (search) query = query.where(or(like(dbUsers.name, `%${search}%`), like(dbUsers.email, `%${search}%`), like(dbEmployees.cpf, `%${search}%`), like(dbEmployees.phone, `%${search}%`)));
      if (role && ['user', 'admin'].includes(role)) query = query.where(eq(dbUsers.role, role));
      if (status) query = query.where(eq(dbEmployees.status, status));

      // Count
      let countQ = db.select({ count: sql`COUNT(*)` }).from(dbUsers).leftJoin(dbEmployees, eq(dbUsers.id, dbEmployees.userId));
      if (search) countQ = countQ.where(or(like(dbUsers.name, `%${search}%`), like(dbUsers.email, `%${search}%`), like(dbEmployees.cpf, `%${search}%`), like(dbEmployees.phone, `%${search}%`)));
      if (role && ['user', 'admin'].includes(role)) countQ = countQ.where(eq(dbUsers.role, role));
      if (status) countQ = countQ.where(eq(dbEmployees.status, status));
      const countRes = await countQ.limit(1);
      const total = Number(countRes[0].count) || 0;

      // Pagination
      const effectivePage = page || 1;
      const effectivePageSize = pageSize || 20;
      const offset = (effectivePage - 1) * effectivePageSize;
      const rows = await query.orderBy(desc(dbUsers.createdAt)).limit(effectivePageSize).offset(offset);

      const employees = rows.map(r => ({
        userId: r.id,
        username: r.username || '',
        displayName: r.displayName || r.username || '',
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

      return { employees, pagination: { page: effectivePage, pageSize: effectivePageSize, total, totalPages: Math.ceil(total / effectivePageSize) } };
    }),

  get: protectedProcedure
    .input(z.object({ userId: z.number() }).nullish())
    .output(z.object({
      employee: z.object({
        userId: z.number(),
        username: z.string(),
        displayName: z.string(),
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
      })
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const userId = input?.userId;
      if (userId === undefined) throw new Error('userId obrigatório');

      const res = await db.select({
        id: dbUsers.id,
        username: dbUsers.name,
        displayName: dbUsers.displayName,
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
      }).from(dbUsers).leftJoin(dbEmployees, eq(dbUsers.id, dbEmployees.userId)).where(eq(dbUsers.id, userId)).limit(1);

      if (res.length === 0) throw new Error('Funcionário não encontrado');

      const r = res[0];
      return {
        employee: {
          userId: r.id,
          username: r.username || '',
          displayName: r.displayName || r.username || '',
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
    .input(z.object({
      username: z.string().min(1, 'Nome de usuário é obrigatório'),
      displayName: z.string().min(1, 'Nome de exibição é obrigatório'),
      password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
      role: z.enum(['user', 'admin']).default('user'),
    }).nullish())
    .output(z.object({ success: z.boolean(), userId: z.number(), message: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verificar se username já existe (campo name na tabela users) — raw SQL para evitar bind em LIMIT
      const rawResult = await db.execute(
        sql`SELECT id FROM users WHERE name = ${input.username} LIMIT 1`
      );
      const rows = (rawResult as any).rows ?? (rawResult as any)[0] ?? rawResult;
      const existing = Array.isArray(rows) ? rows : [rows];
      if (existing.length > 0) throw new Error('Nome de usuário já cadastrado');

      const passwordHash = await bcrypt.hash(input.password, 10);
      const openId = `local:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await db.insert(users).values({
        openId,
        name: input.username,
        displayName: input.displayName,
        email: null,
        passwordHash,
        loginMethod: 'local',
        role: input.role,
      });
      
      // SQLite: get last insert ID
      const lastIdResult = await db.get(sql`SELECT last_insert_rowid() as id`);
      const lastId = (lastIdResult as any)?.id;
      
      if (!lastId) throw new Error('Falha ao criar funcionário');
      
      // Fetch the new user
      const [newUser] = await db.select().from(users).where(eq(users.id, lastId)).limit(1);
      
      if (!newUser) throw new Error('Falha ao criar funcionário');
      
      return { success: true, userId: newUser.id, message: 'Funcionário criado com sucesso' };
    }),

  update: adminProcedure
    .input(z.object({
      userId: z.number(),
      username: z.string().optional().nullish(),
      displayName: z.string().optional().nullish(),
      role: z.enum(['user', 'admin']).optional().nullish(),
      password: z.string().min(6).optional().nullish(),
    }).nullish())
    .output(z.object({ success: z.boolean(), message: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      if (!input) throw new Error('Dados inválidos');
      const { userId, username, displayName, role, password } = input;

      const existing = await db.select().from(dbUsers).where(eq(dbUsers.id, userId)).limit(1);
      if (existing.length === 0) throw new Error('Funcionário não encontrado');

      const updates: unknown = {};
      if (username) updates.name = username;
      if (displayName !== undefined) updates.displayName = displayName;
      if (role) updates.role = role;
      if (password) updates.passwordHash = await bcrypt.hash(password, 10);
      if (Object.keys(updates).length > 0) updates.updatedAt = new Date();

      if (Object.keys(updates).length > 0) {
        await db.update(dbUsers).set(updates).where(eq(dbUsers.id, userId));
      }

      return { success: true, message: 'Funcionário atualizado com sucesso' };
    }),

  delete: adminProcedure
    .input(z.object({ userId: z.number() }).nullish())
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
