import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users } from './drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const allUsers = await db.select().from(users);
console.log('Total de usuários:', allUsers.length);
console.log('\nUsuários no banco:');
allUsers.forEach(user => {
  console.log(`\nID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`Nome: ${user.name}`);
  console.log(`Role: ${user.role}`);
  console.log(`PasswordHash: ${user.passwordHash ? 'Existe' : 'Não existe'}`);
  if (user.passwordHash) {
    console.log(`Hash (primeiros 20 chars): ${user.passwordHash.substring(0, 20)}...`);
  }
});

await connection.end();
