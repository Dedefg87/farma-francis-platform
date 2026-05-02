
import { getDb } from "../db";
import { 
  customers, 
  conversations, 
  conversationMessages, 
  receivedMessages, 
  leads, 
  tickets, 
  customerTreatments,
  customerTags,
  surveyResponses,
  broadcastListMembers,
  interactions,
  messages,
  attachments,
  notifications
} from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { normalizePhone } from "../utils/phone";

async function deduplicate() {
  console.log("[Deduplicate] Starting cleanup...");
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }

  // 1. Buscar todos os clientes
  const allCustomers = await db.select().from(customers);
  console.log(`[Deduplicate] Found ${allCustomers.length} total customers.`);

  const phoneMap = new Map<string, typeof allCustomers>();

  // 2. Agrupar por telefone normalizado
  for (const customer of allCustomers) {
    if (!customer.phone) continue;
    const normalized = normalizePhone(customer.phone);
    if (!normalized) continue;

    if (!phoneMap.has(normalized)) {
      phoneMap.set(normalized, []);
    }
    phoneMap.get(normalized)!.push(customer);
  }

  console.log(`[Deduplicate] Found ${phoneMap.size} unique normalized phone numbers.`);

  for (const [phone, records] of phoneMap.entries()) {
    if (records.length <= 1) continue;

    console.log(`[Deduplicate] Merging ${records.length} records for phone ${phone}`);

    // O primeiro registro será o "Master" (vencendo o que tiver ID menor ou data de criação mais antiga)
    const sorted = records.sort((a, b) => a.id - b.id);
    const master = sorted[0];
    const duplicates = sorted.slice(1);

    for (const dup of duplicates) {
      console.log(`  -> Merging duplicate ID ${dup.id} into master ID ${master.id}`);

      // Atualizar referências em todas as tabelas conhecidas
      // Nota: Algumas tabelas podem usar customer_id (snake_case) ou customerId (camelCase) no schema
      
      const tablesToUpdate = [
        { table: conversations, col: "customerId" },
        { table: receivedMessages, col: "customerId" },
        { table: leads, col: "customerId" },
        { table: tickets, col: "customerId" },
        { table: customerTreatments, col: "customerId" },
        { table: customerTags, col: "customerId" },
        { table: surveyResponses, col: "customerId" },
        { table: broadcastListMembers, col: "customerId" },
        { table: interactions, col: "customerId" },
        { table: messages, col: "customerId" },
        { table: attachments, col: "customerId" },
      ];

      for (const t of tablesToUpdate) {
        try {
          await db.update(t.table as any)
            .set({ [t.col]: master.id })
            .where(eq((t.table as any)[t.col], dup.id));
        } catch (e: unknown) {
          console.warn(`    ! Failed to update table ${t.table}: ${e.message}`);
        }
      }

      // Agora deletar o duplicado
      await db.delete(customers).where(eq(customers.id, dup.id));
    }
    
    // Garantir que o master tenha o telefone normalizado
    await db.update(customers).set({ phone }).where(eq(customers.id, master.id));
  }

  console.log("[Deduplicate] Cleanup finished.");
  process.exit(0);
}

deduplicate().catch(err => {
  console.error(err);
  process.exit(1);
});
