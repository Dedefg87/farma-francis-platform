import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users, employees } from './drizzle/schema.js';
import bcrypt from 'bcrypt';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Criar admin de teste
const hashedPassword = await bcrypt.hash('admin123', 10);

// Criar usuário admin
const [newUser] = await db.insert(users).values({
  email: 'admin.teste', // Este é o username para login
  name: 'Admin Teste', // Este é o nome completo
  passwordHash: hashedPassword,
  loginMethod: 'email',
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log('✅ Admin criado com sucesso!');
console.log('Username para login: admin.teste');
console.log('Senha: admin123');
console.log('Role: admin');

await connection.end();
