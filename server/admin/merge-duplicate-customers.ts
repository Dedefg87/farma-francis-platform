import { db } from "../db";
import {
  customers,
  conversations,
  conversationMessages,
  broadcastMembers,
  customerTags,
  guestList,
} from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

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
  
  // Tabelas que referenciam customers.id
  const relatedTables = [
    { table: conversations, column: "customer_id", name: "conversations" },
    { table: conversationMessages, column: "customer_id", name: "conversation_messages" },
    { table: broadcastMembers, column: "customer_id", name: "broadcast_members" },
    { table: customerTags, column: "customer_id", name: "customer_tags" },
    { table: guestList, column: "guest_customer_id", name: "guest_list" },
  ];
  
  // 4. Processar cada grupo de duplicatas
  for (const group of duplicateGroups) {
    // Ordenar por ID (menor primeiro = mais antigo)
    group.sort((a, b) => a.id - b.id);
    
    const mainCustomer = group[0];
    const duplicates = group.slice(1);
    
    logs.push(`\n👤 Grupo ${mainCustomer.phone} (base: ${normalizeToBaseNumber(mainCustomer.phone)})`);
    logs.push(`   Main: ID ${mainCustomer.id} - ${mainCustomer.name}`);
    logs.push(`   Duplicados: ${duplicates.map(d => `ID ${d.id} - ${d.name}`).join(", ")}`);
    
    // 5. Para cada tabela relacionada, atualizar customer_id
    for (const { table, column, name } of relatedTables) {
      for (const dup of duplicates) {
        try {
          const tableName = (table as any)._schema.tableName;
          const result = await db.execute(
            sql`UPDATE ${sql.raw(tableName)} SET ${sql.raw(column)} = ${mainCustomer.id} WHERE ${sql.raw(column)} = ${dup.id}`
          );
          if (result.affectedRows && result.affectedRows > 0) {
            logs.push(`   ↪ ${name}: ${result.affectedRows} registro(s) atualizado(s)`);
          }
        } catch (err: any) {
          logs.push(`   ❌ Erro ${name}: ${err.message}`);
        }
      }
    }
    
    // 6. Deletar clientes duplicados
    for (const dup of duplicates) {
      try {
        await db.delete(customers).where(eq(customers.id, dup.id));
        totalDeleted++;
        logs.push(`   🗑️ Deletado: ID ${dup.id} - ${dup.name}`);
      } catch (err: any) {
        logs.push(`   ❌ Erro deletar ID ${dup.id}: ${err.message}`);
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
