const mysql = require('mysql2/promise');

(async function() {
  const connection = await mysql.createConnection({
    host: 'trolley.proxy.rlwy.net',
    user: 'root',
    password: 'fPEIIcrxEJrOwqgcFacSejAgNjAbwxhC',
    port: 10194,
    database: 'railway',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('=== ESTRUTURA DA TABELA queue_agents ===');
    const [cols] = await connection.execute('SHOW COLUMNS FROM queue_agents');
    console.log(JSON.stringify(cols, null, 2));

    console.log('\n=== DADOS DE EXEMPLO ===');
    const [rows] = await connection.execute('SELECT * FROM queue_agents LIMIT 3');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await connection.end();
  }
})();
