import { db } from "../db";
import {
  customers,
  conversations,
  conversationMessages,
  broadcastMembers,
  customerTags,
  guestList,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Normaliza número para comparação (remove +, espaços, traços)
 * Se for brasileiro (55) com 13 dígitos, remove o 9 após DDD
 */
export function normalizeToBaseNumber(phone: string): string {
  if (!phone) return "";

  let digits = phone.replace(/\D/g, '');

  if (!digits.startsWith('55')) {
    return digits;
  }

  if (digits.length === 13) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(5);
    digits = `55${ddd}${rest}`;
  }

  return digits;
}

export async function mergeDuplicateCustomers() {
  const logs: string[] = [];

  // 1. Buscar todos os clientes
  const allCustomers = await db.select().from(customers);

  // 2. Agrupar por número base
  const groups = new Map<string, typeof allCustomers>();

  for (const cust of allCustomers) {
    const baseNum = normalizeToBaseNumber(cust.phone);
    if (!baseNum) continue;

    if (!groups.has(baseNum)) {
      groups.set(baseNum, []);
    }
    groups.get(baseNum)!.push(cust);
  }

  // 3. Filtrar grupos com duplicatas
  const duplicateGroups = Array.from(groups.values()).filter(group => group.length > 1);

  logs.push(`🔍 Total de clientes: ${allCustomers.length}`);
  logs.push(`🔍 Grupos duplicados encontrados: ${duplicateGroups.length}`);

  let totalMerged = 0;
  let totalDeleted = 0;

  // 4. Processar cada grupo de duplicatas
  for (const group of duplicateGroups) {
    // Ordenar por ID (menor primeiro = mais antigo)
    group.sort((a, b) => a.id - b.id);

    const mainCustomer = group[0];
    const duplicates = group.slice(1);

    logs.push(`\n👤 Grupo ${mainCustomer.phone} (base: ${normalizeToBaseNumber(mainCustomer.phone)})`);
    logs.push(`   Main: ID ${mainCustomer.id} - ${mainCustomer.name}`);
    logs.push(`   Duplicados: ${duplicates.map(d => `ID ${d.id} - ${d.name}`).join(", ")}`);

    // 5. Para cada duplicata, transferir dados e deletar
    for (const dup of duplicates) {
      try {
        // 1. Transfere as conversas para o cliente principal
        await db.update(conversations)
          .set({ customerId: mainCustomer.id })
          .where(eq(conversations.customerId, dup.id));

        // 2. Transfere conversation_messages (se tiver customer_id)
        await db.update(conversationMessages)
          .set({ customerId: mainCustomer.id })
          .where(eq(conversationMessages.customerId, dup.id));

        // 3. Transfere tags, broadcast e guest list (se existirem no schema)
        if (customerTags) {
          await db.update(customerTags)
            .set({ customerId: mainCustomer.id })
            .where(eq(customerTags.customerId, dup.id));
        }
        if (broadcastMembers) {
          await db.update(broadcastMembers)
            .set({ customerId: mainCustomer.id })
            .where(eq(broadcastMembers.customerId, dup.id));
        }
        if (guestList) {
          await db.update(guestList)
            .set({ guestCustomerId: mainCustomer.id })
            .where(eq(guestList.guestCustomerId, dup.id));
        }

        // 4. Após transferir tudo, deleta o cliente duplicado
        await db.delete(customers)
          .where(eq(customers.id, dup.id));

        totalDeleted++;
        logs.push(`   ✅ Processado ID ${dup.id} - ${dup.name} → Main ID ${mainCustomer.id}`);
      } catch (err: any) {
        logs.push(`   ❌ Erro processar ID ${dup.id}: ${err.message}`);
      }
    }

    totalMerged += duplicates.length;
  }

  logs.push("\n✅ Limpeza concluída!");
  logs.push(`   Total mesclados: ${totalMerged}`);
  logs.push(`   Total deletados: ${totalDeleted}`);
  logs.push(`   Clientes restantes: ${allCustomers.length - totalDeleted}`);

  return {
    totalCustomers: allCustomers.length,
    duplicateGroups: duplicateGroups.length,
    totalMerged,
    totalDeleted,
    logs,
  };
}
