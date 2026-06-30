import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { integrationSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * Generate WhatsApp pairing code via Evolution API
 * Alternative to QR code - user enters 8-digit code in WhatsApp
 * 
 * Evolution API endpoint: GET /instance/connect/{instance}?number={phone}
 */
router.post("/pairing/code", async (req: Request, res: Response) => {
  try {
    const { instanceName, phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ 
        error: "Phone number is required",
        example: { phoneNumber: "5511999999999" }
      });
    }

    // Normalize phone number (E.164 format without +)
    const normalizedPhone = phoneNumber.replace(/\D/g, "").replace(/^55/, "");
    const fullPhone = normalizedPhone.length === 10 
      ? `55${normalizedPhone}` 
      : normalizedPhone;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Get Evolution API configuration
    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    if (!config || !config.isActive) {
      return res.status(404).json({ error: "Evolution API not configured" });
    }

    const configData = typeof config.config === "string"
      ? JSON.parse(config.config)
      : config.config;
    
    const apiUrl = configData.apiUrl?.replace(/\/$/, "");
    const apiKey = configData.apiKey || configData.accessToken;
    const instName = instanceName || configData.instanceName;

    if (!apiUrl || !apiKey || !instName) {
      return res.status(400).json({ 
        error: "Missing Evolution API configuration"
      });
    }

    // Evolution API uses GET with ?number= query parameter for pairing code
    const pairingUrl = `${apiUrl}/instance/connect/${instName}?number=${fullPhone}`;
    
    console.log("[Pairing] Calling Evolution API:", pairingUrl);
    
    const response = await fetch(pairingUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Pairing] Failed to generate code:", response.status, errorText);
      return res.status(response.status).json({ 
        error: "Failed to generate pairing code",
        details: errorText 
      });
    }

    const data = await response.json();
    
    // Evolution API returns pairingCode in the response when using ?number=
    const pairingCode = data?.pairingCode || data?.code;
    
    if (!pairingCode) {
      console.error("[Pairing] No pairing code in response:", data);
      return res.status(500).json({ 
        error: "Invalid response from Evolution API",
        hint: "Make sure instance was created with the same phone number",
        data 
      });
    }

    console.log(`[Pairing] Generated code for ${fullPhone}: ${pairingCode}`);

    res.json({
      success: true,
      pairingCode,
      instanceName: instName,
      phoneNumber: fullPhone,
      expiresIn: 300, // 5 minutes
      message: "Enter this code in WhatsApp: Linked Devices → Link with phone number",
    });

  } catch (error) {
    console.error("[Pairing] Error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: (error as Error).message 
    });
  }
});

/**
 * Get QR code instead of pairing code
 */
router.post("/pairing/qr", async (req: Request, res: Response) => {
  try {
    const { instanceName } = req.body;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    const configData = typeof config?.config === "string"
      ? JSON.parse(config.config)
      : config?.config;

    const apiUrl = configData?.apiUrl?.replace(/\/$/, "");
    const apiKey = configData?.apiKey || configData?.accessToken;
    const instName = instanceName || configData?.instanceName;

    if (!apiUrl || !apiKey || !instName) {
      return res.status(400).json({ error: "Missing Evolution API configuration" });
    }

    // GET /instance/connect/{instance} for QR code
    const qrUrl = `${apiUrl}/instance/connect/${instName}`;
    
    const response = await fetch(qrUrl, {
      method: "GET",
      headers: {
        "apikey": apiKey,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to get QR code" });
    }

    const data = await response.json();

    res.json({
      success: true,
      qr: data?.base64 || data?.qrcode || data?.code,
      instanceName: instName,
    });

  } catch (error) {
    console.error("[Pairing] QR error:", error);
    res.status(500).json({ error: "QR code fetch failed" });
  }
});

/**
 * Check pairing status
 */
router.get("/pairing/status/:instanceName", async (req: Request, res: Response) => {
  try {
    const { instanceName } = req.params;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    const configData = typeof config?.config === "string"
      ? JSON.parse(config.config)
      : config?.config;

    const apiUrl = configData?.apiUrl?.replace(/\/$/, "");
    const apiKey = configData?.apiKey || configData?.accessToken;

    const response = await fetch(
      `${apiUrl}/instance/connectionStatus/${instanceName || configData?.instanceName}`, 
      {
        method: "GET",
        headers: {
          "apikey": apiKey,
        },
      }
    );

    if (!response.ok) {
      return res.status(404).json({ error: "Instance not found" });
    }

    const data = await response.json();

    res.json({
      success: true,
      instanceName,
      connected: data?.state === "open" || data?.connected === true,
      state: data?.state || "unknown",
    });

  } catch (error) {
    console.error("[Pairing] Status check error:", error);
    res.status(500).json({ error: "Status check failed" });
  }
});

/**
 * Logout/Reboot instance
 */
router.delete("/pairing/logout/:instanceName", async (req: Request, res: Response) => {
  try {
    const { instanceName } = req.params;

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    const [config] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, "evolution_api"))
      .limit(1);

    const configData = typeof config?.config === "string"
      ? JSON.parse(config.config)
      : config?.config;

    const apiUrl = configData?.apiUrl?.replace(/\/$/, "");
    const apiKey = configData?.apiKey || configData?.accessToken;

    const response = await fetch(
      `${apiUrl}/instance/logout/${instanceName || configData?.instanceName}`, 
      {
        method: "DELETE",
        headers: {
          "apikey": apiKey,
        },
      }
    );

    res.json({
      success: true,
      message: "Instance logged out. You can pair again.",
    });

  } catch (error) {
    console.error("[Pairing] Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;