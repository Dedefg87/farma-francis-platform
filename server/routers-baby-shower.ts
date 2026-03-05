import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { getDb } from "./db.js";
import {
  babyShowerEvents,
  babyShowerGiftPackages,
  babyShowerPurchases,
  babyShowerWithdrawals,
  babyShowerEventProducts,
  customers,
  crmTasks,
  integrationSettings,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Função para enviar WhatsApp via Evolution API
async function sendWhatsAppNotification(params: {
  phone: string;
  message: string;
}): Promise<boolean> {
  try {
    const db = await getDb();
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

const generateSlug = (eventName: string, eventCode: string) => {
  const sanitized = eventName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 30);
  return `${sanitized}-${eventCode}`.toLowerCase();
};

const sanitizeUrl = (url: string): string => {
  return url.replace(/\s+/g, "").replace(/\n/g, "").trim();
};

const createEventSchema = z.object({
  motherCustomerId: z.number(),
  eventName: z.string().min(3).max(255),
  expectedDueDate: z.string().optional(),
  eventDate: z.string().optional(),
  targetAmount: z.number().optional(),
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

// Schema para produtos do evento
const addEventProductSchema = z.object({
  eventId: z.number(),
  productEan: z.string().optional(),
  productName: z.string().min(2).max(255),
  quantity: z.number().default(1),
  price: z.number().positive(),
});

const reserveProductSchema = z.object({
  productId: z.number(),
  guestName: z.string().min(2).max(255),
  guestPhone: z.string().optional(),
  guestEmail: z.string().email().optional(),
  messageToParents: z.string().optional(),
});

const markAsPurchasedSchema = z.object({
  productId: z.number(),
  purchasedBy: z.string().optional(),
});

export const babyShowerRouter = router({
  // ============ EVENTOS ============
  createEvent: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const eventCode = generateEventCode();
      const slug = generateSlug(input.eventName, eventCode);
      const publicLink = `https://farmafrancis.com/cha-de-bebe/${slug}`;

      const [event] = await db.insert(babyShowerEvents).values({
        motherCustomerId: input.motherCustomerId,
        eventCode,
        eventName: input.eventName,
        expectedDueDate: input.expectedDueDate || null,
        eventDate: input.eventDate || null,
        targetAmount: input.targetAmount?.toString() || null,
        publicLink,
        slug,
      } as any);

      return { success: true, eventId: Number(event.insertId), eventCode, slug, publicLink };
    }),

  getEventBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();

      // Buscar evento pelo slug
      const [event] = await db
        .select({
          event: babyShowerEvents,
          motherName: customers.name,
          motherPhone: customers.phone,
        })
        .from(babyShowerEvents)
        .leftJoin(customers, eq(babyShowerEvents.motherCustomerId, customers.id))
        .where(eq(babyShowerEvents.slug, input.slug))
        .limit(1);

      if (!event) throw new Error("Evento não encontrado");

      // Buscar produtos do evento
      const products = await db
        .select()
        .from(babyShowerEventProducts)
        .where(eq(babyShowerEventProducts.eventId, event.event.id));

      // Buscar pacotes (cotas) do evento
      const packages = await db
        .select()
        .from(babyShowerGiftPackages)
        .where(eq(babyShowerGiftPackages.eventId as any, event.event.id));

      return {
        ...event,
        products,
        packages,
      };
    }),

  listEvents: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "closed", "cancelled"]).optional(),
        motherCustomerId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const baseQuery = db
        .select({
          event: babyShowerEvents,
          motherName: customers.name,
          motherPhone: customers.phone,
        })
        .from(babyShowerEvents)
        .leftJoin(
          customers,
          eq(babyShowerEvents.motherCustomerId, customers.id)
        );

      if (input.status && input.motherCustomerId) {
        return await baseQuery
          .where(
            and(
              eq(babyShowerEvents.status, input.status),
              eq(babyShowerEvents.motherCustomerId, input.motherCustomerId)
            )
          )
          .orderBy(desc(babyShowerEvents.createdAt))
          .limit(input.limit)
          .offset(input.offset);
      } else if (input.status) {
        return await baseQuery
          .where(eq(babyShowerEvents.status, input.status))
          .orderBy(desc(babyShowerEvents.createdAt