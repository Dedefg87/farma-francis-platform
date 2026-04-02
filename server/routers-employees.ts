import { z } from 'zod';
import { protectedProcedure, adminProcedure, router } from './_core/trpc.js';
import { getDb } from './db.js';
import { users as dbUsers, employees as dbEmployees } from '../drizzle/schema.js';
import { eq, or, like, desc, sql, leftJoin } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

// Helper: Converte row do banco (JOIN users + employees) para Employee type completo
function mapDbToEmployee(row: any) {
  const user = row.users || {};
  const employee = row.employees || {};

  return {
    userId: user.id,
    name: user.name || '',
    email: user.email || null,
    role: user.role || 'user',
    status: employee.status || 'active',
    department: employee.department || null,
    position: employee.position || null,
    cpf: employee.cpf || null,
    phone: employee.phone || null,
    hireDate: employee.hireDate?.toISOString() || null,
    skills: employee.skills ? JSON.parse(employee.skills) : [],
    photoUrl: employee.photoUrl || null,
    createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

export const employeesRouter = router({
  // Listar funcionários com paginação e busca (JOIN users + employees)
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
      const offset = (page - 1) * pageSize;

      // Build JOIN query base: users LEFT JOIN employees
      let baseQuery = db
        .select({
          id: dbUsers.id,
          name: dbUsers.name,
          email: dbUsers.email,
          role: dbUsers.role,
          createdAt: dbUsers.createdAt,
          updatedAt: dbUsers.updatedAt,
          employeeStatus: dbEmployees.status,
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

      // Apply filters
      if (search) {
        baseQuery = baseQuery.where(
          or(
            like(dbUsers.name, `%${search}%`),
            like(dbUsers.email, `%${search}%`),
            like(dbEmployees.cpf, `%${search}%`),
            like(dbEmployees.phone, `%${search}%`)
          )
        );
      }
      if (role && ['user', 'admin'].includes(role)) {
        baseQuery = baseQuery.where(eq(dbUsers.role, role));
      }
      if (status) {
        baseQuery = baseQuery.where(eq(dbEmployees.status, status));
      }

      // Count total
      let countQuery = db
        .select({ count: sql<number>`COUNT(*)` })
        .from(dbUsers)
        .leftJoin(dbEmployees, eq(dbUsers.id, dbEmployees.userId));

      if (search) {
        countQuery = countQuery.where(
          or(
            like(dbUsers.name, `%${search}%`),
            like(dbUsers.email, `%${search}%`),
            like(dbEmployees.cpf, `%${search}%`),
            like(dbEmployees.phone, `%${search}%`)
          )
        );
      }
      if (role && ['user', 'admin'].includes(role)) {
        countQuery = countQuery.where(eq(dbUsers.role, role));
      }
      if (status) {
        countQuery = countQuery.where(eq(dbEmployees.status, status));
      }

      const countResult = await countQuery.limit(1);
      const total = Number(countResult[0].count) || 0;

      // Fetch data
      const results = await baseQuery
        .orderBy(desc(dbUsers.createdAt))
        .limit(pageSize)
        .offset(offset);

      const mappedEmployees = results.map(row => mapDbToEmployee(row));

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

  // Buscar um funcionário específico por ID (completo)
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

      const result = await db
        .select({
          id: dbUsers.id,
          name: dbUsers.name,
          email: dbUsers.email,
          role: dbUsers.role,
          createdAt: dbUsers.createdAt,
          updatedAt: dbUsers.updatedAt,
          employeeStatus: dbEmployees.status,
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

      if (result.length === 0) {
        throw new Error('Funcionário não encontrado');
      }

      return {
        employee: mapDbToEmployee(result[0]),
      };
    }),

  // Criar novo funcionário (cria user + employee)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        email: z.string().email('Email inválido'),
        password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
        role: z.enum(['user', 'admin']).default('user'),
        // Campos extras de employee (opcionais)
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
      const openId = `email:${input.email}`;

      // Transação: criar user + employee
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

      // Criar registro na tabela employees
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

      return {
        success: true,
        userId: newUser.id,
        message: 'Funcionário criado com sucesso',
      };
    }),

  // Atualizar funcionário (atualiza user + employee)
  update: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(['user', 'admin']).optional(),
        password: z.string().min(6).optional(),
        // Campos de employee
        department: z.string().optional(),
        position: z.string().optional(),
        cpf: z.string().optional(),
        phone: z.string().optional(),
        status: z.enum(['active', 'inactive', 'vacation']).optional(),
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

      // Atualizar users
      const userUpdateData: any = {};
      if (input.name) userUpdateData.name = input.name;
      if (input.email) userUpdateData.email = input.email;
      if (input.role) userUpdateData.role = input.role;
      if (input.password) {
        userUpdateData.passwordHash = await bcrypt.hash(input.password, 10);
      }
      if (Object.keys(userUpdateData).length > 0) {
        userUpdateData.updatedAt = new Date();
        await db
          .update(dbUsers)
          .set(userUpdateData)
          .where(eq(dbUsers.id, input.userId));
      }

      // Atualizar employees (se existir, senão insere)
      const existingEmployee = await db
        .select()
        .from(dbEmployees)
        .where(eq(dbEmployees.userId, input.userId))
        .limit(1);

      const employeeData: any = {};
      if (input.department !== undefined) employeeData.department = input.department;
      if (input.position !== undefined) employeeData.position = input.position;
      if (input.cpf !== undefined) employeeData.cpf = input.cpf;
      if (input.phone !== undefined) employeeData.phone = input.phone;
      if (input.status !== undefined) employeeData.status = input.status;
      if (Object.keys(employeeData).length > 0) {
        employeeData.updatedAt = new Date();
      }

      if (existingEmployee.length > 0) {
        if (Object.keys(employeeData).length > 0) {
          await db
            .update(dbEmployees)
            .set(employeeData)
            .where(eq(dbEmployees.userId, input.userId));
        }
      } else {
        // Criar registro employees se não existir
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

      return {
        success: true,
        message: 'Funcionário atualizado com sucesso',
      };
    }),

  // Excluir funcionário (deleta employees + users)
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

      // Impedir exclusão do admin principal
      if (input.userId === 1) {
        throw new Error('Não é possível excluir o administrador principal');
      }

      // Deletar employees primeiro (foreign key com cascade deve funcionar, mas garantimos ordem)
      await db.delete(dbEmployees).where(eq(dbEmployees.userId, input.userId));
      await db.delete(dbUsers).where(eq(dbUsers.id, input.userId));

      return {
        success: true,
        message: 'Funcionário excluído com sucesso',
      };
    }),
});
