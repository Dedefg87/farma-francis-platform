import { db } from "../db";
import { sql } from "drizzle-orm";

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
  const allCustomers = await db.select().from("customers");

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
        // Fazemos try/catch individuais para não quebrar caso alguma dessas tabelas não exista no seu banco
        try { await db.execute(sql`UPDATE conversations SET customer_id = ${mainCustomer.id} WHERE customer_id = ${dup.id}`); } catch(e){}
        try { await db.execute(sql`UPDATE broadcast_members SET customer_id = ${mainCustomer.id} WHERE customer_id = ${dup.id}`); } catch(e){}
        try { await db.execute(sql`UPDATE customer_tags SET customer_id = ${mainCustomer.id} WHERE customer_id = ${dup.id}`); } catch(e){}
        try { await db.execute(sql`UPDATE guest_list SET guest_customer_id = ${mainCustomer.id} WHERE guest_customer_id = ${dup.id}`); } catch(e){}

        // Após transferir os vínculos, deleta o cliente duplicado
        await db.execute(sql`DELETE FROM customers WHERE id = ${dup.id}`);

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
