import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL não definida');
  process.exit(1);
}

const db = drizzle(dbUrl);

async function diagnose() {
  console.log('🔍 Diagnóstico do Sistema de Notificações\n');

  // 1. Verificar configuração da Evolution API
  console.log('1. Configuração da Evolution API:');
  const configs = await db.select().from(schema.integrationSettings).where(eq(schema.integrationSettings.integrationType, 'evolution_api'));
  if (configs.length === 0) {
    console.log('   ❌ Nenhuma configuração encontrada');
  } else {
    const config = configs[0];
    console.log(`   ✅ Config encontrada (ID: ${config.id})`);
    console.log(`   - Ativa: ${config.isActive ? 'SIM' : 'NÃO'}`);
    const cfg = typeof config.config === 'string' ? JSON.parse(config.config) : config.config;
    console.log(`   - URL: ${cfg.apiUrl}`);
    console.log(`   - Instância: ${cfg.instanceName}`);
    console.log(`   - API Key: ${cfg.apiKey ? '✅ Presente' : '❌ Ausente'}`);
  }

  // 2. Verificar compras recentes e status de notificação
  console.log('\n2. Últimas 5 compras:');
  const purchases = await db.select({
    id: schema.babyShowerPurchases.id,
    guestName: schema.babyShowerPurchases.guestName,
    paymentStatus: schema.babyShowerPurchases.paymentStatus,
    notificationSent: schema.babyShowerPurchases.notificationSent,
    confirmationToken: schema.babyShowerPurchases.confirmationToken,
  }).from(schema.babyShowerPurchases).orderBy(schema.babyShowerPurchases.createdAt.desc()).limit(5);

  purchases.forEach(p => {
    console.log(`   - Compra #${p.id}: ${p.guestName} | Status: ${p.paymentStatus} | Notificação: ${p.notificationSent ? 'ENVIADA' : 'NÃO ENVIADA'}`);
  });

  // 3. Verificar eventos e números dos pais
  console.log('\n3. Eventos e contatos dos pais:');
  const events = await db.select({
    event: schema.babyShowerEvents,
    motherPhone: schema.customers.phone,
    motherName: schema.customers.name,
  }).from(schema.babyShowerEvents)
    .leftJoin(schema.customers, eq(schema.babyShowerEvents.motherCustomerId, schema.customers.id))
    .limit(5);

  events.forEach(e => {
    const hasPhone = e.motherPhone ? '✅' : '❌';
    console.log(`   - Evento #${e.event.id}: ${e.event.eventName} | Pais: ${e.motherName || 'N/A'} | Telefone: ${e.motherPhone || 'N/A'} ${hasPhone}`);
  });

  console.log('\n✅ Diagnóstico completo');
}

diagnose().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
