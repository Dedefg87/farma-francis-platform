const mysql = require('mysql2/promise');

async function fixDuplicates() {
  const connection = await mysql.createConnection({
    host: 'trolley.proxy.rlwy.net',
    port: 10194,
    user: 'root',
    password: 'fPEIIcrxEJrOwqgcFacSejAgNjAbwxhC',
    database: 'railway',
    multipleStatements: true
  });

  try {
    console.log('Connected to MySQL');

    // 1. Check if unique indexes exist
    const [indexes] = await connection.query(`
      SHOW INDEXES FROM received_messages 
      WHERE Non_unique = 0 
      AND Column_name IN ('provider', 'externalId')
    `);
    console.log('Current unique indexes on received_messages:', indexes);

    // Se não existe índice único (provider, externalId), criar
    if (indexes.length === 0) {
      console.log('Creating unique index on received_messages (provider, externalId)...');
      await connection.query(`
        ALTER TABLE received_messages 
        ADD UNIQUE INDEX uniq_provider_external_id (provider(16), externalId(255))
      `);
      console.log('✅ Index created');
    } else {
      console.log('✅ Index already exists');
    }

    // Check conversation_messages
    const [msgIndexes] = await connection.query(`
      SHOW INDEXES FROM conversation_messages 
      WHERE Non_unique = 0 
      AND Column_name IN ('provider', 'externalId')
    `);
    console.log('Current unique indexes on conversation_messages:', msgIndexes);

    if (msgIndexes.length === 0) {
      console.log('Creating unique index on conversation_messages (provider, externalId)...');
      await connection.query(`
        ALTER TABLE conversation_messages 
        ADD UNIQUE INDEX uniq_provider_external_id (provider(16), externalId(255))
      `);
      console.log('✅ Index created');
    } else {
      console.log('✅ Index already exists');
    }

    // 2. Find and count duplicates in received_messages
    const [dupReceived] = await connection.query(`
      SELECT provider, externalId, COUNT(*) as cnt 
      FROM received_messages 
      WHERE externalId IS NOT NULL 
      GROUP BY provider, externalId 
      HAVING cnt > 1
    `);
    console.log('Duplicates in received_messages:', dupReceived);

    // 3. Find and count duplicates in conversation_messages
    const [dupConversation] = await connection.query(`
      SELECT provider, externalId, COUNT(*) as cnt 
      FROM conversation_messages 
      WHERE externalId IS NOT NULL 
      GROUP BY provider, externalId 
      HAVING cnt > 1
    `);
    console.log('Duplicates in conversation_messages:', dupConversation);

    // 4. If duplicates exist, delete them (keep oldest)
    if (dupReceived.length > 0) {
      console.log('Cleaning duplicates in received_messages...');
      for (let dup of dupReceived) {
        const [rows] = await connection.query(`
          SELECT id FROM received_messages 
          WHERE provider = ? AND externalId = ? 
          ORDER BY id ASC
        `, [dup.provider, dup.externalId]);
        
        if (rows.length > 1) {
          const keepId = rows[0].id;
          const deleteIds = rows.slice(1).map(r => r.id);
          await connection.query(`
            DELETE FROM received_messages 
            WHERE id IN (${deleteIds.join(',')})
          `);
          console.log(`  Removed ${deleteIds.length} duplicates, kept id=${keepId}`);
        }
      }
    }

    if (dupConversation.length > 0) {
      console.log('Cleaning duplicates in conversation_messages...');
      for (let dup of dupConversation) {
        const [rows] = await connection.query(`
          SELECT id FROM conversation_messages 
          WHERE provider = ? AND externalId = ? 
          ORDER BY id ASC
        `, [dup.provider, dup.externalId]);
        
        if (rows.length > 1) {
          const keepId = rows[0].id;
          const deleteIds = rows.slice(1).map(r => r.id);
          await connection.query(`
            DELETE FROM conversation_messages 
            WHERE id IN (${deleteIds.join(',')})
          `);
          console.log(`  Removed ${deleteIds.length} duplicates, kept id=${keepId}`);
        }
      }
    }

    console.log('✅ Duplicate cleanup complete');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

fixDuplicates();
