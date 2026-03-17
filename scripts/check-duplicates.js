import { getDb } from "./db";
import { customers } from "./drizzle/schema";

async function checkDuplicates() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  // Buscar todos os customers
  const allCustomers = await db.select().from(customers);
  console.log(`Total customers: ${allCustomers.length}`);

  // Agrupar por nome contendo "Anderson"
  const andersons = allCustomers.filter(c =>
    c.name.toLowerCase().includes("anderson")
  );
  console.log(`Customers com nome Anderson: ${andersons.length}`);

  // Mostrar detalhes
  for (const c of andersons) {
    console.log(`ID: ${c.id}, Nome: ${c.name}, Telefone: ${c.phone}`);
  }

  // Verificar se há números diferentes que pertencem ao mesmo contato
  const phoneMap = new Map<string, typeof andersons[0][]>();
  for (const c of andersons) {
    const normalized = c.phone.replace(/\D/g, '');
    const existing = phoneMap.get(normalized) || [];
    existing.push(c);
    phoneMap.set(normalized, existing);
  }

  console.log("\n--- Análise de normalização ---");
  for (const [phone, list] of phoneMap.entries()) {
    console.log(`Número ${phone}: ${list.length} registro(s)`);
    if (list.length > 1) {
      console.log(`  ⚠️ DUPLICADO! IDs: ${list.map(c => c.id).join(', ')}`);
    }
  }

  process.exit(0);
}

checkDuplicates().catch(err => {
  console.error(err);
  process.exit(1);
});
