import { z } from 'zod';
import { protectedProcedure, adminProcedure, router } from './_core/trpc.js';
import { getDb } from './db.js';
import { users as dbUsers } from '../drizzle/schema.js';
import { eq, or, like, desc, sql } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

// Helper: Converte row do banco para Employee type (compatível com frontend)
function mapDbUserToEmployee(row: any) {
  return {
    userId: row.id,
    name: row.name || '',
    email: row.email || null,
    role: row.role || 'user',
    status: 'active', // users não tem status, assumimos active se existe
    department: null, // não existe ainda
    position: null,   // não existe ainda
    cpf: null,        // não existe ainda
    phone: null,      // não existe ainda
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

export const employeesRouter = router({
  // Listar funcionários com paginação e busca
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
      const offset = (page - 1) * pageSize;

      // Build where clause
      const conditions: any[] = [];
      if (search) {
        conditions.push(
          or(
            like(dbUsers.name, `%${search}%`),
            like(dbUsers.email, `%${search}%`)
          )
        );
      }
      if (role && ['user', 'admin'].includes(role)) {
        conditions.push(eq(dbUsers.role, role));
      }

      const whereClause = conditions.length > 0 ? sql`${conditions[0]}` : undefined;

      // Count total
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(dbUsers)
        .where(whereClause)
        .limit(1);
      const total = Number(countResult[0].count) || 0;

      // Fetch data
      const results = await db
        .select({
          id: dbUsers.id,
          name: dbUsers.name,
          email: dbUsers.email,
          role: dbUsers.role,
          createdAt: dbUsers.createdAt,
          updatedAt: dbUsers.updatedAt,
        })
        .from(dbUsers)
        .where(whereClause)
        .orderBy(desc(dbUsers.createdAt))
        .limit(pageSize)
        .offset(offset);

      const mappedEmployees = results.map(row => mapDbUserToEmployee(row));

      return {
        employees: mappedEmployees,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Buscar um funcionário específico por ID
  get: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
      })
    )
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
          createdAt: z.string(),
          updatedAt: z.string(),
        }),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const result = await db
        .select({
          id: dbUsers.id,
          name: dbUsers.name,
          email: dbUsers.email,
          role: dbUsers.role,
          createdAt: dbUsers.createdAt,
          updatedAt: dbUsers.updatedAt,
        })
        .from(dbUsers)
        .where(eq(dbUsers.id, input.userId))
        .limit(1);

      if (result.length === 0) {
        throw new Error('Funcionário não encontrado');
      }

      return {
        employee: mapDbUserToEmployee(result[0]),
      };
    }),

  // Criar novo funcionário
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        email: z.string().email('Email inválido'),
        password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
        role: z.enum(['user', 'admin']).default('user'),
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

      // Verificar se email já existe
      const existing = await db
        .select()
        .from(dbUsers)
        .where(eq(dbUsers.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new Error('Email já cadastrado');
      }

      // Hash da senha
      const passwordHash = await bcrypt.hash(input.password, 10);

      // openId único (pode ser email ou UUID)
      const openId = `email:${input.email}`;

      // Inserir novo usuário
      const [newUser] = await db.insert(dbUsers).values({
        openId,
        name: input.name,
        email: input.email,
        passwordHash,
        loginMethod: 'email',
        role: input.role,
      }).returning();

      if (!newUser) {
        throw new Error('Falha ao criar funcionário');
      }

      return {
        success: true,
        userId: newUser.id,
        message: 'Funcionário criado com sucesso',
      };
    }),

  // Atualizar funcionário
  update: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(['user', 'admin']).optional(),
        password: z.string().min(6).optional(), // se fornecida, atualiza senha
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verificar se usuário existe
      const existing = await db
        .select()
        .from(dbUsers)
        .where(eq(dbUsers.id, input.userId))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Funcionário não encontrado');
      }

      const updateData: any = {
        ...(input.name && { name: input.name }),
        ...(input.email && { email: input.email }),
        ...(input.role && { role: input.role }),
        updatedAt: new Date(),
      };

      // Se senha fornecida, hash e atualiza
      if (input.password) {
        updateData.passwordHash = await bcrypt.hash(input.password, 10);
      }

      await db
        .update(dbUsers)
        .set(updateData)
        .where(eq(dbUsers.id, input.userId));

      return {
        success: true,
        message: 'Funcionário atualizado com sucesso',
      };
    }),

  // Excluir funcionário
  delete: adminProcedure
    .input(
      z.object({
        userId: z.number(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verificar se usuário existe
      const existing = await db
        .select()
        .from(dbUsers)
        .where(eq(dbUsers.id, input.userId))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Funcionário não encontrado');
      }

      // Impedir exclusão do próprio admin (opcional, segurança)
      if (input.userId === 1) {
        throw new Error('Não é possível excluir o administrador principal');
      }

      await db.delete(dbUsers).where(eq(dbUsers.id, input.userId));

      return {
        success: true,
        message: 'Funcionário excluído com sucesso',
      };
    }),
});
