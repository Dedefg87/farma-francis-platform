const bcrypt = require('bcryptjs');

async function hash() {
  const password = "senha123456";
  const hash = await bcrypt.hash(password, 10);
  console.log("Hash para senha123456:", hash);
}

hash();
