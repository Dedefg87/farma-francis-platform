import fs from 'fs';
const file = 'server/_core/index.ts';
let code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');

// Usando String.fromCharCode(96) para gerar a crase (`) de forma segura
const backtick = String.fromCharCode(96);

lines[3547] = '  console.log(' + backtick + '[Server] DATABASE_URL set: ${!!process.env.DATABASE_URL}' + backtick + ');';
lines[3600] = '    console.log(' + backtick + 'Server running on http://localhost:${port}/' + backtick + ');';
lines[3790] = '    console.log(' + backtick + '🚀 Server listening on port ${port}' + backtick + ');';

fs.writeFileSync(file, lines.join('\n'));
console.log("✅ ARQUIVO CORRIGIDO COM SUCESSO!");
