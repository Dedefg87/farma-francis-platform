import { getDb } from '../server/db';

async function inspectSchema() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  const session = (db as any).session;
  if (!session || !session.client) {
    console.error('Could not access raw connection');
    process.exit(1);
  }

  const client = session.client;
  const tables = ['customers', 'crm_outbox_events'];

  for (const table of tables) {
    console.log(`\n=== DESCRIBE ${table} ===`);
    try {
      const [rows] = await client.execute(`DESCRIBE ${table}`);
      rows.forEach((row: any) => {
        console.log(`${row.Field}: ${row.Type} ${row.Null ? 'NULL' : 'NOT NULL'} ${row.Key || ''} ${row.Default !== null ? 'DEFAULT ' + row.Default : ''}`);
      });
    } catch (err) {
      console.error(`Error describing ${table}:`, err);
    }
  }

  process.exit(0);
}

inspectSchema().catch(console.error);
