import "dotenv/config";
console.log("[Server] Starting initialization...");

import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import { sql } from "drizzle-orm";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./serveStatic";
import { sseManager } from "./sse";

// Redeploy trigger: log a lightweight marker to force a redeploy in CI/CD pipelines
console.log("[Deploy] Redeploy trigger activated: patch applied on startup");
import { logger } from "./logger";
import { runCRMMigration } from "../crm-migration";

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

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
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
        serverTime: new Date().toISOString()
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

  // Debug: testar Evolution API getBase64FromMediaMessage
  app.get("/api/debug/test-evolution-media", async (req, res) => {
    try {
      const { getMediaBase64FromEvolution } = await import("../media-download");
      
      // Test with a recent message
      const mysql = await import("mysql2/promise");
      const pool = mysql.createPool({
        connectionLimit: 1,
        uri: process.env.DATABASE_URL,
      });

      const [rows]: any = await pool.execute(
        `SELECT id, external_message_id, raw_payload 
         FROM conversation_messages 
         WHERE file_type IS NOT NULL 
         ORDER BY id DESC 
         LIMIT 1`
      );
      await pool.end();

      if (rows.length === 0) {
        return res.json({ error: "No media messages found" });
      }

      const msg = rows[0];
      const rawPayload = typeof msg.raw_payload === 'string' ? JSON.parse(msg.raw_payload) : msg.raw_payload;
      
      console.log("[Test Evolution Media] Testing message:", msg.id);
      console.log("[Test Evolution Media] external_message_id:", msg.external_message_id);

      // Try to get base64
      const result = await getMediaBase64FromEvolution({
        id: msg.external_message_id || msg.id.toString(),
        remoteJid: rawPayload?.key?.remoteJid,
        fromMe: false,
      });

      res.json({
        messageId: msg.id,
        externalId: msg.external_message_id,
        result: result ? { 
          success: true, 
          size: result.base64Data.length,
          mimeType: result.mimeType 
        } : { success: false }
      });
    } catch (error) {
      console.error("[Test Evolution Media] Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Debug: testar ingestInboundConversationMessage
  app.post("/api/debug/test-ingest", async (req, res) => {
    try {
      const { ingestInboundConversationMessage } = await import("../db-messages");
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
        stack: error instanceof Error ? error.stack : null
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

      // If it's a regular URL (not base64), it's likely an expired WhatsApp URL
      // Return 404 instead of redirecting to a blocked/expired URL
      console.log(
        "[Media] file_url is not a data URL, likely expired WhatsApp URL:",
        fileUrl.substring(0, 50)
      );
      return res.status(404).json({ error: "Image not found or expired" });
    } catch (error) {
      console.error("[Media] Error serving media:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Debug: list old WhatsApp media URLs for migration planning
  app.get("/api/media/inspect-old", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const { conversationMessages } = await import("../../drizzle/schema");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { sql } = await import("drizzle-orm");
      const rows = await db
        .select({
          id: conversationMessages.id,
          fileUrl: conversationMessages.fileUrl,
          fileType: conversationMessages.fileType,
        })
        .from(conversationMessages)
        .limit(100);

      // Filter old WhatsApp URLs in memory (avoid dialect specifics)
      const old = rows.filter(
        (r: any) =>
          typeof r.fileUrl === "string" && r.fileUrl.includes("whatsapp.net")
      );
      res.json({ count: old.length, rows: old });
    } catch (error) {
      console.error("[Inspect Old]", error);
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

    console.log("[SSE] Auth check - cookie:", sessionCookie ? "present" : "missing", "token:", token ? `${token.substring(0, 30)}...` : "missing");

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
        
        const [user] = await db.select({ id: users.id }).from(users).where(eq(users.openId, decoded.openId));
        
        if (!user) {
          console.log("[SSE] User not found for openId:", decoded.openId);
          return res.status(401).json({ error: "User not found" });
        }
        
        userId = String(user.id);
        console.log("[SSE] Mapped openId to userId:", decoded.openId, "->", userId);
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
      const columns = await db.execute(sql`SHOW COLUMNS FROM users LIKE 'last_signed_in'`);
      
      if (columns.length > 0) {
        return res.json({
          success: true,
          message: "Coluna last_signed_in já existe",
          exists: true,
        });
      }

      // Adicionar a coluna
      await db.execute(sql`ALTER TABLE users ADD COLUMN last_signed_in DATETIME NULL`);
      
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
        { name: "expected_due_date", sql: "ALTER TABLE customers ADD COLUMN expected_due_date DATE NULL" },
        { name: "health_tags_json", sql: "ALTER TABLE customers ADD COLUMN health_tags_json TEXT NULL" },
        { name: "whatsapp_opt_in_at", sql: "ALTER TABLE customers ADD COLUMN whatsapp_opt_in_at TIMESTAMP NULL" },
      ];

      for (const col of columnsToAdd) {
        const check = await db.execute(sql`SHOW COLUMNS FROM customers LIKE ${col.name}`);
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
        { name: "expected_due_date", sql: sql`ALTER TABLE customers ADD COLUMN expected_due_date DATE NULL` },
        { name: "health_tags_json", sql: sql`ALTER TABLE customers ADD COLUMN health_tags_json TEXT NULL` },
        { name: "whatsapp_opt_in_at", sql: sql`ALTER TABLE customers ADD COLUMN whatsapp_opt_in_at TIMESTAMP NULL` },
      ];

      for (const col of columnsToAdd) {
        try {
          // Verificar se a coluna já existe
          const check = await db.execute(sql`SHOW COLUMNS FROM customers LIKE ${col.name}`);
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
  server.listen(port, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Run CRM migration on startup
    console.log("[Server] Running CRM migration...");
    await runCRMMigration();

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
  });
}

startServer().catch(console.error);
