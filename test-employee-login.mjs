import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('🔍 Testando criação de funcionário e login...\n');

// Dados do funcionário de teste
const testEmployee = {
  username: 'teste123',
  password: 'senha123',
  name: 'Funcionário Teste'
};

console.log('📝 Dados do funcionário de teste:');
console.log(`   Username: ${testEmployee.username}`);
console.log(`   Password: ${testEmployee.password}`);
console.log(`   Name: ${testEmployee.name}\n`);

// 1. Criar hash da senha
const passwordHash = await bcrypt.hash(testEmployee.password, 10);
console.log('🔒 Hash da senha criado:');
console.log(`   ${passwordHash.substring(0, 50)}...\n`);

// 2. Criar usuário
const openId = `employee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
console.log('👤 Criando usuário...');
await connection.execute(
  `INSERT INTO users (openId, name, email, passwordHash, role, loginMethod, createdAt, updatedAt) 
   VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [openId, testEmployee.name, testEmployee.username, passwordHash, 'user', 'email']
);
console.log('   ✅ Usuário criado com sucesso\n');

// 3. Buscar usuário recém-criado
const [users] = await connection.execute(
  'SELECT id, openId, name, email, passwordHash, role FROM users WHERE openId = ?',
  [openId]
);
const newUser = users[0];
console.log('🔍 Usuário encontrado no banco:');
console.log(`   ID: ${newUser.id}`);
console.log(`   OpenId: ${newUser.openId}`);
console.log(`   Name: ${newUser.name}`);
console.log(`   Email/Username: ${newUser.email}`);
console.log(`   Role: ${newUser.role}`);
console.log(`   PasswordHash: ${newUser.passwordHash.substring(0, 50)}...\n`);

// 4. Criar employee vinculado
console.log('👔 Criando employee...');
await connection.execute(
  `INSERT INTO employees (user_id, status, created_at, updated_at) 
   VALUES (?, ?, NOW(), NOW())`,
  [newUser.id, 'active']
);
console.log('   ✅ Employee criado com sucesso\n');

// 5. Testar validação de senha
console.log('🔐 Testando validação de senha...');
const isValidCorrect = await bcrypt.compare(testEmployee.password, newUser.passwordHash);
console.log(`   Senha correta (${testEmployee.password}): ${isValidCorrect ? '✅' : '❌'}`);

const isValidWrong = await bcrypt.compare('senhaerrada', newUser.passwordHash);
console.log(`   Senha errada (senhaerrada): ${isValidWrong ? '❌ ERRO!' : '✅'}\n`);

console.log('✅ Teste concluído!');
console.log('\n📋 Resumo:');
console.log(`   Para fazer login, use:`);
console.log(`   - Usuário: ${testEmployee.username}`);
console.log(`   - Senha: ${testEmployee.password}`);
console.log(`   - Role: user (será redirecionado para /agent/queues)`);

await connection.end();
