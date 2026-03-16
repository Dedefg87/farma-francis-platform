// =============================================
// ADMIN ROUTE: Merge Duplicate Customers
// =============================================
// ATENÇÃO: Esta rota é temporária e deve ser protegida em produção!
// Execute apenas uma vez para limpar duplicatas.

router.get("/admin/merge-duplicate-customers", async (req, res) => {
  try {
    const { db } = await import("../db");
    const {
      customers,
      conversations,
      conversationMessages,
      broadcastMembers,
      customerTags,
      guestList,
    } = await import("../drizzle/schema");
    const { sql } = await import("drizzle-orm");

    console.log("[Admin] 🔍 Iniciando merge de clientes duplicados...");

    // 1. Buscar todos os clientes
    const allCustomers = await db.select().from(customers);

    // 2. Função de normalização
    function normalizeToBaseNumber(phone: string): string {
      if (!phone) return "";
      let digits = phone.replace(/\D/g, '');
      if (!digits.startsWith('55')) return digits;
      if (digits.length === 13) {
        const ddd = digits.slice(2, 4);
        const rest = digits.slice(5);
        digits = `55${ddd}${rest}`;
      }
      return digits;
    }

    // 3. Agrupar por número base
    const groups = new Map<string, typeof allCustomers>();
    for (const cust of allCustomers) {
      const baseNum = normalizeToBaseNumber(cust.phone);
      if (!baseNum) continue;
      if (!groups.has(baseNum)) groups.set(baseNum, []);
      groups.get(baseNum)!.push(cust);
    }

    const duplicateGroups = Array.from(groups.values()).filter(g => g.length > 1);
    let totalMerged = 0;
    let totalDeleted = 0;
    const logs: string[] = [];

    const relatedTables = [
      { table: conversations, column: "customer_id", name: "conversations" },
      { table: conversationMessages, column: "customer_id", name: "conversation_messages" },
      { table: broadcastMembers, column: "customer_id", name: "broadcast_members" },
      { table: customerTags, column: "customer_id", name: "customer_tags" },
      { table: guestList, column: "guest_customer_id", name: "guest_list" },
    ];

    for (const group of duplicateGroups) {
      group.sort((a, b) => a.id - b.id);
      const mainCustomer = group[0];
      const duplicates = group.slice(1);

      logs.push(`\n👤 Grupo ${mainCustomer.phone} (base: ${normalizeToBaseNumber(mainCustomer.phone)})`);
      logs.push(`   Main: ID ${mainCustomer.id} - ${mainCustomer.name}`);
      logs.push(`   Duplicados: ${duplicates.map(d => `ID ${d.id} - ${d.name}`).join(", ")}`);

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

    console.log("[Admin] ✅ Merge finalizado");
    res.json({
      success: true,
      totalCustomers: allCustomers.length,
      duplicateGroups: duplicateGroups.length,
      totalMerged,
      totalDeleted,
      logs,
    });
  } catch (err: any) {
    console.error("[Admin] ❌ Erro:", err);
    res.status(500).json({ error: err.message, stack: process.env.NODE_ENV === "development" ? err.stack : undefined });
  }
});

// =============================================
// FIM DAS ROTAS DE BROADCAST
// =============================================