import { getDb } from "./db";
import { users } from "../drizzle/schema";
import bcrypt from "bcryptjs";

async function seed() {
  const db = await getDb();
  const email = "admin@farmafrancis.com.br";
  const password = "senhaforte123"; 
  
  const hash = await bcrypt.hash(password, 10);
  const now = new Date();

  console.log("Criando usuário admin...");
  
  await db.insert(users).values({
    openId: `admin-${Date.now()}`,
    email: email,
    name: "Admin Farma Francis",
    role: "admin",
    passwordHash: hash,
    loginMethod: "manual",
    lastSignedIn: now,
    createdAt: now,
    updatedAt: now,
  });

  console.log("✅ Admin criado com sucesso!");
  console.log(`Email: ${email}`);
  console.log(`Senha: ${password}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erro ao criar admin:", err);
  process.exit(1);
});
