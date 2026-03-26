import fs from 'fs';
let content = fs.readFileSync('server/_core/index.ts', 'utf8');
const startIdx = content.indexOf('async function applySqlMigrations() {');
if (startIdx !== -1) {
  let endIdx = content.indexOf('async function runIdempotencyConstraints() {');
  if (endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx);
    if (!content.includes('import { applySqlMigrations }')) {
      content = content.replace('import { runBroadcastMigrations } from "../broadcast-migration";', 'import { runBroadcastMigrations } from "../broadcast-migration";\nimport { applySqlMigrations } from "./migrations.js";');
    }
    fs.writeFileSync('server/_core/index.ts', content);
    console.log('✅ Função applySqlMigrations removida do index.ts e import adicionado!');
  }
} else {
  console.log('⚠️ Função applySqlMigrations não encontrada no index.ts');
}
