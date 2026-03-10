import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { getDb } from "./db.js";
import {
  babyShowerEvents,
  babyShowerGiftPackages,
  babyShowerPurchases,
  babyShowerWithdrawals,
  customers,
  crmTasks,
  integrationSettings,
} from "../drizzle/schema";
import { eq, and, desc, asc, sql, inArray, SQL } from "drizzle-orm";

// Função para enviar WhatsApp via Evolution API
async function sendWhatsAppNotification(params: {
  phone: string;
  message: string;
}): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
    if (!db) {
      console.log("[BabyShower] Database not available");
      return false;
    }
    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    if (!config || !config.isActive) {
      console.log("[BabyShower] Evolution API not configured");
      return false;
    }

    const configData =
      typeof config.config === "string"
        ? JSON.parse(config.config)
        : config.config;

    const apiUrl = (configData.apiUrl as string)?.replace(/\/$/, "");
    const apiKey =
      (configData.apiKey as string) || (configData.accessToken as string);
    const instanceName = configData.instanceName as string;

    if (!apiUrl || !apiKey || !instanceName) {
      console.log("[BabyShower] Evolution config incomplete");
      return false;
    }

    const normalizedPhone = params.phone.replace(/\D/g, "");

    const response = await fetch(
      `${apiUrl}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: normalizedPhone,
          text: params.message,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("[BabyShower] Error sending WhatsApp:", error);
    return false;
  }
}

const generateEventCode = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 999).toString().padStart(3, "0");
  const code = `CHA${year}${month}${random}`;
  return code.trim();
};

const sanitizeUrl = (url: string): string => {
  return url.replace(/\s+/g, '').replace(/\n/g, '').trim();
};

const createEventSchema = z.object({
  motherCustomerId: z.number(),
  eventName: z.string().min(3).max(255),
  expectedDueDate: z.string().optional(),
  eventDate: z.string().optional(),
  targetAmount: z.number().optional(),
  welcomeMessage: z.string().optional(),
});

const createPackageSchema = z.object({
  eventId: z.number(),
  packageName: z.string().min(2).max(120),
  description: z.string().optional(),
  giftType: z.enum(["diapers", "wipes", "money", "product"]),
  quantityRepresented: z.number().default(1),
  sizeLabel: z.string().optional(),
  price: z.number().positive(),
  stockLimit: z.number().optional(),
  imageUrl: z.string().optional(),
});

const createPurchaseSchema = z.object({
  eventId: z.number(),
  packageId: z.number(),
  guestName: z.string().min(2).max(255),
  guestPhone: z.string().optional(),
  guestEmail: z.string().email().optional(),
  messageToParents: z.string().optional(),
  amountPaid: z.number().positive(),
});

const createWithdrawalSchema = z.object({
  eventId: z.number(),
  withdrawalType: z.enum(["diapers", "wipes", "money"]),
  diaperSize: z.string().optional(),
  quantity: z.number().positive(),
  deliveryMethod: z.enum(["pickup", "delivery"]).default("pickup"),
  notes: z.string().optional(),
});

export const babyShowerRouter = router({
  createEvent: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
      const eventCode = generateEventCode();
      const baseUrl = process.env.PUBLIC_BASE_URL || "https://innovative-enjoyment-production-ed8f.up.railway.app";
      const publicLink = `${baseUrl}/cha-de-bebe/${eventCode}`;

      // Validar e converter datas - string vazia deve ser null
      const expectedDueDate = input.expectedDueDate && input.expectedDueDate.trim() !== '' 
        ? input.expectedDueDate 
        : null;
      const eventDate = input.eventDate && input.eventDate.trim() !== '' 
        ? input.eventDate 
        : null;

      const [event] = await db.insert(babyShowerEvents).values({
        motherCustomerId: input.motherCustomerId,
        eventCode,
        eventName: input.eventName,
        expectedDueDate,
        eventDate,
        targetAmount: input.targetAmount?.toString() || null,
        publicLink,
        welcomeMessage: input.welcomeMessage || null,
      } as any);

      return { success: true, eventId: Number(event.insertId), eventCode, publicLink };
    }),

  listEvents: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "closed", "cancelled"]).optional(),
      motherCustomerId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
      
      const baseQuery = db.select({
        event: babyShowerEvents,
        motherName: customers.name,
        motherPhone: customers.phone,
      }).from(babyShowerEvents).leftJoin(customers, eq(babyShowerEvents.motherCustomerId, customers.id));

      if (input.status && input.motherCustomerId) {
        return await baseQuery
          .where(and(
            eq(babyShowerEvents.status, input.status),
            eq(babyShowerEvents.motherCustomerId, input.motherCustomerId)
          ))
          .orderBy(desc(babyShowerEvents.createdAt))
          .limit(input.limit)
          .offset(input.offset);
      } else if (input.status) {
        return await baseQuery
          .where(eq(babyShowerEvents.status, input.status))
          .orderBy(desc(babyShowerEvents.createdAt))
          .limit(input.limit)
          .offset(input.offset);
      } else if (input.motherCustomerId) {
        return await baseQuery
          .where(eq(babyShowerEvents.motherCustomerId, input.motherCustomerId))
          .orderBy(desc(babyShowerEvents.createdAt))
          .limit(input.limit)
          .offset(input.offset);
      }

      return await baseQuery
        .orderBy(desc(babyShowerEvents.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Endpoint público - sem autenticação
  getEventByCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) { throw new Error("Database not available"); }
      
      const [event] = await db.select({
        event: babyShowerEvents,
        motherName: customers.name,
      }).from(babyShowerEvents)
        .leftJoin(customers, eq(babyShowerEvents.motherCustomerId, customers.id))
        .where(eq(babyShowerEvents.eventCode, input.code))
        .limit(1);

      if (!event) throw new Error("Evento não encontrado");

      const packages = await db.select().from(babyShowerGiftPackages)
        .where(and(
          eq(babyShowerGiftPackages.eventId, event.event.id),
          eq(babyShowerGiftPackages.isActive, 1)
        ))
        .orderBy(asc(babyShowerGiftPackages.displayOrder), asc(babyShowerGiftPackages.id));

      return { event: event.event, motherName: event.motherName, packages };
    }),

  getEventById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
      const [event] = await db.select({
        event: babyShowerEvents,
        motherName: customers.name,
        motherPhone: customers.phone,
      }).from(babyShowerEvents).leftJoin(customers, eq(babyShowerEvents.motherCustomerId, customers.id))
        .where(eq(babyShowerEvents.id, input.id)).limit(1);

      if (!event) throw new Error("Evento não encontrado");

      const packages = await db.select().from(babyShowerGiftPackages)
        .where(eq(babyShowerGiftPackages.eventId, input.id))
        .orderBy(asc(babyShowerGiftPackages.displayOrder), asc(babyShowerGiftPackages.id));
      const purchases = await db.select().from(babyShowerPurchases)
        .where(eq(babyShowerPurchases.eventId, input.id))
        .orderBy(desc(babyShowerPurchases.createdAt));
      const withdrawals = await db.select().from(babyShowerWithdrawals)
        .where(eq(babyShowerWithdrawals.eventId, input.id));

      return { ...event, packages, purchases, withdrawals };
    }),

  updateEvent: protectedProcedure
    .input(z.object({
      id: z.number(),
      eventName: z.string().optional(),
      expectedDueDate: z.string().optional(),
      eventDate: z.string().optional(),
      targetAmount: z.number().optional(),
      status: z.enum(["active", "closed", "cancelled"]).optional(),
      whatsappNumber: z.string().optional(),
      welcomeMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
      const updates: any = {};
      if (input.eventName) updates.eventName = input.eventName;
      // Tratar strings vazias como null para campos DATE
      if (input.expectedDueDate !== undefined) {
        updates.expectedDueDate = input.expectedDueDate && input.expectedDueDate.trim() !== '' 
          ? input.expectedDueDate 
          : null;
      }
      if (input.eventDate !== undefined) {
        updates.eventDate = input.eventDate && input.eventDate.trim() !== '' 
          ? input.eventDate 
          : null;
      }
      if (input.targetAmount !== undefined) updates.targetAmount = input.targetAmount?.toString() || null;
      if (input.status) {
        updates.status = input.status;
        if (input.status === "closed") updates.closedAt = new Date();
      }
      if (input.whatsappNumber !== undefined) updates.whatsappNumber = input.whatsappNumber || null;
      if (input.welcomeMessage !== undefined) updates.welcomeMessage = input.welcomeMessage || null;

      await db.update(babyShowerEvents).set(updates).where(eq(babyShowerEvents.id, input.id));
      return { success: true };
    }),

  createPackage: protectedProcedure
    .input(createPackageSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
      const [pkg] = await db.insert(babyShowerGiftPackages).values({
        eventId: input.eventId,
        packageName: input.packageName,
        description: input.description || null,
        giftType: input.giftType,
        quantityRepresented: input.quantityRepresented,
        sizeLabel: input.sizeLabel || null,
        price: input.price.toString(),
        stockLimit: input.stockLimit || null,
        imageUrl: input.imageUrl || null,
      } as any);
      return { success: true, packageId: Number(pkg.insertId) };
    }),

  updatePackage: protectedProcedure
    .input(z.object({
      id: z.number(),
      packageName: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      imageUrl: z.string().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) { throw new Error("Database not available"); }
      
      // Build update using Drizzle's SQL template
      const conditions: SQL[] = [];
      
      if (input.packageName) {
        conditions.push(sql`package_name = ${input.packageName}`);
      }
      if (input.description !== undefined) {
        conditions.push(sql`description = ${input.description || null}`);
      }
      if (input.price !== undefined) {
        conditions.push(sql`price = ${input.price.toFixed(2)}`);
      }
      if (input.imageUrl !== undefined) {
        conditions.push(sql`image_url = ${input.imageUrl || null}`);
      }
      if (input.isActive !== undefined) {
        conditions.push(sql`is_active = ${input.isActive}`);
      }
      
      if (conditions.length === 0) {
        return { success: true };
      }
      
      // Join conditions with comma
      const setClause = sql.join(conditions, sql`, `);
      
      await db.execute(sql`
        UPDATE baby_shower_gift_packages 
        SET ${setClause}
        WHERE id = ${input.id}
      `);
      
      return { success: true };
    }),

  // Reordenar pacotes (drag-and-drop)
  reorderPackages: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      packageIds: z.array(z.number()), // Nova ordem de IDs
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) { throw new Error("Database not available"); }
      
      // Atualizar a ordem de cada pacote
      for (let i = 0; i < input.packageIds.length; i++) {
        await db.execute(sql`
          UPDATE baby_shower_gift_packages 
          SET display_order = ${i}
          WHERE id = ${input.packageIds[i]} AND event_id = ${input.eventId}
        `);
      }
      
      return { success: true };
    }),

  createPurchase: publicProcedure
    .input(createPurchaseSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
      const [pkg] = await db.select().from(babyShowerGiftPackages)
        .where(eq(babyShowerGiftPackages.id, input.packageId)).limit(1);

      if (!pkg) throw new Error("Pacote não encontrado");
      if (pkg.stockLimit && (pkg.soldCount ?? 0) >= pkg.stockLimit) throw new Error("Cotas esgotadas");

      const [purchase] = await db.insert(babyShowerPurchases).values({
        eventId: input.eventId,
        packageId: input.packageId,
        guestName: input.guestName,
        guestPhone: input.guestPhone || null,
        guestEmail: input.guestEmail || null,
        messageToParents: input.messageToParents || null,
        amountPaid: input.amountPaid.toString(),
        paymentStatus: "pending",
      } as any);

      return { success: true, purchaseId: Number(purchase.insertId) };
    }),

  confirmPayment: protectedProcedure
    .input(z.object({
      purchaseId: z.number(),
      paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]),
      paymentMethod: z.string().optional(),
      paymentReference: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
      const [purchase] = await db.select().from(babyShowerPurchases)
        .where(eq(babyShowerPurchases.id, input.purchaseId)).limit(1);
      if (!purchase) throw new Error("Compra não encontrada");

      await db.update(babyShowerPurchases).set({
        paymentStatus: input.paymentStatus,
        paymentMethod: input.paymentMethod || null,
        paymentReference: input.paymentReference || null,
        paidAt: input.paymentStatus === "paid" ? new Date() : null,
      }).where(eq(babyShowerPurchases.id, input.purchaseId));

      if (input.paymentStatus === "paid") {
        const [pkg] = await db.select().from(babyShowerGiftPackages)
          .where(eq(babyShowerGiftPackages.id, purchase.packageId)).limit(1);
        const [event] = await db.select().from(babyShowerEvents)
          .where(eq(babyShowerEvents.id, purchase.eventId)).limit(1);
        
        await db.update(babyShowerGiftPackages).set({
          soldCount: sql`${babyShowerGiftPackages.soldCount} + 1`,
        }).where(eq(babyShowerGiftPackages.id, purchase.packageId));

        await db.update(babyShowerEvents).set({
          walletBalance: sql`${babyShowerEvents.walletBalance} + ${purchase.amountPaid}`,
          totalGuests: sql`${babyShowerEvents.totalGuests} + 1`,
          totalDiapersCount: sql`${babyShowerEvents.totalDiapersCount} + ${pkg?.quantityRepresented || 1}`,
          availableDiapersCount: sql`${babyShowerEvents.availableDiapersCount} + ${pkg?.quantityRepresented || 1}`,
        }).where(eq(babyShowerEvents.id, purchase.eventId));

        // Notificar mãe via WhatsApp
        if (event) {
          const [mother] = await db.select().from(customers)
            .where(eq(customers.id, event.motherCustomerId)).limit(1);
          
          if (mother?.phone) {
            const message = `🎉 *Novo Presente para seu Chá de Bebê!*\n\n${purchase.guestName} acabou de presentear seu bebê com:\n📦 ${pkg?.packageName || "Um presente especial"}\n\nSua Carteira Virtual foi atualizada.\nTotal arrecadado: R$ ${event.walletBalance}\n\n_Obrigado por escolher a Farma Francis!_`;
            
            await sendWhatsAppNotification({
              phone: mother.phone,
              message,
            });

            // Marcar notificação como enviada
            await db.update(babyShowerPurchases).set({
              notificationSent: 1,
              notificationSentAt: new Date(),
            }).where(eq(babyShowerPurchases.id, input.purchaseId));
          }
        }
      }

      return { success: true };
    }),

  createWithdrawal: protectedProcedure
    .input(createWithdrawalSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
      const [event] = await db.select().from(babyShowerEvents)
        .where(eq(babyShowerEvents.id, input.eventId)).limit(1);
      if (!event) throw new Error("Evento não encontrado");
      if ((event.availableDiapersCount ?? 0) < input.quantity) throw new Error("Saldo insuficiente");

      const [mother] = await db.select({ name: customers.name })
        .from(customers).where(eq(customers.id, event.motherCustomerId)).limit(1);
      
      const taskTitle = `Separar ${input.quantity} ${input.diaperSize || ""} para ${mother?.name || "Mãe"} (Chá de Bebê)`;

      const [task] = await db.insert(crmTasks).values({
        title: taskTitle,
        description: `Tipo: ${input.withdrawalType} | Quantidade: ${input.quantity}`,
        status: "open",
        priority: "high",
        relatedEntityType: "baby_shower_withdrawal",
        createdBy: ctx.user?.id,
      } as any);

      const [withdrawal] = await db.insert(babyShowerWithdrawals).values({
        eventId: input.eventId,
        relatedTaskId: Number(task.insertId),
        withdrawalType: input.withdrawalType,
        diaperSize: input.diaperSize || null,
        quantity: input.quantity,
        deliveryMethod: input.deliveryMethod,
        notes: input.notes || null,
      } as any);

      await db.update(babyShowerEvents).set({
        availableDiapersCount: sql`${babyShowerEvents.availableDiapersCount} - ${input.quantity}`,
      }).where(eq(babyShowerEvents.id, input.eventId));

      return { success: true, withdrawalId: Number(withdrawal.insertId), taskId: Number(task.insertId) };
    }),

  getDashboardStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
    const [activeEvents] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(babyShowerEvents).where(eq(babyShowerEvents.status, "active"));
    const [totalSales] = await db.select({ total: sql<string>`COALESCE(SUM(${babyShowerPurchases.amountPaid}), 0)` })
      .from(babyShowerPurchases).where(eq(babyShowerPurchases.paymentStatus, "paid"));
    const [avgTicket] = await db.select({ avg: sql<string>`COALESCE(AVG(${babyShowerPurchases.amountPaid}), 0)` })
      .from(babyShowerPurchases).where(eq(babyShowerPurchases.paymentStatus, "paid"));

    return {
      activeEventsCount: activeEvents?.count || 0,
      totalSalesValue: parseFloat(totalSales?.total || "0"),
      averageTicket: parseFloat(avgTicket?.avg || "0"),
    };
  }),

  deleteEvent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) { throw new Error("Database not available"); }

      // Verificar se o evento existe
      const [event] = await db.select().from(babyShowerEvents)
        .where(eq(babyShowerEvents.id, input.id)).limit(1);

      if (!event) throw new Error("Evento não encontrado");

      // Pegar IDs dos packages do evento
      const packages = await db.select({ id: babyShowerGiftPackages.id })
        .from(babyShowerGiftPackages)
        .where(eq(babyShowerGiftPackages.eventId, input.id));

      const packageIds = packages.map((p) => p.id);

      // Deletar compras que referenciam os packages
      if (packageIds.length > 0) {
        await db.delete(babyShowerPurchases)
          .where(inArray(babyShowerPurchases.packageId, packageIds));
      }

      // Deletar retiradas relacionadas
      await db.delete(babyShowerWithdrawals)
        .where(eq(babyShowerWithdrawals.eventId, input.id));

      // Deletar pacotes de presentes
      await db.delete(babyShowerGiftPackages)
        .where(eq(babyShowerGiftPackages.eventId, input.id));

      // Deletar o evento
      await db.delete(babyShowerEvents)
        .where(eq(babyShowerEvents.id, input.id));

      return { success: true };
    }),
});
// Force rebuild 1772749799
// Build: 1772751251
// Build: 1772759501
