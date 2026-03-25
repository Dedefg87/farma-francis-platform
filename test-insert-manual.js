#!/usr/bin/env node

import mysql from 'mysql2/promise';

const url = process.env.MYSQL_PUBLIC_URL || 'mysql://root:fPEIIcrxEJrOwqgcFacSejAgNjAbwxhC@trolley.proxy.rlwy.net:10194/railway';

async function testInsert() {
  const conn = await mysql.createConnection(url);

  // Valores exatos do log
  const values = [
    null, // message_text (permitido NULL)
    null, // caption (permitido NULL)
    'https://pub-33c481f0a9e94adb8870472308f49471.r2.dev/broadcast/1774399596348-copia.jpg', // file_url
    'copia.jpg', // file_name
    'image/jpeg', // file_type
    1060388, // file_size
    8, // sender_id
    'agent', // sender_type
    3, // total_recipients
    0, // successful_sends
    0, // failed_sends
    'sending', // status
    '2026-03-25 00:46:38.781', // sent_at (string)
    null, // error_message
    null, // messageText? Não, já era message_text. Vamos order exata da tabela
  ];

  // Vou montar INSERT explícito com colunas na ordem do schema Drizzle
  const sql = `
    INSERT INTO broadcast_messages
    (list_id, message_text, caption, file_url, file_name, file_type, file_size,
     sender_id, sender_type, total_recipients, successful_sends, failed_sends,
     status, sent_at, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await conn.execute(sql, [
      38, // list_id
      null, // message_text
      null, // caption
      'https://pub-...', // file_url
      'copia.jpg', // file_name
      'image/jpeg', // file_type
      1060388, // file_size
      8, // sender_id
      'agent', // sender_type
      3, // total_recipients
      0, // successful_sends
      0, // failed_sends
      'sending', // status
      '2026-03-25 00:46:38.781', // sent_at
      null, // error_message
    ]);
    console.log('✅ INSERT ok:', result);
  } catch (err) {
    console.error('❌ INSERT failed:');
    console.error('  errno:', err.errno);
    console.error('  sqlMessage:', err.sqlMessage);
    console.error('  code:', err.code);
    console.error('  sqlState:', err.sqlState);
  } finally {
    await conn.end();
  }
}

testInsert();
