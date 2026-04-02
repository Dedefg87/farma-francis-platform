import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc.js';
import { getDb } from './db.js';
import { customers as dbCustomers } from '../drizzle/schema.js';
import { like, or, eq, and, desc, sql } from 'drizzle-orm';
import type { Customer, CustomerContact } from '@shared/types/customers';

// Helper: Converte row do banco para Customer type
function mapDbCustomerToCustomer(row: any): Customer {
  // Split name em firstName/lastName (assumindo formato "Primeiro Ultimo")
  const nameParts = row.name?.trim().split(' ') || [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: String(row.id),
    externalId: String(row.id), // usando id como externalId (poderia ser UUID separado)
    firstName,
    lastName,
    fullName: row.name || '',
    email: row.email || null,
    phone: row.phone || null,
    avatarUrl: row.photoUrl || null,
    metadata: {},
    tags: [], // TODO: buscar tags do customer
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
    lastContactAt: null, // TODO: calcular a partir de interações
    totalConversations: 0, // TODO: contar conversas
    satisfactionScore: null, // TODO: média de pesquisas
  };
}

// Helper: Converte row do banco para CustomerContact type
function mapDbCustomerToContact(row: any, type: CustomerContact['type'] = 'phone'): CustomerContact {
  return {
    id: `contact_${row.id}_${type}`,
    customerId: String(row.id),
    type,
    value: type === 'phone' ? row.phone : (row.email || ''),
    isPrimary: true,
    isVerified: false,
    metadata: {},
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

export const customersRouter = router({
  // Listar clientes com paginação e filtros opcionais
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .output(
      z.object({
        customers: z.array(z.object({
          customer: z.object({
            id: z.string(),
            externalId: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            fullName: z.string(),
            email: z.string().nullable(),
            phone: z.string().nullable(),
            avatarUrl: z.string().nullable(),
            metadata: z.record(z.unknown()),
            tags: z.array(z.string()),
            createdAt: z.string(),
            updatedAt: z.string(),
            lastContactAt: z.string().nullable(),
            totalConversations: z.number(),
            satisfactionScore: z.number().nullable(),
          }),
          contacts: z.array(z.object({
            id: z.string(),
            customerId: z.string(),
            type: z.enum(['email', 'phone', 'whatsapp', 'telegram', 'sms', 'other']),
            value: z.string(),
            isPrimary: z.boolean(),
            isVerified: z.boolean(),
            metadata: z.record(z.unknown()),
            createdAt: z.string(),
            updatedAt: z.string(),
          })),
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

      const { page, pageSize, search, status } = input || {};
      const offset = (page - 1) * pageSize;

      // Build where clause
      const conditions: any[] = [];
      if (search) {
        conditions.push(
          or(
            like(dbCustomers.name, `%${search}%`),
            like(dbCustomers.phone, `%${search}%`),
            like(dbCustomers.email, `%${search}%`)
          )
        );
      }
      if (status) {
        conditions.push(eq(dbCustomers.status, status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Count total
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(dbCustomers)
        .where(whereClause)
        .limit(1);
      const total = Number(countResult[0].count) || 0;

      // Fetch data
      const results = await db
        .select({
          id: dbCustomers.id,
          name: dbCustomers.name,
          phone: dbCustomers.phone,
          email: dbCustomers.email,
          status: dbCustomers.status,
          photoUrl: dbCustomers.photoUrl,
          source: dbCustomers.source,
          notes: dbCustomers.notes,
          createdAt: dbCustomers.createdAt,
          updatedAt: dbCustomers.updatedAt,
        })
        .from(dbCustomers)
        .where(whereClause)
        .orderBy(desc(dbCustomers.createdAt))
        .limit(pageSize)
        .offset(offset);

      // Mapear para os tipos corretos
      const mappedCustomers = results.map(row => ({
        customer: mapDbCustomerToCustomer(row),
        contacts: [
          mapDbCustomerToContact(row, 'phone'),
          ...(row.email ? [mapDbCustomerToContact(row, 'email')] : []),
        ],
      }));

      return {
        customers: mappedCustomers,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // Buscar um cliente específico por ID
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .output(
      z.object({
        customer: z.object({
          id: z.string(),
          externalId: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          fullName: z.string(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          metadata: z.record(z.unknown()),
          tags: z.array(z.string()),
          createdAt: z.string(),
          updatedAt: z.string(),
          lastContactAt: z.string().nullable(),
          totalConversations: z.number(),
          satisfactionScore: z.number().nullable(),
        }),
        contacts: z.array(z.object({
          id: z.string(),
          customerId: z.string(),
          type: z.enum(['email', 'phone', 'whatsapp', 'telegram', 'sms', 'other']),
          value: z.string(),
          isPrimary: z.boolean(),
          isVerified: z.boolean(),
          metadata: z.record(z.unknown()),
          createdAt: z.string(),
          updatedAt: z.string(),
        })),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { id } = input;
      const customerId = Number(id);

      const result = await db
        .select({
          id: dbCustomers.id,
          name: dbCustomers.name,
          phone: dbCustomers.phone,
          email: dbCustomers.email,
          status: dbCustomers.status,
          photoUrl: dbCustomers.photoUrl,
          source: dbCustomers.source,
          notes: dbCustomers.notes,
          createdAt: dbCustomers.createdAt,
          updatedAt: dbCustomers.updatedAt,
        })
        .from(dbCustomers)
        .where(eq(dbCustomers.id, customerId))
        .limit(1);

      if (result.length === 0) {
        throw new Error('Customer not found');
      }

      const row = result[0];

      return {
        customer: mapDbCustomerToCustomer(row),
        contacts: [
          mapDbCustomerToContact(row, 'phone'),
          ...(row.email ? [mapDbCustomerToContact(row, 'email')] : []),
        ],
      };
    }),

  // Criar novo cliente
  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string().optional(),
        fullName: z.string().optional(),
        email: z.string().email().nullable(),
        phone: z.string().nullable(),
        avatarUrl: z.string().url().nullable(),
        metadata: z.record(z.unknown()).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .output(
      z.object({
        customer: z.object({
          id: z.string(),
          externalId: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          fullName: z.string(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          metadata: z.record(z.unknown()),
          tags: z.array(z.string()),
          createdAt: z.string(),
          updatedAt: z.string(),
          lastContactAt: z.string().nullable(),
          totalConversations: z.number(),
          satisfactionScore: z.number().nullable(),
        }),
        contacts: z.array(z.object({
          id: z.string(),
          customerId: z.string(),
          type: z.enum(['email', 'phone', 'whatsapp', 'telegram', 'sms', 'other']),
          value: z.string(),
          isPrimary: z.boolean(),
          isVerified: z.boolean(),
          metadata: z.record(z.unknown()),
          createdAt: z.string(),
          updatedAt: z.string(),
        })),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const now = new Date();
      const name = input.fullName || [input.firstName, input.lastName].filter(Boolean).join(' ');

      const [inserted] = await db
        .insert(dbCustomers)
        .values({
          name,
          phone: input.phone || '',
          email: input.email || null,
          photoUrl: input.avatarUrl || null,
          status: 'active',
          source: 'manual',
          notes: '',
          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id: dbCustomers.id,
          name: dbCustomers.name,
          phone: dbCustomers.phone,
          email: dbCustomers.email,
          photoUrl: dbCustomers.photoUrl,
          status: dbCustomers.status,
          source: dbCustomers.source,
          notes: dbCustomers.notes,
          createdAt: dbCustomers.createdAt,
          updatedAt: dbCustomers.updatedAt,
        });

      return {
        customer: mapDbCustomerToCustomer(inserted),
        contacts: [
          {
            id: `contact_${inserted.id}_phone`,
            customerId: String(inserted.id),
            type: 'phone',
            value: inserted.phone,
            isPrimary: true,
            isVerified: false,
            metadata: {},
            createdAt: inserted.createdAt.toISOString(),
            updatedAt: inserted.updatedAt.toISOString(),
          },
          ...(inserted.email ? [{
            id: `contact_${inserted.id}_email`,
            customerId: String(inserted.id),
            type: 'email',
            value: inserted.email,
            isPrimary: true,
            isVerified: false,
            metadata: {},
            createdAt: inserted.createdAt.toISOString(),
            updatedAt: inserted.updatedAt.toISOString(),
          }] : []),
        ],
      };
    }),

  // Atualizar cliente
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        fullName: z.string().optional(),
        email: z.string().email().nullable().optional(),
        phone: z.string().nullable().optional(),
        avatarUrl: z.string().url().nullable().optional(),
        metadata: z.record(z.unknown()).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .output(
      z.object({
        customer: z.object({
          id: z.string(),
          externalId: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          fullName: z.string(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          metadata: z.record(z.unknown()),
          tags: z.array(z.string()),
          createdAt: z.string(),
          updatedAt: z.string(),
          lastContactAt: z.string().nullable(),
          totalConversations: z.number(),
          satisfactionScore: z.number().nullable(),
        }),
        contacts: z.array(z.object({
          id: z.string(),
          customerId: z.string(),
          type: z.enum(['email', 'phone', 'whatsapp', 'telegram', 'sms', 'other']),
          value: z.string(),
          isPrimary: z.boolean(),
          isVerified: z.boolean(),
          metadata: z.record(z.unknown()),
          createdAt: z.string(),
          updatedAt: z.string(),
        })),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { id } = input;
      const customerId = Number(id);

      // Buscar cliente atual
      const existing = await db
        .select({
          id: dbCustomers.id,
          name: dbCustomers.name,
          phone: dbCustomers.phone,
          email: dbCustomers.email,
          photoUrl: dbCustomers.photoUrl,
          status: dbCustomers.status,
          source: dbCustomers.source,
          notes: dbCustomers.notes,
          createdAt: dbCustomers.createdAt,
          updatedAt: dbCustomers.updatedAt,
        })
        .from(dbCustomers)
        .where(eq(dbCustomers.id, customerId))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Customer not found');
      }

      const current = existing[0];
      const now = new Date();

      // Construir updates
      const updates: any = {
        updatedAt: now,
      };

      if (input.fullName !== undefined || input.firstName !== undefined || input.lastName !== undefined) {
        const firstName = input.fullName ? input.fullName.split(' ')[0] : (input.firstName || current.name.split(' ')[0]);
        const lastName = input.lastName !== undefined ? input.lastName : (input.fullName ? input.fullName.split(' ').slice(1).join(' ') : current.name.split(' ').slice(1).join(' '));
        updates.name = input.fullName || [firstName, lastName].filter(Boolean).join(' ');
      }

      if (input.email !== undefined) updates.email = input.email;
      if (input.phone !== undefined) updates.phone = input.phone;
      if (input.avatarUrl !== undefined) updates.photoUrl = input.avatarUrl;

      const [updated] = await db
        .update(dbCustomers)
        .set(updates)
        .where(eq(dbCustomers.id, customerId))
        .returning({
          id: dbCustomers.id,
          name: dbCustomers.name,
          phone: dbCustomers.phone,
          email: dbCustomers.email,
          photoUrl: dbCustomers.photoUrl,
          status: dbCustomers.status,
          source: dbCustomers.source,
          notes: dbCustomers.notes,
          createdAt: dbCustomers.createdAt,
          updatedAt: dbCustomers.updatedAt,
        });

      return {
        customer: mapDbCustomerToCustomer(updated),
        contacts: [
          mapDbCustomerToContact(updated, 'phone'),
          ...(updated.email ? [mapDbCustomerToContact(updated, 'email')] : []),
        ],
      };
    }),

  // Buscar clientes por nome, telefone ou email (mantido para compatibilidade)
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
      })
    )
    .output(
      z.array(
        z.object({
          id: z.string(),
          externalId: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          fullName: z.string(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          metadata: z.record(z.unknown()),
          tags: z.array(z.string()),
          createdAt: z.string(),
          updatedAt: z.string(),
          lastContactAt: z.string().nullable(),
          totalConversations: z.number(),
          satisfactionScore: z.number().nullable(),
        })
      )
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { query } = input;

      if (!query || query.length < 2) {
        return [];
      }

      const results = await db
        .select({
          id: dbCustomers.id,
          name: dbCustomers.name,
          phone: dbCustomers.phone,
          email: dbCustomers.email,
          status: dbCustomers.status,
          photoUrl: dbCustomers.photoUrl,
          source: dbCustomers.source,
          notes: dbCustomers.notes,
          createdAt: dbCustomers.createdAt,
          updatedAt: dbCustomers.updatedAt,
        })
        .from(dbCustomers)
        .where(
          or(
            like(dbCustomers.name, `%${query}%`),
            like(dbCustomers.phone, `%${query}%`),
            like(dbCustomers.email, `%${query}%`)
          )
        )
        .limit(10);

      return results.map(row => mapDbCustomerToCustomer(row));
    }),
});
