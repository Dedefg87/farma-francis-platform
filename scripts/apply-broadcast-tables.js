import mysql from 'mysql2/promise';

async function applyBroadcastTables() {
  const config = {
    host: 'ssh.registro-srv.com',
    user: 'u224342149_farma',
    password: '@Afrancis87',
    database: 'u224342149_farma',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 1,
  };

  const sql = `
    CREATE TABLE IF NOT EXISTS \`broadcast_lists\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`name\` varchar(255) NOT NULL,
      \`description\` text,
      \`created_by\` int NOT NULL,
      \`last_sent_at\` timestamp NULL DEFAULT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS \`broadcast_list_members\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`list_id\` int NOT NULL,
      \`customer_id\` int NOT NULL,
      \`added_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`broadcast_list_members_list_customer_unique\` (\`list_id\`,\`customer_id\`),
      CONSTRAINT \`fk_broadcast_list_members_list\` FOREIGN KEY (\`list_id\`) REFERENCES \`broadcast_lists\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_broadcast_list_members_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  console.log('🔌 Conectando ao MySQL Railway...');
  const pool = mysql.createPool(config);
  const db = pool;

  try {
    await db.query(sql);
    console.log('✅ Tabelas broadcast_lists e broadcast_list_members criadas/verificadas.');

    const [tables] = await db.query("SHOW TABLES LIKE 'broadcast_%'");
    console.log('📊 Tabelas broadcast encontradas:', tables.length);
    tables.forEach(t => console.log('  -', Object.values(t)[0]));

    if (tables.length === 2) {
      console.log('✅ Todas as tabelas broadcast estão presentes.');
    } else {
      console.log('⚠️  Algumas tabelas ainda faltando');
    }

    const [descLists] = await db.query("DESCRIBE broadcast_lists");
    console.log('\n📋 Estrutura broadcast_lists:');
    descLists.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null ? 'NULL' : 'NOT NULL'} ${col.Key ? 'KEY:'+col.Key : ''}`);
    });

    const [descMembers] = await db.query("DESCRIBE broadcast_list_members");
    console.log('\n📋 Estrutura broadcast_list_members:');
    descMembers.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null ? 'NULL' : 'NOT NULL'} ${col.Key ? 'KEY:'+col.Key : ''}`);
    });

    console.log('\n🎉 Concluído!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

applyBroadcastTables().catch(() => process.exit(1));
