import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { conversations } from "../drizzle/schema";
import { sql, desc } from "drizzle-orm";

export const clientsRouter = router({
  // Listar TODOS os clientes únicos de conversations
  list: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Buscar todas as conversas com customerPhone único
      const convs = await db
        .select({
          customerPhone: conversations.customerPhone,
          customerName: conversations.customerName,
          createdAt: conversations.createdAt,
          lastMessageAt: conversations.lastMessageAt,
        })
        .from(conversations)
        .where(sql`customerPhone IS NOT NULL`)
        .orderBy(desc(conversations.lastMessageAt));

      // Agrupar por telefone ( único )
      const uniqueMap = new Map<string, any>();
      convs.forEach((c) => {
        const phone = c.customerPhone;
        if (phone && !uniqueMap.has(phone)) {
          uniqueMap.set(phone, {
            id: phone, // usar telefone como ID
            name: c.customerName || `Cliente ${phone.slice(-4)}`,
            phone: phone,
            email: null,
            status: 'active',
            createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
            lastInteraction: c.lastMessageAt?.toISOString() || null,
            interactionsCount: 0, // será preenchido depois
          });
        }
      });

      // Contar interações por telefone
      const clients = Array.from(uniqueMap.values());
      
      // Para cada cliente, contar conversas
      for (const client of clients) {
        const count = convs.filter(c => c.customerPhone === client.phone).length;
        client.interactionsCount = count;
      }

      console.log(`[clients.list] Total de clientes únicos: ${clients.length}`);
      return clients;
    }),
});
// Build: Thu Apr 30 16:15:00 -03 2026 - Router novo para evitar cache
