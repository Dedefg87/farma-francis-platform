/**
 * Serviços de integração com WhatsApp
 */

import { getDb } from "../db.js";
import { integrationSettings } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

/**
 * Envia notificação via WhatsApp usando Evolution API
 */
export async function sendWhatsAppNotification(params: {
  phone: string;
  message: string;
}): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.log("[WhatsApp] Database not available");
      return false;
    }

    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    if (!config || !config.isActive) {
      console.log("[WhatsApp] Evolution API not configured");
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
      console.log("[WhatsApp] Evolution config incomplete");
      return false;
    }

    const normalizedPhone = params.phone.replace(/\D/g, "");

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
          text: params.message,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WhatsApp] Falha ao enviar para ${normalizedPhone}: ${response.status} - ${errorText}`);
    } else {
      console.log(`[WhatsApp] ✅ Mensagem enviada para ${normalizedPhone}`);
    }

    return response.ok;
  } catch (error) {
    console.error("[WhatsApp] Error sending WhatsApp:", error);
    return false;
  }
}
