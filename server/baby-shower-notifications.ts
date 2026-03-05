import { getDb } from "./db";
import { integrationSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Enviar notificação de novo presente para a mãe
 */
export async function sendBabyShowerNotification(params: {
  phone: string;
  guestName: string;
  packageName: string;
  eventName: string;
  totalBalance: string | number;
}): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    if (!config || !config.isActive) {
      console.log("[BabyShower Notify] Evolution API not configured");
      return false;
    }

    const configData =
      typeof config.config === "string"
        ? JSON.parse(config.config)
        : config.config;

    const apiUrl = (configData.apiUrl as string)?.replace(/\/$/, "");
    const apiKey =
      (configData.apiKey as string) || (configData.accessToken as string);
    const instanceName = configData.instanceName as string;

    if (!apiUrl || !apiKey || !instanceName) {
      console.log("[BabyShower Notify] Evolution config incomplete");
      return false;
    }

    const normalizedPhone = params.phone.replace(/\D/g, "");
    const balance = typeof params.totalBalance === "string" 
      ? parseFloat(params.totalBalance).toFixed(2)
      : Number(params.totalBalance).toFixed(2);

    const message = `🎉 *Novo Presente para seu Chá de Bebê!*\n\nOlá! ${params.guestName} acabou de presentear seu bebê com:\n📦 ${params.packageName}\n\n💝 *${params.eventName}*\n💰 Carteira Virtual: R$ ${balance}\n\nAgradecemos por escolher a Farma Francis! 💙\n\n_Assim que precisar das fraldas, é só avisar pelo WhatsApp!_`;

    const response = await fetch(
      `${apiUrl}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: normalizedPhone,
          text: message,
        }),
      }
    );

    if (response.ok) {
      console.log(`[BabyShower Notify] Sent to ${normalizedPhone}`);
    } else {
      console.error(`[BabyShower Notify] Failed: ${response.status}`);
    }

    return response.ok;
  } catch (error) {
    console.error("[BabyShower Notify] Error:", error);
    return false;
  }
}

/**
 * Notificar que retirada está pronta
 */
export async function sendWithdrawalReadyNotification(params: {
  phone: string;
  motherName: string;
  diaperSize: string;
  quantity: number;
  deliveryMethod: string;
}): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) { throw new Error("Database not available"); }
    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    if (!config || !config.isActive) {
      return false;
    }

    const configData =
      typeof config.config === "string"
        ? JSON.parse(config.config)
        : config.config;

    const apiUrl = (configData.apiUrl as string)?.replace(/\/$/, "");
    const apiKey =
      (configData.apiKey as string) || (configData.accessToken as string);
    const instanceName = configData.instanceName as string;

    if (!apiUrl || !apiKey || !instanceName) {
      return false;
    }

    const normalizedPhone = params.phone.replace(/\D/g, "");
    const deliveryText = params.deliveryMethod === "delivery" 
      ? "sairá para entrega" 
      : "está pronta para retirada na loja";

    const message = `✅ *Pedido Pronto!*\n\nOlá ${params.motherName},\n\nSeu pedido de ${params.quantity} pacote(s) de fraldas tamanho ${params.diaperSize} ${deliveryText}!\n\nObrigada por confiar na Farma Francis! 💙\n\n_Dúvidas? É só chamar._`;

    const response = await fetch(
      `${apiUrl}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: normalizedPhone,
          text: message,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("[BabyShower Notify] Error:", error);
    return false;
  }
}
