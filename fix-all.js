import fs from 'fs';

const backtick = String.fromCharCode(96);

// --- CORRIGIR INDEX.TS ---
const indexFile = 'server/_core/index.ts';
let indexCode = fs.readFileSync(indexFile, 'utf8');

indexCode = indexCode.split('console.log[Server] DATABASE_URL set: ${!!process.env.DATABASE_URL});').join('  console.log(' + backtick + '[Server] DATABASE_URL set: ${!!process.env.DATABASE_URL}' + backtick + ');');
indexCode = indexCode.split('console.logServer running on http://localhost:${port}/);').join('    console.log(' + backtick + 'Server running on http://localhost:${port}/' + backtick + ');');
indexCode = indexCode.split('console.log🚀 Server listening on port ${port});').join('    console.log(' + backtick + '🚀 Server listening on port ${port}' + backtick + ');');

fs.writeFileSync(indexFile, indexCode);
console.log("✅ index.ts corrigido com sucesso!");

// --- CORRIGIR ROUTERS-BROADCAST.TS ---
const broadcastFile = 'server/routers-broadcast.ts';
if (fs.existsSync(broadcastFile)) {
    let broadcastCode = fs.readFileSync(broadcastFile, 'utf8');
    
    // Consertar o sql<numberCOUNT(*) que estava quebrado
    broadcastCode = broadcastCode.split('sql<numberCOUNT(*)').join('sql<number>(' + backtick + 'COUNT(*)' + backtick + ')');
    
    fs.writeFileSync(broadcastFile, broadcastCode);
    console.log("✅ routers-broadcast.ts corrigido com sucesso!");
}
