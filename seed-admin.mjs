import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { users } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
  process.exit(1);
}

async function seedAdmin() {
  console.log('🌱 Iniciando seed do usuário admin...');

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // Verificar se admin já existe
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin'));

    if (existingAdmin) {
      console.log('ℹ️  Usuário admin já existe. Atualizando senha...');
      
      // Atualizar senha do admin
      const passwordHash = await bcrypt.hash('admin', 10);
      await db
        .update(users)
        .set({ 
          passwordHash,
          updatedAt: new Date()
        })
        .where(eq(users.email, 'admin'));
      
      console.log('✅ Senha do admin atualizada para "admin"');
    } else {
      console.log('📝 Criando usuário admin...');
      
      // Criar hash da senha
      const passwordHash = await bcrypt.hash('admin', 10);
      
      // Criar usuário admin
      await db.insert(users).values({
        openId: 'admin-default',
        name: 'Administrador',
        email: 'admin',
        passwordHash,
        loginMethod: 'email',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });
      
      console.log('✅ Usuário admin criado com sucesso!');
    }

    console.log('\n📋 Credenciais de acesso:');
    console.log('   Email: admin');
    console.log('   Senha: admin');
    console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!\n');

  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedAdmin();
