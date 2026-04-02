import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users, conversations } from '../drizzle/schema';

async function verifyAgentsTable() {
  const url = process.env.DATABASE_URL!;
  const urlObj = new URL(url);
  const pool = mysql.createPool({
    host: urlObj.hostname,
    user: urlObj.username,
    password: urlObj.password,
    database: urlObj.pathname.slice(1),
    port: parseInt(urlObj.port),
    waitForConnections: true,
    connectionLimit: 1,
    charset: 'utf8mb4',
    timezone: 'Z',
  });

  const db = drizzle(pool);

  console.log('# 🔍 Verificação de Tabela "agents" vs "users"\n');

  // Verificar se existe tabela agents
  try {
    const [[tables]] = await pool.query("SHOW TABLES LIKE 'agents'");
    console.log(`## Tabela "agents" existe?`);
    console.log(tables ? '✅ SIM' : '❌ NÃO');

    if (!tables) {
      console.log('\n**Conclusão**: A tabela de agentes é `users` (com role="user").');
    }
  } catch (e) {
    console.log('Erro ao verificar tabela agents:', e.message);
  }

  // Contar agentes ativos
  console.log('\n## Agentes ativos (users com role="user")\n');
  const [agentCountResult] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'user'");
  const agentCount = agentCountResult[0].count;
  console.log(`Agentes (role='user'): **${agentCount}**`);

  // Listar agentes com suas conversas
  console.log('\n### Agentes e quantidades de conversas:\n');
  const [agentStats] = await pool.query(`
    SELECT
      u.id as agentId,
      u.name as agentName,
      COUNT(c.id) as convCount
    FROM users u
    LEFT JOIN conversations c ON u.id = c.assigned_to
    WHERE u.role = 'user'
    GROUP BY u.id, u.name
    ORDER BY convCount DESC
  `);
  console.log('| Agente ID | Nome | Conversas |');
  console.log('|-----------|------|-----------|');
  for (const row of agentStats as any[]) {
    console.log(`| ${row.agentId || 'NULL'} | ${row.agentName || '(sem nome)'} | ${row.convCount} |`);
  }

  await pool.end();
}

verifyAgentsTable().catch(console.error);
