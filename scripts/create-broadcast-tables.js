import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { migrate } from 'drizzle-orm/mysql2/migrator';

async function run() {
  const pool = await mysql.createPool({
    host: 'ssh.registro-srv.com',
    user: 'u224342149_farma',
    password: '@Afrancis87',
    database: 'u224342149_farma',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
  });

  const db = drizzle(pool);

  // SQL para criar as tabelas broadcast
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
      FOREIGN KEY (\`list_id\`) REFERENCES \`broadcast_lists\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      UNIQUE KEY \`broadcast_list_members_list_customer_unique\` (\`list_id\`,\`customer_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  console.log(' Executando SQL para criar tabelas broadcast...');
  await db.execute(sql);
  console.log('✅ Tabelas broadcast_lists e broadcast_list_members criadas/verificadas.');

  await pool.end();
}

run().catch(console.error);
