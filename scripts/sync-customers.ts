import { drizzle } from "drizzle-orm/mysql2";
import { eq, sql } from "drizzle-orm";
import * as schema from "./server/drizzle/schema";

async function syncCustomersFromConversations() {
  console.log("[Sync] Iniciando sincronização de clientes...");
  
  const db = drizzle(process.env.DATABASE_URL!, {
    schema: { ...schema },
    mode: "default",
  });

  try {
    // 1. Buscar todos os clientes únicos da tabela conversations
    const uniqueCustomers = await db
      .select({
        customerName: schema.conversations.customerName,
        customerPhone: schema.conversations.customerPhone,
      })
      .from(schema.conversations)
      .where(sql`customerPhone IS NOT NULL`)
      .groupBy(schema.conversations.customerPhone);

    console.log(`[Sync] Encontrados ${uniqueCustomers.length} clientes únicos em conversations`);

    // 2. Para cada cliente, inserir na tabela customers (se não existir)
    let inserted = 0;
    let skipped = 0;

    for (const customer of uniqueCustomers) {
      if (!customer.customerPhone) continue;

      // Verificar se já existe na tabela customers
      const existing = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.phone, customer.customerPhone))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Inserir novo cliente
      await db.insert(schema.customers).values({
        name: customer.customerName || `Cliente ${customer.customerPhone.slice(-4)}`,
        phone: customer.customerPhone,
        status: "active",
      });

      inserted++;
    }

    console.log(`[Sync] Concluído: ${inserted} inseridos, ${skipped} já existiam`);
  } catch (error) {
    console.error("[Sync] Erro:", error);
  } finally {
    process.exit(0);
  }
}

syncCustomersFromConversations();
