import "dotenv/config";
console.log("[Server] Starting initialization...");

import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import { sql, SQL } from "drizzle-orm";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./serveStatic";
import { sseManager } from "./sse";

// Redeploy trigger: log a lightweight marker to force a redeploy in CI/CD pipelines
console.log("[Deploy] Redeploy trigger activated: patch applied on startup");
import { logger } from "./logger";
import { runCRMMigration } from "../crm-migration";
import { runBabyShowerMigration } from "../baby-shower-migration";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();

  // Trust proxy headers (required for Railway, Render, and other proxies)
  app.set("trust proxy", 1);

  const server = createServer(app);

  // Rate limiting aumentado para suportar alto volume de mensagens
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10000, // Aumentado para 10000 req/min
    message: { error: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20000, // Aumentado para 20000 req/min
    message: { error: "Too many webhook requests" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(
    express.json({
      limit: "50mb",
      verify: (req: any, _res, buf) => {
        (req as any).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  // Debug logging middleware
  try {
    const debugModule = await import("../debug");
    app.use(debugModule.webhookLogger);
  } catch (e) {
    console.error("[Server] Debug module not loaded");
  }

  app.use("/api/", apiLimiter);

  // Basic health check for load balancers and uptime monitoring
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Debug: testar ingestInboundConversationMessage
  app.get("/api/debug/server-logs", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 1,
        uri: process.env.DATABASE_URL,
      });

      const [rows]: any = await pool.execute(
        "SELECT id, customer_name, status, last_message_at FROM conversations ORDER BY id DESC LIMIT 5"
      );
      await pool.end();

      res.json({
        recentConversations: rows,
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug: listar mensagens com mídia
  app.get("/api/debug/media-messages", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 1,
        uri: process.env.DATABASE_URL,
      });

      const [rows]: any = await pool.execute(
        `SELECT id, conversation_id, sender_type, 
         LEFT(content, 100) as content_preview,
         file_url IS NOT NULL as has_file_url,
         LENGTH(file_url) as file_url_length,
         LEFT(file_url, 50) as file_url_preview,
         file_type, created_at
         FROM conversation_messages 
         ORDER BY id DESC
         LIMIT 20`
      );

      await pool.end();
      res.json({ count: rows.length, messages: rows });
    } catch (error) {
      console.error("[Debug Media Messages]", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug: ver último payload de mídia recebido
  app.get("/api/debug/last-media-payload", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 1,
        uri: process.env.DATABASE_URL,
      });

      // Buscar última mensagem com mídia
      const [rows]: any = await pool.execute(
        `SELECT id, created_at FROM conversation_messages 
         WHERE file_type IS NOT NULL 
         ORDER BY id DESC LIMIT 1`
      );
      await pool.end();

      res.json({
        latestMediaMessage: rows[0] || null,
        note: "Para ver o payload completo, precisaria da coluna raw_payload na tabela",
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug: testar Evolution API getBase64FromMediaMessage
  app.get("/api/debug/test-evolution-media", async (req, res) => {
    try {
      // Get Evolution config first
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 1,
        uri: process.env.DATABASE_URL,
      });

      const [configRows]: any = await pool.execute(
        "SELECT config FROM integration_settings WHERE integration_type = 'evolution_api' LIMIT 1"
      );

      if (!configRows || configRows.length === 0) {
        await pool.end();
        return res.json({ error: "Evolution API not configured" });
      }

      const config =
        typeof configRows[0].config === "string"
          ? JSON.parse(configRows[0].config)
          : configRows[0].config;

      const [msgRows]: any = await pool.execute(
        `SELECT id, created_at FROM conversation_messages 
         WHERE file_type IS NOT NULL 
         ORDER BY id DESC LIMIT 1`
      );
      await pool.end();

      res.json({
        evoConfig: {
          apiUrl: config.apiUrl,
          instanceName: config.instanceName,
          hasApiKey: !!(config.apiKey || config.accessToken),
        },
        latestMediaMessage: msgRows[0] || null,
        timestamp: new Date().toISOString(),
        note: "Need to pass WhatsApp message key to getBase64FromMediaMessage",
      });
    } catch (error) {
      console.error("[Test Evolution Media] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  async function getEvolutionConfig() {
    const mysql = await import("mysql2/promise");
    const pool = mysql.createPool({
      connectionLimit: 1,
      uri: process.env.DATABASE_URL,
    });

    const [rows]: any = await pool.execute(
      "SELECT config FROM integration_settings WHERE integration_type = 'evolution_api' LIMIT 1"
    );
    await pool.end();

    if (!rows || rows.length === 0) return null;

    const config =
      typeof rows[0].config === "string"
        ? JSON.parse(rows[0].config)
        : rows[0].config;
    return {
      apiUrl: config.apiUrl,
      apiKey: config.apiKey || config.accessToken,
      instanceName: config.instanceName,
    };
  }

  // Debug: testar ingestInboundConversationMessage
  app.post("/api/debug/test-ingest", async (req, res) => {
    try {
      const { ingestInboundConversationMessage } =
        await import("../db-messages");
      const result = await ingestInboundConversationMessage({
        fromNumber: "+5511999999999",
        fromName: "Teste Debug",
        content: "Mensagem de teste",
        provider: "whatsapp",
        messageType: "text",
      });
      res.json({ success: true, result });
    } catch (error) {
      console.error("[Debug Test Ingest] Error:", error);
      res.status(500).json({
        success: false,
        error: String(error),
        stack: error instanceof Error ? error.stack : null,
      });
    }
  });

  // OpenClaw Bridge endpoint - receives tasks from OpenClaw via WS bridge
  app.post("/api/openclaw/tasks", async (req, res) => {
    try {
      const { task, openclawTaskId } = req.body;

      if (!task) {
        return res.status(400).json({ error: "Task payload is required" });
      }

      console.log("[OpenClaw] Received task:", openclawTaskId, task);

      // Here you can process the task as needed
      // For now, just acknowledge and log
      // TODO: Implement actual task processing logic

      res.json({
        success: true,
        bridgeTaskId: `local-${Date.now()}`,
        openclawTaskId,
        message: "Task received",
      });
    } catch (error) {
      console.error("[OpenClaw] Error processing task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Debug: list old WhatsApp media URLs for migration planning
  // IMPORTANT: This must come BEFORE the /:messageId route to avoid being captured
  app.get("/api/media/inspect-old", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 1,
        uri: process.env.DATABASE_URL,
      });

      const [rows]: any = await pool.execute(
        `SELECT id, file_url, file_type FROM conversation_messages 
         WHERE file_url IS NOT NULL 
         AND file_url LIKE '%whatsapp.net%'
         AND file_url NOT LIKE 'data:%'
         LIMIT 100`
      );

      await pool.end();
      res.json({ count: rows.length, rows });
    } catch (error) {
      console.error("[Inspect Old]", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug: list messages with media in conversation_messages
  app.get("/api/debug/conversation-messages-with-media", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 1,
        uri: process.env.DATABASE_URL,
      });

      const [rows]: any = await pool.execute(
        `SELECT id, conversation_id, file_type, 
         LENGTH(file_url) as file_size, 
         LEFT(file_url, 50) as file_url_preview,
         created_at
         FROM conversation_messages 
         WHERE file_url IS NOT NULL 
         ORDER BY id DESC
         LIMIT 20`
      );

      await pool.end();
      res.json({ count: rows.length, rows });
    } catch (error) {
      console.error("[Media debug-list]", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Media endpoint - serves images from conversation_messages table
  app.get("/api/media/:messageId", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 1,
        uri: process.env.DATABASE_URL,
      });

      const messageId = parseInt(req.params.messageId, 10);

      if (isNaN(messageId)) {
        await pool.end();
        return res.status(400).json({ error: "Invalid message ID" });
      }

      const [rows]: any = await pool.execute(
        "SELECT file_url, file_type FROM conversation_messages WHERE id = ?",
        [messageId]
      );

      await pool.end();

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Image not found" });
      }

      const msg = rows[0];
      const fileUrl = msg.file_url;

      if (!fileUrl) {
        return res.status(404).json({ error: "Image not found" });
      }

      // If it's a data URL, extract and serve directly
      if (fileUrl.startsWith("data:")) {
        const match = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, "base64");
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Content-Length", buffer.length);
          res.setHeader("Cache-Control", "public, max-age=31536000");
          // Para PDFs, forçar exibição inline em vez de download
          if (mimeType === "application/pdf") {
            res.setHeader("Content-Disposition", "inline");
          }
          return res.send(buffer);
        }
      }

      // If it's a regular URL (not base64), try to fetch via Evolution API
      console.log(
        "[Media] file_url is not a data URL, trying Evolution API fallback:",
        fileUrl.substring(0, 50)
      );

      // Try to fetch media via Evolution API
      try {
        const { getDb } = await import("../db");
        const { integrationSettings } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();

        if (db) {
          const [config] = await db
            .select()
            .from(integrationSettings)
            .where(eq(integrationSettings.integrationType, "evolution_api"))
            .limit(1);

          if (config && config.isActive) {
            const configData =
              typeof config.config === "string"
                ? JSON.parse(config.config)
                : config.config;
            const apiUrl = configData.apiUrl?.replace(/\/$/, "");
            const apiKey = configData.apiKey || configData.accessToken;
            const instanceName = configData.instanceName;

            if (apiUrl && apiKey && instanceName) {
              // Extract media ID from URL
              const mediaIdMatch = fileUrl.match(/\/([A-Za-z0-9_-]+)(\?|$)/);
              const mediaId = mediaIdMatch ? mediaIdMatch[1] : null;

              if (mediaId) {
                console.log(
                  `[Media] Fetching media ${mediaId} from Evolution API`
                );

                // Try to get base64 from Evolution API
                const mediaFetchUrl = `${apiUrl}/chat/fetchMedia/${mediaId}`;
                const evoResponse = await fetch(mediaFetchUrl, {
                  headers: {
                    apikey: apiKey,
                    "Content-Type": "application/json",
                  },
                  signal: AbortSignal.timeout(15000),
                });

                if (evoResponse.ok) {
                  const evoData = await evoResponse.json();
                  if (evoData?.base64) {
                    console.log(
                      "[Media] Got base64 from Evolution API, size:",
                      evoData.base64.length
                    );
                    const mimeType = msg.file_type || "image/jpeg";
                    const buffer = Buffer.from(evoData.base64, "base64");

                    // Update database with base64 for future requests
                    const dataUrl = `data:${mimeType};base64,${evoData.base64}`;
                    try {
                      const mysql2 = await import("mysql2/promise");
                      const pool2 = mysql2.createPool({
                        connectionLimit: 1,
                        uri: process.env.DATABASE_URL,
                      });
                      await pool2.execute(
                        "UPDATE conversation_messages SET file_url = ? WHERE id = ?",
                        [dataUrl, messageId]
                      );
                      await pool2.end();
                      console.log(
                        "[Media] Updated database with base64 for message",
                        messageId
                      );
                    } catch (updateErr) {
                      console.error(
                        "[Media] Failed to update database:",
                        updateErr
                      );
                    }

                    res.setHeader("Content-Type", mimeType);
                    res.setHeader("Content-Length", buffer.length);
                    res.setHeader("Cache-Control", "public, max-age=31536000");
                    return res.send(buffer);
                  }
                } else {
                  console.warn(
                    "[Media] Evolution API fetch failed:",
                    evoResponse.status
                  );
                }
              }
            }
          }
        }
      } catch (evoErr) {
        console.error("[Media] Error fetching from Evolution API:", evoErr);
      }

      // All fallbacks failed
      return res.status(404).json({ error: "Image not found or expired" });
    } catch (error) {
      console.error("[Media] Error serving media:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Debug: list messages with base64 media (to test preview)
  // IMPORTANT: Must come BEFORE /:messageId route
  app.get("/api/debug/media-messages", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 1,
        uri: process.env.DATABASE_URL,
      });

      const [rows]: any = await pool.execute(
        `SELECT id, conversation_id, sender_type, 
         LEFT(content, 100) as content_preview,
         file_url IS NOT NULL as has_file_url,
         LENGTH(file_url) as file_url_length,
         LEFT(file_url, 50) as file_url_preview,
         file_type, created_at
         FROM conversation_messages 
         ORDER BY id DESC
         LIMIT 20`
      );

      await pool.end();
      res.json({ count: rows.length, messages: rows });
    } catch (error) {
      console.error("[Debug Media Messages]", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint to fix missing database columns
  app.post("/api/db/fix-columns", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 5,
        uri: process.env.DATABASE_URL,
      });

      const results: string[] = [];

      // Add is_test_mode column to visual_flows if missing
      try {
        await pool.execute(
          `ALTER TABLE visual_flows ADD COLUMN is_test_mode INT DEFAULT 0 NOT NULL`
        );
        results.push("Added is_test_mode column to visual_flows");
      } catch (e: any) {
        if (e.code === "ER_DUP_FIELDNAME") {
          results.push("is_test_mode column already exists");
        } else {
          results.push(`Error adding is_test_mode: ${e.message}`);
        }
      }

      // Increase phone column size in customers table
      try {
        await pool.execute(
          `ALTER TABLE customers MODIFY COLUMN phone VARCHAR(100)`
        );
        results.push("Increased phone column size to VARCHAR(100)");
      } catch (e: any) {
        results.push(`Error modifying phone column: ${e.message}`);
      }

      // Add expected_due_date column to customers table
      try {
        await pool.execute(
          `ALTER TABLE customers ADD COLUMN expected_due_date DATE`
        );
        results.push("Added expected_due_date column to customers");
      } catch (e: any) {
        if (e.code === "ER_DUP_FIELDNAME") {
          results.push("expected_due_date column already exists");
        } else {
          results.push(`Error adding expected_due_date: ${e.message}`);
        }
      }

      // Add expected_due_date column to baby_shower_events table
      try {
        await pool.execute(
          `ALTER TABLE baby_shower_events ADD COLUMN expected_due_date DATE`
        );
        results.push("Added expected_due_date column to baby_shower_events");
      } catch (e: any) {
        if (e.code === "ER_DUP_FIELDNAME") {
          results.push(
            "expected_due_date column already exists in baby_shower_events"
          );
        } else {
          results.push(
            `Error adding expected_due_date to baby_shower_events: ${e.message}`
          );
        }
      }

      // ========================================
      // BABY SHOWER TABLES FIX
      // ========================================

      // Fix baby_shower_purchases table - add created_at if missing
      try {
        await pool.execute(
          `ALTER TABLE baby_shower_purchases ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
        );
        results.push("Added created_at column to baby_shower_purchases");
      } catch (e: any) {
        if (e.code === "ER_DUP_FIELDNAME") {
          results.push(
            "created_at column already exists in baby_shower_purchases"
          );
        } else {
          results.push(
            `Error adding created_at to baby_shower_purchases: ${e.message}`
          );
        }
      }

      // Fix baby_shower_purchases - add notification_sent if missing
      try {
        await pool.execute(
          `ALTER TABLE baby_shower_purchases ADD COLUMN notification_sent INT DEFAULT 0`
        );
        results.push("Added notification_sent column to baby_shower_purchases");
      } catch (e: any) {
        if (e.code === "ER_DUP_FIELDNAME") {
          results.push(
            "notification_sent column already exists in baby_shower_purchases"
          );
        } else {
          results.push(`Error adding notification_sent: ${e.message}`);
        }
      }

      // Fix baby_shower_purchases - add notification_sent_at if missing
      try {
        await pool.execute(
          `ALTER TABLE baby_shower_purchases ADD COLUMN notification_sent_at TIMESTAMP NULL`
        );
        results.push(
          "Added notification_sent_at column to baby_shower_purchases"
        );
      } catch (e: any) {
        if (e.code === "ER_DUP_FIELDNAME") {
          results.push(
            "notification_sent_at column already exists in baby_shower_purchases"
          );
        } else {
          results.push(`Error adding notification_sent_at: ${e.message}`);
        }
      }

      // Fix baby_shower_purchases - modify package_id to NOT NULL
      // Skip this - it conflicts with FK constraint SET NULL
      // Instead, just check table structure

      // Add welcome_message column to baby_shower_events if missing
      try {
        await pool.execute(
          `ALTER TABLE baby_shower_events ADD COLUMN welcome_message TEXT`
        );
        results.push("Added welcome_message column to baby_shower_events");
      } catch (e: any) {
        if (e.code === "ER_DUP_FIELDNAME") {
          results.push("welcome_message column already exists in baby_shower_events");
        } else {
          results.push(`Error adding welcome_message: ${e.message}`);
        }
      }

      await pool.end();
      res.json({ success: true, results });
    } catch (error: any) {
      console.error("[db/fix-columns] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint to migrate all old WhatsApp media URLs to base64
  app.post("/api/media/migrate", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 5,
        uri: process.env.DATABASE_URL,
      });

      // Get all messages with WhatsApp media URLs
      const [rows]: any = await pool.execute(
        `SELECT cm.id, cm.file_url, cm.file_type 
         FROM conversation_messages cm 
         WHERE cm.file_url IS NOT NULL 
         AND cm.file_url LIKE '%whatsapp.net%'
         AND cm.file_url NOT LIKE 'data:%'
         LIMIT 50`
      );

      if (!rows || rows.length === 0) {
        await pool.end();
        return res.json({ message: "No images to migrate", processed: 0 });
      }

      let processed = 0;
      let failed = 0;

      for (const row of rows) {
        try {
          const mediaUrl = row.file_url;
          const response = await fetch(mediaUrl);

          if (!response.ok) {
            console.log(
              `[Migrate] Failed to download ${mediaUrl}: ${response.status}`
            );
            failed++;
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString("base64");
          const mimeType = row.file_type || "image/jpeg";
          const dataUrl = `data:${mimeType};base64,${base64}`;

          await pool.execute(
            "UPDATE conversation_messages SET file_url = ? WHERE id = ?",
            [dataUrl, row.id]
          );

          processed++;
          console.log(`[Migrate] Processed message ${row.id}`);
        } catch (err) {
          console.error(`[Migrate] Error processing ${row.id}:`, err);
          failed++;
        }
      }

      await pool.end();
      res.json({ message: "Migration complete", processed, failed });
    } catch (error) {
      console.error("[Media] Migration error:", error);
      res.status(500).json({ error: "Migration failed" });
    }
  });

  app.get("/api/events", async (req, res) => {
    // CORS headers for SSE with credentials
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    // Import cookie parser and auth
    const { COOKIE_NAME } = await import("@shared/const");
    const { verifyToken } = await import("../auth");
    const cookies = req.cookies || {};

    // Support: Authorization header, query param token, or session cookie
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token as string | undefined;
    const sessionCookie = cookies[COOKIE_NAME];

    let token: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (queryToken) {
      token = queryToken;
    } else if (sessionCookie) {
      token = sessionCookie;
    }

    console.log(
      "[SSE] Auth check - cookie:",
      sessionCookie ? "present" : "missing",
      "token:",
      token ? `${token.substring(0, 30)}...` : "missing"
    );

    if (!token) {
      console.log("[SSE] Unauthorized - no token found");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify token using the same method as the rest of the app
    const decoded = await verifyToken(token);

    if (!decoded) {
      console.log("[SSE] Token verification failed - invalid token");
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("[SSE] Token decoded:", decoded);

    // Get userId from token - could be userId or openId
    let userId: string;

    if (decoded.userId) {
      userId = String(decoded.userId);
    } else if (decoded.openId) {
      // Map openId to userId from database
      try {
        const { getDb } = await import("../db");
        const { users } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();

        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.openId, decoded.openId));

        if (!user) {
          console.log("[SSE] User not found for openId:", decoded.openId);
          return res.status(401).json({ error: "User not found" });
        }

        userId = String(user.id);
        console.log(
          "[SSE] Mapped openId to userId:",
          decoded.openId,
          "->",
          userId
        );
      } catch (e) {
        console.error("[SSE] Error mapping openId to userId:", e);
        return res.status(500).json({ error: "Internal server error" });
      }
    } else {
      console.log("[SSE] Token has no userId or openId");
      return res.status(401).json({ error: "Invalid token structure" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    console.log("[SSE] Client connected for userId:", userId);
    sseManager.addClient(userId, res);

    req.on("close", () => {
      console.log("[SSE] Client disconnected for userId:", userId);
    });
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Webhook routes for WhatsApp and Instagram
  const webhookRouter = await import("../webhooks");
  app.use("/api/webhooks", webhookRouter.default);
  // Baby Shower webhook routes
  const babyShowerWebhookRouter = await import("../webhook-baby-shower");
  app.use("/api/webhook/baby-shower", babyShowerWebhookRouter.default);

  // Test Routes - Sistema de Teste de Fluxos
  // Safety: disabled by default in production.
  const enableTestRoutes =
    process.env.ENABLE_TEST_ROUTES === "1" ||
    process.env.NODE_ENV === "development";
  if (enableTestRoutes) {
    const testFlowsRouter = await import("../test-flows");
    app.get("/api/test/status", testFlowsRouter.getSystemStatus);
    app.get("/api/test/flows", testFlowsRouter.listAllFlows);
    app.post("/api/test/activate/:id", testFlowsRouter.activateFlow);
    app.post("/api/test/simulate-message", testFlowsRouter.simulateMessage);
    app.post("/api/test/trigger-flow", testFlowsRouter.triggerFlowManually);
    app.get("/api/test/messages", testFlowsRouter.listRecentMessages);
    app.get("/api/test/health", testFlowsRouter.healthCheck);
    app.post("/api/test/clear-messages", testFlowsRouter.clearTestMessages);
  }

  // DEBUG routes - Always enabled for troubleshooting
  app.get("/api/debug/conversations", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const { conversations, users } = await import("../../drizzle/schema");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }
      const allConversations = await db
        .select({
          id: conversations.id,
          customerId: conversations.customerId,
          customerName: conversations.customerName,
          customerPhone: conversations.customerPhone,
          channel: conversations.channel,
          status: conversations.status,
          assignedTo: conversations.assignedTo,
          lastMessageAt: conversations.lastMessageAt,
          unreadCount: conversations.unreadCount,
        })
        .from(conversations)
        .orderBy(conversations.lastMessageAt);
      res.json({
        count: allConversations.length,
        conversations: allConversations,
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint REST para marcar conversa como lida
  app.post("/api/conversations/:id/mark-read", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const { getDb } = await import("../db");
      const { conversations, conversationMessages } =
        await import("../../drizzle/schema");
      const { eq, and, isNull } = await import("drizzle-orm");
      const db = await getDb();

      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      console.log(`[mark-read] Conversation ${conversationId}`);

      // 1. Zerar unreadCount da conversa
      await db
        .update(conversations)
        .set({ unreadCount: 0 })
        .where(eq(conversations.id, conversationId));

      // 2. Marcar todas mensagens do cliente como lidas
      await db
        .update(conversationMessages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(conversationMessages.conversationId, conversationId),
            eq(conversationMessages.senderType, "customer"),
            isNull(conversationMessages.readAt)
          )
        );

      console.log(`[mark-read] Success for conversation ${conversationId}`);
      res.json({ success: true, conversationId });
    } catch (error) {
      console.error("[mark-read] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Endpoint REST público para dashboard (sem auth)
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const period = (req.query.period as string) || "mes";
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const now = new Date();
      let start: Date;
      let end = now;

      switch (period) {
        case "hoje":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "ontem":
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          start = new Date(
            yesterday.getFullYear(),
            yesterday.getMonth(),
            yesterday.getDate()
          );
          end = new Date(
            yesterday.getFullYear(),
            yesterday.getMonth(),
            yesterday.getDate(),
            23,
            59,
            59
          );
          break;
        case "semana":
          start = new Date(now);
          start.setDate(now.getDate() - now.getDay());
          break;
        case "mes":
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const getRows = (result: any) =>
        Array.isArray(result) ? result[0] : result;

      // Total de conversas
      const totalConvResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM conversations
        WHERE opened_at >= ${start} AND opened_at <= ${end}
      `);
      const totalConv = getRows(totalConvResult);

      // Clientes únicos
      const uniqueResult = await db.execute(sql`
        SELECT COUNT(DISTINCT customer_phone) as count FROM conversations
        WHERE opened_at >= ${start} AND opened_at <= ${end}
      `);
      const unique = getRows(uniqueResult);

      // Mensagens enviadas (agentes)
      const sentResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM conversation_messages
        WHERE sender_type = 'agent' AND created_at >= ${start} AND created_at <= ${end}
      `);
      const sent = getRows(sentResult);

      // Mensagens recebidas (clientes)
      const receivedResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM conversation_messages
        WHERE sender_type = 'customer' AND created_at >= ${start} AND created_at <= ${end}
      `);
      const received = getRows(receivedResult);

      // Por canal
      const channelResult = await db.execute(sql`
        SELECT channel, COUNT(*) as count FROM conversations
        WHERE opened_at >= ${start} AND opened_at <= ${end}
        GROUP BY channel ORDER BY count DESC
      `);
      const channels = getRows(channelResult);

      // Por status
      const statusResult = await db.execute(sql`
        SELECT status, COUNT(*) as count FROM conversations
        WHERE opened_at >= ${start} AND opened_at <= ${end}
        GROUP BY status ORDER BY count DESC
      `);
      const statuses = getRows(statusResult);

      // Por hora
      const hourResult = await db.execute(sql`
        SELECT HOUR(created_at) as hour, COUNT(DISTINCT conversation_id) as chats
        FROM conversation_messages
        WHERE sender_type = 'customer' AND created_at >= ${start} AND created_at <= ${end}
        GROUP BY HOUR(created_at) ORDER BY HOUR(created_at)
      `);
      const hours = getRows(hourResult);

      // Desempenho por agente
      const agentResult = await db.execute(sql`
        SELECT 
          u.id, 
          u.name, 
          COUNT(DISTINCT c.id) as total_conversations,
          COUNT(DISTINCT CASE WHEN c.status = 'closed' THEN c.id END) as closed_conversations,
          COUNT(cm.id) as total_messages
        FROM users u
        LEFT JOIN conversations c ON c.assigned_to = u.id
        LEFT JOIN conversation_messages cm ON cm.conversation_id = c.id AND cm.sender_type = 'agent' AND cm.sender_id = u.id
        WHERE u.role = 'user'
        GROUP BY u.id, u.name
        ORDER BY total_conversations DESC
        LIMIT 10
      `);
      const agents = getRows(agentResult);

      res.json({
        totalConversations: totalConv?.[0]?.count || 0,
        uniqueCustomers: unique?.[0]?.count || 0,
        messagesSent: sent?.[0]?.count || 0,
        messagesReceived: received?.[0]?.count || 0,
        byChannel: channels || [],
        byStatus: statuses || [],
        byHour: hours || [],
        agentStats: (agents || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          avatar_url: null,
          total_conversations: Number(a.total_conversations) || 0,
          closed_conversations: Number(a.closed_conversations) || 0,
          total_messages: Number(a.total_messages) || 0,
        })),
        period,
        start,
        end,
      });
    } catch (error) {
      console.error("[dashboard/stats] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug: Contatos por hora
  app.get("/api/debug/contacts-by-hour", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      // Testar query direta
      const result = await db.execute(sql`
        SELECT 
          HOUR(created_at) as hour,
          COUNT(DISTINCT conversation_id) as chats
        FROM conversation_messages
        WHERE sender_type = 'customer'
          AND created_at >= ${start}
          AND created_at <= ${end}
        GROUP BY HOUR(created_at)
        ORDER BY HOUR(created_at)
      `);

      console.log("[debug/contacts-by-hour] Result:", result);

      res.json({
        start,
        end,
        rawResult: result,
        count: (result as any[]).length,
      });
    } catch (error) {
      console.error("[debug/contacts-by-hour] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug: Dashboard stats completo
  app.get("/api/debug/dashboard", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      // Função auxiliar para extrair rows do resultado
      const getRows = (result: any) =>
        Array.isArray(result) ? result[0] : result;

      // Total de conversas
      const totalConvResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM conversations
      `);
      const totalConv = getRows(totalConvResult);

      // Conversas de hoje
      const todayConvResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM conversations
        WHERE opened_at >= ${startOfDay}
      `);
      const todayConv = getRows(todayConvResult);

      // Mensagens
      const totalMsgResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM conversation_messages
      `);
      const totalMsg = getRows(totalMsgResult);

      // Mensagens por tipo
      const msgByTypeResult = await db.execute(sql`
        SELECT sender_type, COUNT(*) as count 
        FROM conversation_messages 
        GROUP BY sender_type
      `);
      const msgByType = getRows(msgByTypeResult);

      // Clientes únicos
      const uniqueCustomersResult = await db.execute(sql`
        SELECT COUNT(DISTINCT customer_phone) as count FROM conversations
      `);
      const uniqueCustomers = getRows(uniqueCustomersResult);

      // Por canal
      const byChannelResult = await db.execute(sql`
        SELECT channel, COUNT(*) as count 
        FROM conversations 
        GROUP BY channel
      `);
      const byChannel = getRows(byChannelResult);

      // Por status
      const byStatusResult = await db.execute(sql`
        SELECT status, COUNT(*) as count 
        FROM conversations 
        GROUP BY status
      `);
      const byStatus = getRows(byStatusResult);

      // Por hora (últimos 7 dias)
      const byHourResult = await db.execute(sql`
        SELECT HOUR(created_at) as hour, COUNT(DISTINCT conversation_id) as chats
        FROM conversation_messages
        WHERE sender_type = 'customer'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY HOUR(created_at)
        ORDER BY HOUR(created_at)
      `);
      const byHour = getRows(byHourResult);

      res.json({
        totalConversations: totalConv?.[0]?.count || 0,
        todayConversations: todayConv?.[0]?.count || 0,
        totalMessages: totalMsg?.[0]?.count || 0,
        messagesByType: msgByType,
        uniqueCustomers: uniqueCustomers?.[0]?.count || 0,
        byChannel: byChannel,
        byStatus: byStatus,
        byHour: byHour,
        _debug: {
          totalConv,
          todayConv,
          totalMsg,
          uniqueCustomers,
        },
      });
    } catch (error) {
      console.error("[debug/dashboard] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/debug/users", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users);
      res.json({ count: allUsers.length, users: allUsers });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/debug/received-messages", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const { receivedMessages } = await import("../../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }
      const messages = await db
        .select()
        .from(receivedMessages)
        .orderBy(desc(receivedMessages.createdAt))
        .limit(20);
      res.json({ count: messages.length, messages });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // FIX: Endpoint para corrigir conversas órfãs (status=assigned mas assignedTo=null)
  app.get("/api/fix-orphaned-conversations", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const { conversations } = await import("../../drizzle/schema");
      const { eq, and, isNull } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      // Buscar conversas órfãs
      const orphaned = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.status, "assigned"),
            isNull(conversations.assignedTo)
          )
        );

      if (orphaned.length === 0) {
        return res.json({
          success: true,
          message: "Nenhuma conversa órfã encontrada",
          fixed: 0,
        });
      }

      // Corrigir conversas órfãs
      await db
        .update(conversations)
        .set({ status: "open" })
        .where(
          and(
            eq(conversations.status, "assigned"),
            isNull(conversations.assignedTo)
          )
        );

      res.json({
        success: true,
        message: `${orphaned.length} conversa(s) corrigida(s)`,
        fixed: orphaned.length,
        ids: orphaned.map(c => c.id),
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // DEBUG: Verificar status específico de uma conversa
  app.get("/api/debug/conversation/:id", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const { conversations } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const convId = parseInt(req.params.id);
      const [conversation] = await db
        .select({
          id: conversations.id,
          status: conversations.status,
          assignedTo: conversations.assignedTo,
          customerName: conversations.customerName,
          channel: conversations.channel,
          lastMessageAt: conversations.lastMessageAt,
        })
        .from(conversations)
        .where(eq(conversations.id, convId));

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json({ conversation });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // FIX: Adicionar coluna last_signed_in na tabela users
  app.get("/api/fix/add-last-signed-in", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      // Verificar se a coluna já existe
      const columns = await db.execute(
        sql`SHOW COLUMNS FROM users LIKE 'last_signed_in'`
      );

      if (columns.length > 0) {
        return res.json({
          success: true,
          message: "Coluna last_signed_in já existe",
          exists: true,
        });
      }

      // Adicionar a coluna
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN last_signed_in DATETIME NULL`
      );

      res.json({
        success: true,
        message: "Coluna last_signed_in adicionada com sucesso",
        exists: false,
      });
    } catch (error) {
      console.error("[Fix] Error adding last_signed_in column:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // DIAGNOSTIC: Verificar estrutura das tabelas de baby shower
  app.get("/api/fix/diagnose-baby-shower-tables", async (req, res) => {
    try {
      const { getDbRaw } = await import("../db");
      const db = await getDbRaw();
      if (!db || !db.raw) {
        return res.status(500).json({ error: "Database not available" });
      }

      const results: any = {};

      // Verificar se as tabelas existem
      const tables = await db.raw(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name LIKE 'baby_shower%'
      `);
      results.tables = tables;

      // Verificar estrutura de cada tabela
      for (const table of [
        "baby_shower_events",
        "baby_shower_gift_packages",
        "baby_shower_purchases",
        "baby_shower_withdrawals",
      ]) {
        try {
          const columns = await db.raw(`DESCRIBE ${table}`);
          results[`${table}_columns`] = columns;
        } catch (e: any) {
          results[`${table}_error`] = e.message;
        }
      }

      // Testar query problemática
      try {
        const testQuery = await db.raw(`
          SELECT id FROM baby_shower_purchases LIMIT 1
        `);
        results.test_query = "SUCCESS";
        results.test_result = testQuery;
      } catch (e: any) {
        results.test_query = "FAILED";
        results.test_error = e.message;
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // FIX: Force recreate baby_shower_purchases table
  app.post("/api/fix/force-baby-shower-tables", async (req, res) => {
    try {
      const { getDbRaw } = await import("../db");
      const db = await getDbRaw();
      if (!db || !db.raw) {
        return res.status(500).json({ error: "Database not available" });
      }

      const results: string[] = [];

      // Verificar se tabela existe e dropar se necessário
      try {
        await db.raw(`DROP TABLE IF EXISTS baby_shower_purchases`);
        results.push("Dropped baby_shower_purchases table");
      } catch (e: any) {
        results.push(`Error dropping table: ${e.message}`);
      }

      // Recriar tabela com estrutura correta
      try {
        await db.raw(`
          CREATE TABLE baby_shower_purchases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_id INT NOT NULL,
            package_id INT NOT NULL,
            guest_customer_id INT NULL,
            guest_name VARCHAR(255) NOT NULL,
            guest_phone VARCHAR(20) NULL,
            guest_email VARCHAR(320) NULL,
            message_to_parents TEXT NULL,
            payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
            amount_paid DECIMAL(10,2) NOT NULL,
            payment_method VARCHAR(50) NULL,
            payment_reference VARCHAR(255) NULL,
            paid_at TIMESTAMP NULL,
            notification_sent INT DEFAULT 0,
            notification_sent_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE,
            FOREIGN KEY (package_id) REFERENCES baby_shower_gift_packages(id),
            FOREIGN KEY (guest_customer_id) REFERENCES customers(id) ON DELETE SET NULL
          )
        `);
        results.push("Created baby_shower_purchases table with correct structure");
      } catch (e: any) {
        results.push(`Error creating table: ${e.message}`);
      }

      // Verificar estrutura final
      const columns = await db.raw(`DESCRIBE baby_shower_purchases`);
      results.push(`Table structure: ${JSON.stringify(columns)}`);

      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // FIX: Force recreate baby_shower_withdrawals table
  app.post("/api/fix/force-baby-shower-withdrawals", async (req, res) => {
    try {
      const { getDbRaw } = await import("../db");
      const db = await getDbRaw();
      if (!db || !db.raw) {
        return res.status(500).json({ error: "Database not available" });
      }

      const results: string[] = [];

      // Drop e recriar tabela
      try {
        await db.raw(`DROP TABLE IF EXISTS baby_shower_withdrawals`);
        results.push("Dropped baby_shower_withdrawals table");
      } catch (e: any) {
        results.push(`Error dropping table: ${e.message}`);
      }

      // Recriar com estrutura correta (igual ao Drizzle schema)
      try {
        await db.raw(`
          CREATE TABLE baby_shower_withdrawals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_id INT NOT NULL,
            related_task_id INT NULL,
            withdrawal_type ENUM('diapers', 'wipes', 'money') NOT NULL DEFAULT 'diapers',
            diaper_size VARCHAR(20) NULL,
            quantity INT NOT NULL,
            requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            fulfilled_at TIMESTAMP NULL,
            status ENUM('requested', 'preparing', 'ready', 'delivered', 'cancelled') NOT NULL DEFAULT 'requested',
            fulfilled_by INT NULL,
            delivery_method ENUM('pickup', 'delivery') NOT NULL DEFAULT 'pickup',
            notes TEXT NULL,
            FOREIGN KEY (event_id) REFERENCES baby_shower_events(id) ON DELETE CASCADE,
            FOREIGN KEY (related_task_id) REFERENCES crm_tasks(id) ON DELETE SET NULL,
            FOREIGN KEY (fulfilled_by) REFERENCES users(id) ON DELETE SET NULL
          )
        `);
        results.push("Created baby_shower_withdrawals table with correct structure");
      } catch (e: any) {
        results.push(`Error creating table: ${e.message}`);
      }

      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // FIX: Add baby shower new columns (whatsapp_number, image_url)
  app.post("/api/fix/add-baby-shower-columns", async (req, res) => {
    try {
      const { getDbRaw } = await import("../db");
      const db = await getDbRaw();
      if (!db || !db.raw) {
        return res.status(500).json({ error: "Database not available" });
      }

      const results: string[] = [];

      // Add whatsapp_number to baby_shower_events
      try {
        await db.raw(`ALTER TABLE baby_shower_events ADD COLUMN whatsapp_number VARCHAR(20) NULL`);
        results.push("Added whatsapp_number to baby_shower_events");
      } catch (e: any) {
        if (e.code === "ER_DUP_FIELDNAME") {
          results.push("whatsapp_number already exists in baby_shower_events");
        } else {
          results.push(`Error adding whatsapp_number: ${e.message}`);
        }
      }

      // Add image_url to baby_shower_gift_packages
      try {
        await db.raw(`ALTER TABLE baby_shower_gift_packages ADD COLUMN image_url VARCHAR(500) NULL`);
        results.push("Added image_url to baby_shower_gift_packages");
      } catch (e: any) {
        if (e.code === "ER_DUP_FIELDNAME") {
          results.push("image_url already exists in baby_shower_gift_packages");
        } else {
          results.push(`Error adding image_url: ${e.message}`);
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // UPLOAD: Upload image for baby shower products
  app.post("/api/baby-shower/upload-image", async (req, res) => {
    try {
      const { image, filename } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "Image data required" });
      }

      // Extrair base64 da string data:image/xxx;base64,yyy
      const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: "Invalid image format. Expected data:image/xxx;base64,..." });
      }

      const extension = matches[1];
      const base64Data = matches[2];
      const originalBuffer = Buffer.from(base64Data, 'base64');

      // Otimizar imagem com sharp - redimensionar para 800px e comprimir
      let optimizedBuffer: Buffer;
      let finalExtension = 'webp';
      
      try {
        const sharp = (await import('sharp')).default;
        optimizedBuffer = await sharp(originalBuffer)
          .resize(800, 800, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .webp({ 
            quality: 80,
            effort: 4 
          })
          .toBuffer();
        
        console.log(`[Upload] Optimized: ${originalBuffer.length} → ${optimizedBuffer.length} bytes`);
      } catch (sharpError: any) {
        console.log("[Upload] Sharp error, using original:", sharpError.message);
        optimizedBuffer = originalBuffer;
        finalExtension = extension;
      }

      // Gerar nome único para o arquivo
      const uniqueName = `baby-shower-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Prioridade 1: Cloudinary (se configurado)
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const { v2: cloudinary } = await import('cloudinary');
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
          });
          
          const base64Optimized = optimizedBuffer.toString('base64');
          const dataUri = `data:image/${finalExtension};base64,${base64Optimized}`;
          
          const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'baby-shower',
            public_id: uniqueName,
            resource_type: 'image',
          });
          
          console.log("[Upload] Cloudinary success:", result.secure_url);
          return res.json({ success: true, url: result.secure_url });
        } catch (cloudinaryError: any) {
          console.error("[Upload] Cloudinary error:", cloudinaryError.message);
        }
      }
      
      // Prioridade 2: Storage do Forge (se configurado)
      try {
        const { storagePut } = await import("../storage");
        const result = await storagePut(`baby-shower/${uniqueName}.${finalExtension}`, optimizedBuffer, `image/${finalExtension}`);
        console.log("[Upload] Storage success:", result.url);
        return res.json({ success: true, url: result.url });
      } catch (storageError: any) {
        console.log("[Upload] Storage error:", storageError.message);
        
        // Prioridade 3: Imgur API
        try {
          const base64Optimized = optimizedBuffer.toString('base64');
          const imgurResponse = await fetch("https://api.imgur.com/3/image", {
            method: "POST",
            headers: {
              "Authorization": "Client-ID 546c25a59c58ad7",
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `image=${encodeURIComponent(base64Optimized)}&type=base64`,
          });

          const imgurData = await imgurResponse.json();
          
          if (imgurData.success && imgurData.data?.link) {
            console.log("[Upload] Imgur success:", imgurData.data.link);
            return res.json({ success: true, url: imgurData.data.link });
          }
          
          throw new Error(`Imgur failed: ${JSON.stringify(imgurData)}`);
        } catch (imgurError: any) {
          console.error("[Upload] Imgur error:", imgurError.message);
          
          // Último fallback: base64 data URL
          const dataUrl = `data:image/${finalExtension};base64,${optimizedBuffer.toString('base64')}`;
          console.log("[Upload] Using base64 fallback, size:", dataUrl.length);
          return res.json({ success: true, url: dataUrl, fallback: true });
        }
      }
    } catch (error: any) {
      console.error("[Upload] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug: Ver últimos mensagens recebidas com timestamps
  app.get("/api/debug/recent-messages", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = await mysql.createPool({ uri: process.env.DATABASE_URL });
      
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Mensagens da tabela messages
      const [messages]: any = await pool.execute(
        `SELECT id, channel, direction, content, created_at FROM messages ORDER BY created_at DESC LIMIT ${limit}`
      );

      // Mensagens da tabela received_messages
      const [receivedMessages]: any = await pool.execute(
        `SELECT id, from_number, from_name, message_text, timestamp, processed, created_at FROM received_messages ORDER BY created_at DESC LIMIT ${limit}`
      );

      // Mensagens da tabela conversation_messages
      const [conversationMessages]: any = await pool.execute(
        `SELECT id, conversation_id, sender_type, content, created_at FROM conversation_messages ORDER BY created_at DESC LIMIT ${limit}`
      );

      await pool.end();
      res.json({ 
        messages: messages,
        receivedMessages: receivedMessages,
        conversationMessages: conversationMessages
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug: Ver mensagens de um número específico
  app.get("/api/debug/messages/:phone", async (req, res) => {
    try {
      const mysql = await import("mysql2/promise");
      const pool = await mysql.createPool({ uri: process.env.DATABASE_URL });
      const phone = req.params.phone.replace(/\D/g, '');
      
      // Buscar em received_messages
      const [received]: any = await pool.execute(
        `SELECT id, from_number, from_name, message_text, timestamp, created_at 
         FROM received_messages 
         WHERE from_number LIKE '%${phone}%' 
         ORDER BY created_at DESC LIMIT 50`
      );

      // Buscar em conversation_messages via conversations
      const [conversations]: any = await pool.execute(
        `SELECT cm.id, c.phone_number, cm.sender_type, cm.content, cm.created_at 
         FROM conversation_messages cm 
         JOIN conversations c ON c.id = cm.conversation_id 
         WHERE c.phone_number LIKE '%${phone}%' 
         ORDER BY cm.created_at DESC LIMIT 50`
      );

      await pool.end();
      res.json({ 
        phone: phone,
        receivedMessages: received,
        conversationMessages: conversations
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug: Ver todos os webhooks recebidos recentemente
  const recentWebhooks: any[] = [];
  app.get("/api/debug/webhooks", (req, res) => {
    res.json({ 
      count: recentWebhooks.length,
      last10: recentWebhooks.slice(-10).map(w => ({
        time: w.time,
        event: w.event,
        from: w.from,
        message: w.message?.substring(0, 50)
      }))
    });
  });

  // PUBLIC: Add gift package to baby shower event (no auth required)
  app.post("/api/baby-shower/add-package", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const { eventCode, name, description, giftType, size, price, imageUrl, stockLimit } = req.body;

      if (!eventCode || !name || !price) {
        return res.status(400).json({ error: "eventCode, name, and price are required" });
      }

      // Find event by code
      const [event]: any = await db.execute(
        sql`SELECT id FROM baby_shower_events WHERE event_code = ${eventCode}`
      );

      if (!event || event.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }

      const eventId = event[0].id;

      // Insert package - using correct column names from schema
      const [result]: any = await db.execute(sql`
        INSERT INTO baby_shower_gift_packages 
        (event_id, package_name, description, gift_type, size_label, price, image_url, stock_limit, sold_count, is_active, created_at)
        VALUES (${eventId}, ${name}, ${description || null}, ${giftType || "diapers"}, ${size || null}, ${price}, ${imageUrl || null}, ${stockLimit || null}, 0, 1, NOW())
      `);

      res.json({ 
        success: true, 
        packageId: result.insertId,
        message: `Package "${name}" added to event ${eventCode}` 
      });
    } catch (error) {
      console.error("[baby-shower/add-package] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // PUBLIC: Update gift package (including image)
  app.put("/api/baby-shower/update-package/:id", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const packageId = parseInt(req.params.id);
      const { name, description, price, imageUrl, stockLimit, size, isActive } = req.body;

      if (!packageId) {
        return res.status(400).json({ error: "Package ID is required" });
      }

      // Build SET clauses using Drizzle sql template
      const setClauses: SQL[] = [];
      
      if (name !== undefined) {
        setClauses.push(sql`package_name = ${name}`);
      }
      if (description !== undefined) {
        setClauses.push(sql`description = ${description}`);
      }
      if (price !== undefined) {
        setClauses.push(sql`price = ${price}`);
      }
      if (imageUrl !== undefined) {
        setClauses.push(sql`image_url = ${imageUrl}`);
      }
      if (stockLimit !== undefined) {
        setClauses.push(sql`stock_limit = ${stockLimit}`);
      }
      if (size !== undefined) {
        setClauses.push(sql`size_label = ${size}`);
      }
      if (isActive !== undefined) {
        setClauses.push(sql`is_active = ${isActive ? 1 : 0}`);
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      // Join all SET clauses
      const setClause = sql.join(setClauses, sql`, `);
      
      await db.execute(sql`
        UPDATE baby_shower_gift_packages 
        SET ${setClause}
        WHERE id = ${packageId}
      `);

      res.json({ 
        success: true, 
        message: `Package ${packageId} updated` 
      });
    } catch (error) {
      console.error("[baby-shower/update-package] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // PUBLIC: List baby shower events (no auth required)
  app.get("/api/baby-shower/list-events", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const [events]: any = await db.execute(sql`
        SELECT id, event_code, event_name, status, created_at 
        FROM baby_shower_events 
        ORDER BY created_at DESC 
        LIMIT 20
      `);

      res.json({ success: true, events });
    } catch (error) {
      console.error("[baby-shower/list-events] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // FIX: Alterar image_url de VARCHAR(500) para TEXT
  app.post("/api/fix/alter-image-url-to-text", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      await db.execute(sql`
        ALTER TABLE baby_shower_gift_packages 
        MODIFY COLUMN image_url TEXT
      `);

      res.json({ success: true, message: "image_url column changed to TEXT" });
    } catch (error) {
      console.error("[fix/alter-image-url-to-text] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // FIX: Migrar colunas faltantes na tabela customers (Chá de Bebê)
  app.get("/api/fix/migrate-customers-baby-shower", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const results: { column: string; action: string }[] = [];

      // Colunas a verificar/adicionar
      const columnsToAdd = [
        {
          name: "expected_due_date",
          sql: "ALTER TABLE customers ADD COLUMN expected_due_date DATE NULL",
        },
        {
          name: "health_tags_json",
          sql: "ALTER TABLE customers ADD COLUMN health_tags_json TEXT NULL",
        },
        {
          name: "whatsapp_opt_in_at",
          sql: "ALTER TABLE customers ADD COLUMN whatsapp_opt_in_at TIMESTAMP NULL",
        },
      ];

      for (const col of columnsToAdd) {
        const check = await db.execute(
          sql`SHOW COLUMNS FROM customers LIKE ${col.name}`
        );
        if (check.length === 0) {
          await db.execute(sql.raw(col.sql));
          results.push({ column: col.name, action: "added" });
        } else {
          results.push({ column: col.name, action: "already_exists" });
        }
      }

      res.json({
        success: true,
        message: "Migração da tabela customers concluída",
        results,
      });
    } catch (error) {
      console.error("[Fix] Error migrating customers table:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // FIX: Adicionar colunas faltantes na tabela customers
  app.get("/api/fix/add-customer-columns", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const results: { column: string; status: string }[] = [];

      // Colunas a adicionar: expected_due_date, health_tags_json, whatsapp_opt_in_at
      const columnsToAdd = [
        {
          name: "expected_due_date",
          sql: sql`ALTER TABLE customers ADD COLUMN expected_due_date DATE NULL`,
        },
        {
          name: "health_tags_json",
          sql: sql`ALTER TABLE customers ADD COLUMN health_tags_json TEXT NULL`,
        },
        {
          name: "whatsapp_opt_in_at",
          sql: sql`ALTER TABLE customers ADD COLUMN whatsapp_opt_in_at TIMESTAMP NULL`,
        },
      ];

      for (const col of columnsToAdd) {
        try {
          // Verificar se a coluna já existe
          const check = await db.execute(
            sql`SHOW COLUMNS FROM customers LIKE ${col.name}`
          );
          if (check.length > 0) {
            results.push({ column: col.name, status: "already exists" });
          } else {
            await db.execute(col.sql);
            results.push({ column: col.name, status: "added successfully" });
          }
        } catch (err) {
          results.push({ column: col.name, status: `error: ${err}` });
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("[Fix] Error adding customer columns:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // EMERGENCY: Reset admin password
  app.get("/api/emergency/reset-admin-password", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const bcrypt = await import("bcryptjs");
      const db = await getDb();

      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      // Hash da senha "admin"
      const hashedPassword = await bcrypt.hash("admin", 10);

      // Atualizar senha do usuário admin (ID 1)
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, 1));

      res.json({
        success: true,
        message: "Senha do admin (ID 1) redefinida para 'admin'",
        login: "admin",
        password: "admin",
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // DEBUG: Check broadcast tables status
  app.get("/api/debug/check-broadcast-tables", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      // Check existing tables
      const tables = await db.execute(sql`SHOW TABLES LIKE 'broadcast%'`);

      // Get table names
      const tableNames = tables.map((row: any) => Object.values(row)[0]);

      res.json({
        tablesFound: tableNames,
      });
    } catch (error) {
      console.error("Error checking tables:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // DEBUG: Create broadcast tables manually
  app.get("/api/debug/create-broadcast-tables", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      // Check existing tables before
      const tablesBefore = await db.execute(sql`SHOW TABLES LIKE 'broadcast%'`);

      // Drop existing tables if they exist - disable FK checks first to avoid constraint errors
      await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
      await db.execute(sql`DROP TABLE IF EXISTS broadcast_messages`);
      await db.execute(sql`DROP TABLE IF EXISTS broadcast_list_members`);
      await db.execute(sql`DROP TABLE IF EXISTS broadcast_lists`);
      await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

      // Create broadcast_lists table with correct schema matching drizzle
      await db.execute(sql`
        CREATE TABLE broadcast_lists (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          created_by INT NOT NULL,
          status ENUM('active', 'paused', 'deleted') DEFAULT 'active' NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);

      // Create broadcast_list_members table
      await db.execute(sql`
        CREATE TABLE broadcast_list_members (
          id INT AUTO_INCREMENT PRIMARY KEY,
          list_id INT NOT NULL,
          customer_id INT NOT NULL,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          FOREIGN KEY (list_id) REFERENCES broadcast_lists(id) ON DELETE CASCADE,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          UNIQUE KEY unique_member (list_id, customer_id)
        )
      `);

      // Create broadcast_messages table
      await db.execute(sql`
        CREATE TABLE broadcast_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          list_id INT NOT NULL,
          content TEXT NOT NULL,
          sent_by INT NOT NULL,
          total_recipients INT NOT NULL,
          successful_sends INT DEFAULT 0,
          failed_sends INT DEFAULT 0,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          FOREIGN KEY (list_id) REFERENCES broadcast_lists(id) ON DELETE CASCADE,
          FOREIGN KEY (sent_by) REFERENCES users(id)
        )
      `);

      res.json({
        success: true,
        message: "Tabelas de broadcast recriadas com sucesso!",
        previousTables: tablesBefore,
      });
    } catch (error) {
      console.error("Error creating tables:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    // Dynamic import - only loads vite in development
    // vite.ts imports devDependencies that are not available in production
    const vitePath = "./vite";
    const { setupVite } = await import(
      /* webpackIgnore: true */
      /* @vite-ignore */
      vitePath
    );
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Railway requires exact PORT from environment variable
  const port = parseInt(process.env.PORT || "3000");
  console.log(`[Server] Starting on port ${port}...`);
  console.log(`[Server] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[Server] DATABASE_URL set: ${!!process.env.DATABASE_URL}`);

  // Bind to all interfaces to be accessible from Railway's router
  // Final API catch-all for unknown API routes (JSON only)
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      if (!res.headersSent) {
        res.status(404).json({ error: "Not found", path: req.originalUrl });
      } else {
        next();
      }
    } else {
      next();
    }
  });

  server.listen(port, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Run CRM migration on startup
    console.log("[Server] Running CRM migration...");
    await runCRMMigration();
    await runBabyShowerMigration();

    // Start simple chatbot after server is running
    import("../chatbot")
      .then(module => {
        module.startChatbot();
      })
      .catch(err => {
        console.error("Failed to start chatbot:", err);
      });

    // Start flow engine for selected Automation flows
    import("../flow-engine")
      .then(module => {
        module.startFlowEngine();
      })
      .catch(err => {
        console.error("Failed to start flow engine:", err);
      });

    // Start CRM outbox worker (async capture / projections)
    import("../crm-outbox-worker")
      .then(module => {
        module.startCrmOutboxWorker();
      })
      .catch(err => {
        console.error("Failed to start CRM outbox worker:", err);
      });

    // Start PharmaCore refill worker (creates tasks for upcoming refills)
    import("../pharma-refill-worker")
      .then(module => {
        module.startPharmaRefillWorker(10, 7, 3);
      })
      .catch(err => {
        console.error("Failed to start Pharma refill worker:", err);
      });

    // Start PharmaCore birthday worker (creates tasks on birthdays)
    import("../pharma-birthday-worker")
      .then(module => {
        module.startPharmaBirthdayWorker(720);
      })
      .catch(err => {
        console.error("Failed to start Pharma birthday worker:", err);
      });

    // Start idle conversation closer (30min without customer reply)
    import("../conversation-idle-worker")
      .then(module => {
        module.startConversationIdleWorker(2, 30, 50);
      })
      .catch(err => {
        console.error("Failed to start idle close worker:", err);
      });

    // Start pause auto-finisher worker
    import("../workers/pause-auto-finisher")
      .then(module => {
        module.startPauseAutoFinisher(1); // Check every 1 minute
        console.log("Pause auto-finisher worker started");
      })
      .catch(error => {
        console.error("Failed to start flow engine:", error);
      });

    // ========================================
    // EVOLUTION 1: Auto Image Search for Products
    // ========================================
    app.post("/api/baby-shower/auto-image/:packageId", async (req, res) => {
      try {
        const packageId = parseInt(req.params.packageId);
        const { productName } = req.body;

        if (!packageId || !productName) {
          return res.status(400).json({ error: "packageId and productName required" });
        }

        // Search for images via Serper API
        const SERPER_API_KEY = process.env.SERPER_API_KEY || "6abb2781d7edf99aa211c064912283e3c804e8c0";
        const response = await fetch("https://google.serper.dev/images", {
          method: "POST",
          headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: productName + " produto imagem oficial",
            gl: "br",
            hl: "pt-br",
          }),
        });

        if (!response.ok) {
          return res.status(500).json({ error: "Failed to search images" });
        }

        const data = await response.json();
        const images = data.images || [];
        
        if (images.length === 0) {
          return res.json({ success: false, error: "No images found" });
        }

        // Get first image
        const imageUrl = images[0].imageUrl || images[0].link;
        
        // Update in database
        const db = await getDb();
        if (db) {
          await db.execute(sql`
            UPDATE baby_shower_gift_packages 
            SET image_url = ${imageUrl}
            WHERE id = ${packageId}
          `);
        }

        res.json({ success: true, imageUrl });
      } catch (error) {
        console.error("[AutoImage] Error:", error);
        res.status(500).json({ error: String(error) });
      }
    });

    // ========================================
    // EVOLUTION 2: System Health Monitor
    // ========================================
    app.get("/api/system/health", async (req, res) => {
      try {
        const checks = [];
        
        // Check API
        const apiStart = Date.now();
        checks.push({
          service: "API",
          status: "ok",
          responseTime: Date.now() - apiStart,
          message: "API responding"
        });
        
        // Check Database
        try {
          const db = await getDb();
          if (db) {
            await db.execute(sql`SELECT 1`);
            checks.push({
              service: "Database",
              status: "ok",
              message: "Database connection OK"
            });
          } else {
            checks.push({
              service: "Database",
              status: "error",
              message: "Database not available"
            });
          }
        } catch (dbError) {
          checks.push({
            service: "Database",
            status: "error",
            message: String(dbError)
          });
        }
        
        res.json({
          lastCheck: new Date().toISOString(),
          checks,
          alerts: []
        });
      } catch (error) {
        console.error("[HealthMonitor] Error:", error);
        res.status(500).json({ error: String(error) });
      }
    });

    app.get("/api/system/status", async (req, res) => {
      try {
        const { getSystemStatus } = await import("../services/health-monitor");
        const status = getSystemStatus();
        res.json(status);
      } catch (error) {
        console.error("[HealthMonitor] Error:", error);
        res.status(500).json({ error: String(error) });
      }
    });

    console.log(`🚀 Server listening on port ${port}`);
  });
}

startServer().catch(console.error);
// rebuild Tue Mar  3 20:02:39 -03 2026
// FORCE REBUILD: 1772736794
