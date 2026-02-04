import Database from 'better-sqlite3';
const db = new Database('local.db');
const flows = db.prepare('SELECT id, name, flowData FROM visual_flows').all();
console.log('Fluxos encontrados:', flows.length);
flows.forEach(f => {
  console.log(`\nID: ${f.id}, Nome: ${f.name}`);
  if (f.flowData) {
    try {
      const data = JSON.parse(f.flowData);
      console.log(`  Nodes: ${data.nodes?.length || 0}, Edges: ${data.edges?.length || 0}`);
      if (data.nodes?.length > 0) {
        console.log(`  Primeiro nó:`, JSON.stringify(data.nodes[0]).substring(0, 100));
      }
    } catch (e) {
      console.log('  Erro ao parsear flowData:', e.message);
    }
  } else {
    console.log('  flowData: null');
  }
});
db.close();
