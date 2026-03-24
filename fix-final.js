import fs from 'fs';

const file = 'server/_core/index.ts';
let code = fs.readFileSync(file, 'utf8');

const b = String.fromCharCode(96); // Crase segura

// 1. Corrigir os console.log
const s1 = 'console.log[Server] DATABASE_URL set: ${!!process.env.DATABASE_URL});';
const r1 = 'console.log(' + b + '[Server] DATABASE_URL set: ${!!process.env.DATABASE_URL}' + b + ');';
code = code.replace(s1, r1);

const s2 = 'console.logServer running on http://localhost:${port}/);';
const r2 = 'console.log(' + b + 'Server running on http://localhost:${port}/' + b + ');';
code = code.replace(s2, r2);

const s3 = 'console.log🚀 Server listening on port ${port});';
const r3 = 'console.log(' + b + '🚀 Server listening on port ${port}' + b + ');';
code = code.replace(s3, r3);

// 2. Corrigir a chave } faltando no final do arquivo
const s4 = '  startServer().catch(console.error);';
const r4 = '}\n\nstartServer().catch(console.error);';
if (code.includes(s4)) {
    code = code.replace(s4, r4);
}

fs.writeFileSync(file, code);
console.log("✅ index.ts corrigido com SUCESSO ABSOLUTO!");
