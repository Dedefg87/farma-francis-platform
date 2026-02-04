/**
 * Script de seed para popular banco de dados com dados de teste
 * Execução: node server/seed.mjs
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { users, tickets, messages, workflowExecutions, executionData, visualFlows } from '../drizzle/schema.js';

const sqlite = new Database(process.env.DATABASE_PATH || './data.db');
const db = drizzle(sqlite);

console.log('🌱 Iniciando seed do banco de dados...\n');

// Limpar dados existentes (opcional - comentar se quiser preservar)
// console.log('🗑️  Limpando dados existentes...');
// await db.delete(messages);
// await db.delete(tickets);
// await db.delete(workflowExecutions);
// await db.delete(executionData);
// await db.delete(visualFlows);

// 1. Criar usuários de teste (agentes)
console.log('👥 Criando usuários de teste...');
const testUsers = [
  {
    name: 'Maria Santos',
    email: 'maria.santos@farmafrancis.com',
    role: 'user',
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 dias atrás
  },
  {
    name: 'João Silva',
    email: 'joao.silva@farmafrancis.com',
    role: 'user',
    createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
  },
  {
    name: 'Ana Costa',
    email: 'ana.costa@farmafrancis.com',
    role: 'user',
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
  },
  {
    name: 'Carlos Oliveira',
    email: 'carlos.oliveira@farmafrancis.com',
    role: 'user',
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
];

for (const user of testUsers) {
  try {
    await db.insert(users).values(user);
    console.log(`  ✓ Criado: ${user.name}`);
  } catch (error) {
    console.log(`  ⚠ Usuário já existe: ${user.name}`);
  }
}

// Buscar IDs dos usuários criados
const allUsers = await db.select().from(users);
const agentIds = allUsers.filter(u => u.role === 'user').map(u => u.id);

if (agentIds.length === 0) {
  console.error('❌ Nenhum agente encontrado. Abortando seed.');
  process.exit(1);
}

// 2. Criar tickets de teste
console.log('\n🎫 Criando tickets de teste...');
const statuses = ['open', 'in_progress', 'closed'];
const priorities = ['low', 'medium', 'high', 'urgent'];
const ticketCount = 500; // Total de tickets a criar

for (let i = 0; i < ticketCount; i++) {
  const randomAgent = agentIds[Math.floor(Math.random() * agentIds.length)];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
  
  // Distribuir tickets ao longo dos últimos 90 dias
  const daysAgo = Math.floor(Math.random() * 90);
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  try {
    await db.insert(tickets).values({
      title: `Ticket de Teste #${i + 1}`,
      description: `Descrição do ticket de teste ${i + 1}`,
      status: randomStatus,
      priority: randomPriority,
      assignedTo: randomAgent,
      createdAt,
      updatedAt: createdAt,
    });
  } catch (error) {
    // Ignorar erros de duplicação
  }
}
console.log(`  ✓ ${ticketCount} tickets criados`);

// 3. Criar fluxos de automação de teste
console.log('\n🔄 Criando fluxos de automação...');
const testFlows = [
  {
    name: 'Boas-vindas WhatsApp',
    description: 'Fluxo de boas-vindas automático para novos clientes',
    isActive: true,
    nodes: JSON.stringify([
      { id: '1', type: 'trigger', data: { event: 'new_customer' } },
      { id: '2', type: 'message', data: { text: 'Bem-vindo!' } },
      { id: '3', type: 'delay', data: { seconds: 60 } },
      { id: '4', type: 'message', data: { text: 'Como posso ajudar?' } },
    ]),
    edges: JSON.stringify([
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '3', target: '4' },
    ]),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  },
  {
    name: 'Qualificação de Leads',
    description: 'Fluxo para qualificar leads automaticamente',
    isActive: true,
    nodes: JSON.stringify([
      { id: '1', type: 'trigger', data: { event: 'new_lead' } },
      { id: '2', type: 'condition', data: { field: 'budget', operator: '>', value: 1000 } },
      { id: '3', type: 'assign', data: { agent: 'senior' } },
      { id: '4', type: 'assign', data: { agent: 'junior' } },
    ]),
    edges: JSON.stringify([
      { source: '1', target: '2' },
      { source: '2', target: '3', condition: 'true' },
      { source: '2', target: '4', condition: 'false' },
    ]),
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  },
  {
    name: 'Follow-up Automático',
    description: 'Envio automático de follow-up após 3 dias',
    isActive: false,
    nodes: JSON.stringify([
      { id: '1', type: 'trigger', data: { event: 'ticket_closed' } },
      { id: '2', type: 'delay', data: { days: 3 } },
      { id: '3', type: 'message', data: { text: 'Como foi sua experiência?' } },
    ]),
    edges: JSON.stringify([
      { source: '1', target: '2' },
      { source: '2', target: '3' },
    ]),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
];

const flowIds = [];
for (const flow of testFlows) {
  try {
    const [inserted] = await db.insert(visualFlows).values(flow).returning();
    flowIds.push(inserted.id);
    console.log(`  ✓ Criado: ${flow.name}`);
  } catch (error) {
    console.log(`  ⚠ Fluxo já existe: ${flow.name}`);
  }
}

// 4. Criar execuções de fluxos
console.log('\n⚡ Criando execuções de fluxos...');
const executionStatuses = ['success', 'error', 'running'];
const executionCount = 200;

for (let i = 0; i < executionCount; i++) {
  if (flowIds.length === 0) break;
  
  const randomFlow = flowIds[Math.floor(Math.random() * flowIds.length)];
  const randomStatus = executionStatuses[Math.floor(Math.random() * executionStatuses.length)];
  const randomMode = ['manual', 'webhook', 'schedule'][Math.floor(Math.random() * 3)];
  
  const daysAgo = Math.floor(Math.random() * 30);
  const startedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const executionTime = randomStatus === 'running' ? null : Math.floor(Math.random() * 5000) + 500;
  const finishedAt = executionTime ? new Date(startedAt.getTime() + executionTime) : null;

  try {
    await db.insert(workflowExecutions).values({
      workflowId: randomFlow,
      status: randomStatus,
      mode: randomMode,
      startedAt,
      finishedAt,
      executionTime,
      error: randomStatus === 'error' ? 'Timeout na requisição HTTP' : null,
    });
  } catch (error) {
    // Ignorar erros
  }
}
console.log(`  ✓ ${executionCount} execuções criadas`);

console.log('\n✅ Seed concluído com sucesso!');
console.log('\n📊 Resumo:');
console.log(`  - ${testUsers.length} usuários/agentes`);
console.log(`  - ${ticketCount} tickets`);
console.log(`  - ${testFlows.length} fluxos de automação`);
console.log(`  - ${executionCount} execuções de fluxos`);

sqlite.close();
process.exit(0);
