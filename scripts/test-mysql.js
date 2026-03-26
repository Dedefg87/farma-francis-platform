import mysql from "mysql2/promise";

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL não definida");
    process.exit(1);
  }

  const { hostname, username, password, pathname, port } = new URL(dbUrl);

  console.log(`Conectando a ${hostname}:${port} como ${username}...`);

  try {
    const connection = await mysql.createConnection({
      host: hostname,
      user: username,
      password: password,
      database: pathname.slice(1),
      port: port ? parseInt(port) : 3306,
      connectTimeout: 10000,
    });

    console.log("✅ Conexão estabelecida com sucesso!");

    // Testar query simples
    const [rows] = await connection.query("SHOW TABLES");
    console.log(`📋 ${rows.length} tabelas encontradas:`);
    rows.forEach((row: any) => console.log(" -", Object.values(row)[0]));

    // Verificar se há tabelas críticas
    const criticalTables = ['users', 'queues', 'agent_status', 'conversations', 'conversation_messages', 'broadcast_lists', 'broadcast_messages'];
    const [tableRows] = await connection.query("SHOW TABLES");
    const tableNames = tableRows.map((row: any) => Object.values(row)[0] as string);

    for (const table of criticalTables) {
      if (tableNames.includes(table)) {
        console.log(`✅ Tabela ${table} existe`);
      } else {
        console.log(`❌ Tabela ${table} NÃO encontrada`);
      }
    }

    await connection.end();
    console.log("✅ Conexão fechada");
  } catch (err: any) {
    console.error("❌ Erro de conexão:", err.message);
    process.exit(1);
  }
}

testConnection().catch(console.error);
