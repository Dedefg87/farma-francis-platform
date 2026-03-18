import { getDb } from "../server/db";
import { customers, conversations } from "../drizzle/schema";
import { like, or, eq } from "drizzle-orm";

(async () => {
  const db = await getDb();
  if (!db) { console.error("DB não disponível"); process.exit(1); }

  const clientes = await db
    .select({
      id: customers.id,
      nome: customers.name,
      telefone: customers.phone,
      criado_em: customers.createdAt,
    })
    .from(customers)
    .where(or(
      like(customers.phone, "%3182838332%"),
      like(customers.phone, "%553182838332%")
    ));

  console.log("CLIENTES:", JSON.stringify(clientes, null, 2));

  for (const c of clientes) {
    const convs = await db
      .select({
        id: conversations.id,
        status: conversations.status,
        canal: conversations.channel,
        nome_cliente: conversations.customerName,
        telefone_cliente: conversations.customerPhone,
        aberta_em: conversations.openedAt,
        ultima_msg: conversations.lastMessageAt,
        nao_lidas: conversations.unreadCount,
      })
      .from(conversations)
      .where(eq(conversations.customerId, c.id))
      .orderBy(conversations.id);
    console.log(`CONVERSAS cliente ${c.id} (${c.name}):`, JSON.stringify(convs, null, 2));
  }

  // Buscar também por customerPhone direto nas conversas
  const convsPorTel = await db
    .select({
      id: conversations.id,
      status: conversations.status,
      nome_cliente: conversations.customerName,
      telefone_cliente: conversations.customerPhone,
      aberta_em: conversations.openedAt,
      ultima_msg: conversations.lastMessageAt,
    })
    .from(conversations)
    .where(or(
      like(conversations.customerPhone, "%3182838332%"),
      like(conversations.customerPhone, "%553182838332%")
    ))
    .orderBy(conversations.id);
  console.log("CONVERSAS por telefone direto:", JSON.stringify(convsPorTel, null, 2));

  process.exit(0);
})();
