#!/usr/bin/env ts-node

/**
 * Apply idempotency migrations directly to the database
 * Usage: DATABASE_URL="mysql://..." npx ts-node scripts/apply-idempotency.ts
 */

import { drizzle } from 'drizzle-orm/mysql-core/mysql2';
import * as mysql from 'mysql2/promise';
import { migrate } from 'drizzle-kit';
import { config } from 'dotenv';

config();

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    const conn = await mysql.createConnection(databaseUrl);
    const db = drizzle(conn);

    console.log('Running migration push...');
    // Push all pending migrations
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    
    console.log('✅ Migrations applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

main();
