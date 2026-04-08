const mysql = require('mysql2/promise').default || require('mysql2/promise');

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:fPEIIcrxEJrOwqgcFacSejAgNjAbwxhC@trolley.proxy.rlwy.net:10194/railway';

async function runMigration() {
  console.log('🔌 Connecting to apply migration...');
  const conn = await mysql.createConnection(DATABASE_URL);
  
  try {
    console.log('📝 Running migration: 0007_add_channel_to_queues.sql');
    await conn.query(`
      ALTER TABLE queues 
      ADD COLUMN channel VARCHAR(16) NOT NULL DEFAULT 'whatsapp' 
      AFTER description;
    `);
    console.log('✅ Migration applied successfully!');
    
    // Verificar resultado
    const [desc] = await conn.execute('DESCRIBE queues');
    console.log('\n📊 New table structure:');
    for (const col of desc) {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `default ${col.Default}` : ''}`);
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.message.includes('Duplicate column name')) {
      console.log('ℹ️ Column already exists, skipping.');
    } else {
      throw err;
    }
  } finally {
    await conn.end();
    console.log('✅ Connection closed.');
  }
}

runMigration().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
