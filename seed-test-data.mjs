import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

async function seed() {
  console.log('🌱 Iniciando seed de dados de teste...');

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });

  try {
    // 1. Criar clientes fictícios
    console.log('📝 Criando clientes...');
    const customers = await db.insert(schema.customers).values([
      {
        name: 'João Silva',
        phone: '11987654321',
        email: 'joao.silva@email.com',
        channel: 'whatsapp',
      },
      {
        name: 'Maria Santos',
        phone: '11976543210',
        email: 'maria.santos@email.com',
        channel: 'whatsapp',
      },
      {
        name: 'Pedro Oliveira',
        phone: '11965432109',
        email: 'pedro.oliveira@email.com',
        channel: 'instagram',
      },
      {
        name: 'Ana Costa',
        phone: '11954321098',
        email: 'ana.costa@email.com',
        channel: 'whatsapp',
      },
      {
        name: 'Carlos Ferreira',
        phone: '11943210987',
        email: 'carlos.ferreira@email.com',
        channel: 'instagram',
      },
    ]);
    console.log('✅ 5 clientes criados');

    // 2. Buscar IDs dos clientes criados
    const allCustomers = await db.select().from(schema.customers).limit(5);
    const customerIds = allCustomers.map(c => c.id);

    // 3. Criar conversas
    console.log('💬 Criando conversas...');
    const now = new Date();
    const conversations = [];
    
    for (let i = 0; i < customerIds.length; i++) {
      const openedAt = new Date(now.getTime() - (i + 1) * 3600000); // Cada conversa 1h mais antiga
      conversations.push({
        customerId: customerIds[i],
        channel: allCustomers[i].channel,
        status: i < 3 ? 'waiting' : 'assigned',
        openedAt: openedAt,
      });
    }

    await db.insert(schema.conversations).values(conversations);
    console.log('✅ 5 conversas criadas');

    // 4. Buscar IDs das conversas criadas
    const allConversations = await db.select().from(schema.conversations).limit(5);
    const conversationIds = allConversations.map(c => c.id);

    // 5. Criar mensagens
    console.log('📨 Criando mensagens...');
    const messages = [];
    
    for (let i = 0; i < conversationIds.length; i++) {
      const baseTime = allConversations[i].openedAt;
      
      // Mensagem do cliente
      messages.push({
        conversationId: conversationIds[i],
        senderId: customerIds[i],
        senderType: 'customer',
        content: `Olá! Gostaria de tirar uma dúvida sobre ${i % 2 === 0 ? 'medicamentos' : 'horário de funcionamento'}.`,
        sentAt: new Date(baseTime.getTime() + 1000),
      });

      // Resposta do agente (se conversa atribuída)
      if (allConversations[i].status === 'assigned') {
        messages.push({
          conversationId: conversationIds[i],
          senderId: 1, // Assumindo que existe um agente com ID 1
          senderType: 'agent',
          content: 'Olá! Claro, estou aqui para ajudar. Como posso auxiliar você?',
          sentAt: new Date(baseTime.getTime() + 60000),
        });

        // Resposta do cliente
        messages.push({
          conversationId: conversationIds[i],
          senderId: customerIds[i],
          senderType: 'customer',
          content: 'Obrigado! Preciso saber se vocês têm esse produto em estoque.',
          sentAt: new Date(baseTime.getTime() + 120000),
        });
      }
    }

    await db.insert(schema.conversationMessages).values(messages);
    console.log(`✅ ${messages.length} mensagens criadas`);

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log(`📊 Resumo:`);
    console.log(`   - ${customerIds.length} clientes`);
    console.log(`   - ${conversationIds.length} conversas`);
    console.log(`   - ${messages.length} mensagens`);

  } catch (error) {
    console.error('❌ Erro durante seed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed();
