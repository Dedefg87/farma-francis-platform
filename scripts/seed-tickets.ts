/**
 * Seed script: Create sample tickets for Farma Francis platform
 * Run: npx tsx scripts/seed-tickets.ts
 */

importdotenv from 'dotenv';
import { db } from '../server/database/connection';
import { tickets } from '../server/database/schema.mysql';

dotenv.config({ path: '../.env' });

const sampleTickets = [
  {
    title: 'Problema com login no sistema',
    description: 'Cliente não consegue fazer login após trocar senha',
    status: 'open' as const,
    priority: 'high' as const,
    customerId: 1,
    assignedToId: 1,
    channel: 'whatsapp' as const,
  },
  {
    title: 'Dúvida sobre medicamento Losartana',
    description: 'Cliente quer saber efeitos colaterais da Losartana 50mg',
    status: 'in_progress' as const,
    priority: 'medium' as const,
    customerId: 2,
    assignedToId: 1,
    channel: 'chat' as const,
  },
  {
    title: 'Entrega atrasada - Pedido #123',
    description: 'Pedido de medicamentos controlados está há 3 dias sem atualização',
    status: 'pending' as const,
    priority: 'urgent' as const,
    customerId: 3,
    assignedToId: 2,
    channel: 'phone' as const,
  },
  {
    title: 'Erro ao gerar relatório de vendas',
    description: 'Sistema apresenta erro 500 ao tentar gerar relatório mensal',
    status: 'open' as const,
    priority: 'high' as const,
    customerId: 1,
    assignedToId: 1,
    channel: 'email' as const,
  },
  {
    title: 'Solicitação de cancelamento de pedido',
    description: 'Cliente solicitou cancelamento do pedido #456 antes da expedição',
    status: 'resolved' as const,
    priority: 'medium' as const,
    customerId: 4,
    assignedToId: 2,
    channel: 'whatsapp' as const,
  },
  {
    title: 'Problema na integração com Pix',
    description: 'Pagamentos Pix não estão sendo confirmados automaticamente',
    status: 'in_progress' as const,
    priority: 'urgent' as const,
    customerId: 5,
    assignedToId: 1,
    channel: 'chat' as const,
  },
  {
    title: 'Dúvida sobre validade de receitas',
    description: 'Cliente pergunta há quanto tempo uma receita de antibiótico é válida',
    status: 'closed' as const,
    priority: 'low' as const,
    customerId: 2,
    assignedToId: 2,
    channel: 'phone' as const,
  },
  {
    title: 'Erro 404 ao acessar página de produtos',
    description: 'Link enviado no WhatsApp leva para página não encontrada',
    status: 'resolved' as const,
    priority: 'high' as const,
    customerId: 6,
    assignedToId: 1,
    channel: 'whatsapp' as const,
  },
];

async function seedTickets() {
  console.log('🌱 Starting ticket seed...');

  try {
    // Check if tickets already exist
    const existing = await db.select({ count: db.$count(tickets) }).from(tickets);
    if (existing[0].count > 0) {
      console.log(`⚠️  Found ${existing[0].count} existing tickets. Skipping seed.`);
      return;
    }

    // Insert sample tickets
    await db.insert(tickets).values(sampleTickets);
    console.log(`✅ Successfully seeded ${sampleTickets.length} sample tickets!`);
    
    // Show stats
    const stats = await db
      .select({
        status: tickets.status,
        count: db.$count(tickets),
      })
      .from(tickets)
      .groupBy(tickets.status);

    console.log('\n📊 Ticket stats after seed:');
    stats.forEach(s => console.log(`  ${s.status}: ${s.count}`));
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedTickets();
