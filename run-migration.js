import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://postgres:KsuBYxJSjSdmMvzgMafRzSOyRGahRkvG@postgres-fi-g.railway.internal:5432/railway'
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Conectado ao banco');
    
    await client.query(`ALTER TABLE baby_shower_events ADD COLUMN IF NOT EXISTS baby_name VARCHAR(255);`);
    console.log('Migration executada com sucesso!');
    
    // Verificar se a coluna foi criada
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'baby_shower_events' AND column_name = 'baby_name'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Coluna baby_name verificada no banco!');
    } else {
      console.log('⚠️  Coluna não encontrada após migration');
    }
    
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
