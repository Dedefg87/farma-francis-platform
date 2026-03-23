import { createClient } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(.+)/);
  if (!match) throw new Error('Formato DATABASE_URL inválido');
  
  const [, user, password, host, port, database] = match;
  
  const conn = await createClient({
    host,
    port: port ? parseInt(port) : 3306,
    user,
    password,
    database,
  });
  
  console.log('✅ Conectado ao MySQL');
  
  const statements = [
    `CREATE TABLE IF NOT EXISTS \`broadcast_lists\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`name\` varchar(255) NOT NULL,
      \`description\` text,
      \`created_by\` int NOT NULL,
      \`last_sent_at\` timestamp NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_created_by\` (\`created_by\`),
      KEY \`idx_created_at\` (\`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`broadcast_list_members\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`list_id\` int NOT NULL,
      \`customer_id\` int NOT NULL,
      \`added_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`unique_list_customer\` (\`list_id\`, \`customer_id\`),
      KEY \`idx_list_id\` (\`list_id\`),
      KEY \`idx_customer_id\` (\`customer_id\`),
      CONSTRAINT \`broadcast_list_members_ibfk_1\` FOREIGN KEY (\`list_id\`) REFERENCES \`broadcast_lists\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`broadcast_list_members_ibfk_2\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`broadcast_messages\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`list_id\` int NOT NULL,
      \`message_text\` text NOT NULL,
      \`caption\` text,
      \`file_url\` text,
      \`file_name\` varchar(255) DEFAULT NULL,
      \`file_type\` varchar(100) DEFAULT NULL,
      \`file_size\` int DEFAULT NULL,
      \`sender_id\` int NOT NULL,
      \`sender_type\` enum('agent','system') NOT NULL DEFAULT 'agent',
      \`status\` enum('draft','sending','sent','failed','partial') NOT NULL DEFAULT 'draft',
      \`sent_at\` timestamp NULL,
      \`error_message\` text,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_list_id\` (\`list_id\`),
      KEY \`idx_status\` (\`status\`),
      KEY \`idx_sender_id\` (\`sender_id\`),
      CONSTRAINT \`broadcast_messages_ibfk_1\` FOREIGN KEY (\`list_id\`) REFERENCES \`broadcast_lists\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`broadcast_messages_ibfk_2\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS \`broadcast_members_sent\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`broadcast_message_id\` int NOT NULL,
      \`customer_id\` int NOT NULL,
      \`provider\` enum('whatsapp','instagram') NOT NULL DEFAULT 'whatsapp',
      \`external_id\` varchar(255) DEFAULT NULL,
      \`status\` enum('pending','sent','delivered','read','failed') NOT NULL DEFAULT 'pending',
      \`sent_at\` timestamp NULL,
      \`delivered_at\` timestamp NULL,
      \`read_at\` timestamp NULL,
      \`error_message\` text,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`unique_message_customer\` (\`broadcast_message_id\`, \`customer_id\`),
      KEY \`idx_broadcast_message_id\` (\`broadcast_message_id\`),
      KEY \`idx_customer_id\` (\`customer_id\`),
      KEY \`idx_status\` (\`status\`),
      CONSTRAINT \`broadcast_members_sent_ibfk_1\` FOREIGN KEY (\`broadcast_message_id\`) REFERENCES \`broadcast_messages\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`broadcast_members_sent_ibfk_2\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];
  
  for (const sql of statements) {
    try {
      await conn.execute(sql);
      console.log('✅ Executado:', sql.substring(0, 50) + '...');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  Já existe:', sql.substring(0, 50) + '...');
      } else {
        console.error('❌ Erro:', err.message);
        throw err;
      }
    }
  }
  
  // Verificar
  const [rows] = await conn.execute("SHOW TABLES LIKE 'broadcast_%'");
  console.log('\n📊 Tabelas broadcast criadas:', rows.length);
  rows.forEach((r: any) => console.log('   -', Object.values(r)[0]));
  
  await conn.end();
  console.log('\n✅ Concluído!');
}

main().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});
