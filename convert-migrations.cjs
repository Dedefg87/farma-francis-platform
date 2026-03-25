#!/usr/bin/env node
/**
 * Conversor de migrations PostgreSQL → MySQL
 *
 * Conversões:
 * - serial → INT AUTO_INCREMENT
 * - integer → INT
 * - jsonb → JSON
 * - now() → CURRENT_TIMESTAMP
 * - Remove schema "public"
 * - Adiciona ENGINE/CHARSET
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = './server/database/migrations';

function convertSql(sql) {
  return sql
    // Remover schema public
    .replace(/"public"\."/g, '')
    .replace(/"public"\./g, '')
    // Colunas: aspas duplas → backticks
    .replace(/"([^"]+)"(?!\s*(?:,|\)|\())/g, '`$1`')
    // Tipos
    .replace(/\bserial\b/gi, 'INT AUTO_INCREMENT')
    .replace(/\binteger\b/gi, 'INT')
    .replace(/\bbigint\b/gi, 'BIGINT')
    .replace(/\bjsonb\b/gi, 'JSON')
    .replace(/\btext\b/gi, 'TEXT')
    .replace(/\bboolean\b/gi, 'TINYINT(1)')
    .replace(/\bnumeric\((\d+),\s*(\d+)\)\b/gi, 'DECIMAL($1,$2)')
    // Timestamps
    .replace(/timestamp DEFAULT now\(\)/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
    // Constraints (UNIQUE, PRIMARY KEY)
    .replace(/"([^"]+)"\s*(UNIQUE|PRIMARY KEY)/gi, '`$1` $2')
    .replace(/"([^"]+)"\s*REFERENCES/gi, '`$1` REFERENCES')
    // FOREIGN KEY references
    .replace(/"([^"]+)"\."([^"]+)"\b/gi, '`$1`.`$2`')
    // Adicionar ENGINE/CHARSET em CREATE TABLE se não houver
    .replace(/\)\s*;\s*$/gm, ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;')
    // Remover statement-breakpoints
    .replace(/-->\s*statement-breakpoint\s*\n?/g, '')
    // Limpar vírgulas soltas antes de )
    .replace(/,\s*\)/g, ')');
}

function main() {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.endsWith('.mysql.sql'));

  console.log(`[Converter] Encontradas ${files.length} migrations`);

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const outputPath = path.join(migrationsDir, file.replace('.sql', '.mysql.sql'));

    const sql = fs.readFileSync(fullPath, 'utf8');
    const converted = convertSql(sql);

    fs.writeFileSync(outputPath, converted);
    console.log(`[Converter] ✅ ${file} → ${path.basename(outputPath)}`);
  }

  console.log('\n[Converter] ✅ Conversão concluída');
  console.log('[Converter] Próximos passos:');
  console.log('1. Revise alguns arquivos .mysql.sql');
  console.log('2. Renomeie todos para .sql (substituir originais)');
  console.log('3. Redeploy para aplicar as migrations MySQL');
}

main();
