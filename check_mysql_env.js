console.log('Checking for MYSQL env vars:');
const mysqlVars = ['HOST', 'PORT', 'USERNAME', 'PASSWORD', 'DATABASE'];
let found = false;
for (const v of mysqlVars) {
  const val = process.env[`RAILWAY_MYSQL_${v}`];
  if (val !== undefined) {
    found = true;
    console.log(`RAILWAY_MYSQL_${v}: ${v === 'PASSWORD' ? '[REDACTED]' : val}`);
  }
}
if (!found) {
  console.log('No RAILWAY_MYSQL_* vars found');
  // Check for other common patterns
  const otherVars = ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  for (const v of otherVars) {
    const val = process.env[v];
    if (val !== undefined) {
      found = true;
      console.log(`${v}: ${v.includes('PASS') ? '[REDACTED]' : val}`);
    }
  }
}
if (!found) {
  console.log('No MYSQL* vars found either');
  // Print all env vars that contain SQL or DB
  const allKeys = Object.keys(process.env);
  const dbRelated = allKeys.filter(k => /(sql|db|database)/i.test(k));
  if (dbRelated.length > 0) {
    console.log('DB-related env vars:');
    for (const k of dbRelated) {
      console.log(`  ${k}: ${k.includes('PASS') || k.includes('PASSWORD') ? '[REDACTED]' : process.env[k]}`);
    }
  } else {
    console.log('No DB-related env vars found');
  }
}
