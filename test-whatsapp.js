import { getDb } from "./server/db.js";
import { integrationSettings as IntegrationSettings } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";

async function testWhatsApp() {
  const db = await getDb();
  if (!db) {
    console.log("DB not available");
    return;
  }

  const [config] = await db
    .select()
    .from(IntegrationSettings)
    .where(eq(IntegrationSettings.integrationType, "evolution_api"))
    .limit(1);

  console.log("Config found:", !!config);
  if (config) {
    console.log("isActive:", config.isActive);
    const cfg = typeof config.config === "string" ? JSON.parse(config.config) : config.config;
    console.log("API URL:", cfg.apiUrl);
    console.log("Instance:", cfg.instanceName);
    console.log("API Key present:", !!cfg.apiKey);
  } else {
    console.log("No Evolution API config found!");
  }
}

testWhatsApp().catch(console.error);
