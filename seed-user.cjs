const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection('mysql://root:fPEIIcrxEJrOwqgcFacSejAgNjAbwxhC@trolley.proxy.rlwy.net:10194/railway');
  const [rows] = await connection.execute('DESCRIBE users');
  console.log('Users table columns:', rows);
  await connection.end();
}

check().catch(console.error);