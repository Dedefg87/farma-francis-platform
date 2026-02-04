import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

async function fixAdminPassword() {
  try {
    // Gerar hash da senha "admin"
    const password = 'admin';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Senha:', password);
    console.log('Hash gerado:', hash);
    
    // Conectar ao banco
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    // Atualizar senha do admin
    const [result] = await connection.execute(
      'UPDATE users SET passwordHash = ? WHERE email = ?',
      [hash, 'admin']
    );
    
    console.log('\nResultado da atualização:', result);
    console.log('Linhas afetadas:', result.affectedRows);
    
    // Verificar se foi atualizado
    const [rows] = await connection.execute(
      'SELECT id, email, name, LEFT(passwordHash, 20) as hashPreview FROM users WHERE email = ?',
      ['admin']
    );
    
    console.log('\nUsuário admin após atualização:');
    console.log(rows[0]);
    
    await connection.end();
    console.log('\n✅ Senha do admin atualizada com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixAdminPassword();
