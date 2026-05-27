import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "./db";
import { applySqlMigrations } from "./_core/migrations";
import path from "path";
import { eq, and, sql } from "drizzle-orm";
import { conversations, conversationMessages } from "../drizzle/schema";
import { users } from "../drizzle/schema";
// __dirname is natively available in CJS (esbuild --format=cjs)
import { appRouter } from "./routers/index";
import { createContext } from "./_core/trpc/context";
import healthRouter from "./_core/routes/health";
import createSSERouter from "./routers-sse";
import mediaRouter from "./routers-media";
import { sseManager } from "./_core/sse";
import webhooksRouter from "./webhooks";
import { restRouter } from "./routers-rest";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

// In CJS (esbuild --format=cjs), __dirname is provided by the Node.js module wrapper
// No need to define it via import.meta.url

async function startServer() {
  console.log("[Server] Starting... (PID:", process.pid, ")");

  try {
    console.log("[DB] Connecting...");
    const db = await getDb();
    console.log("[DB] Connected successfully");

    console.log("[Migrations] Applying...");
    await applySqlMigrations();
    console.log("[Migrations] Applied successfully");

    // Ensure critical tables exist (safety net)
    try {
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`CREATE TABLE IF NOT EXISTS internal_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        recipient_id INT NOT NULL,
        content TEXT NOT NULL,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_internal_messages_conversation ON internal_messages(conversation_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_internal_messages_recipient ON internal_messages(recipient_id, read_at)`);
      console.log("[DB] ✅ internal_messages table ensured");
    } catch (tableErr: unknown) {
      console.warn("[DB] ⚠️ Could not create internal_messages:", tableErr.message);
    }

    // Safety net: ensure customers.source column exists
    try {
      const [colRows] = await db.execute(sql`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'source'`);
      if (!Array.isArray(colRows) || colRows.length === 0) {
        await db.execute(sql`ALTER TABLE customers ADD COLUMN source VARCHAR(64) DEFAULT 'manual' AFTER status`);
        console.log("[DB] ✅ customers.source column added");
      }
    } catch (colErr: unknown) {
      console.warn("[DB] ⚠️ Could not add customers.source:", colErr.message);
    }
  } catch (error) {
    console.error("[Startup Error]", error);
    throw error;
  }

  const app = express();
  // Aumentar limite do body-parser para 50MB (padrão é 100kb)
  // Helmet — headers de segurança (config customizada pra não quebrar iframes)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // TODO: remover unsafe-inline depois
        workerSrc: ["'self'", "blob:"], // Permite workers (blob: para createObjectURL)
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://*"], // permite imagens do R2/externas
        connectSrc: ["'self'", "https://innovative-enjoyment-production-ed8f.up.railway.app"],
      },
    },
    frameguard: { action: "sameorigin" }, // Permite iframe da mesma origem (PDF previews)
    hsts: process.env.NODE_ENV === "production", // HSTS só em produção
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false,     // Necessário pra R2/embeds externos
  }));

  // CORS — controla quem pode chamar a API de outros domínios
  // Frontend e backend são same-origin (mesmo domínio), então CORS não deve bloquear
  const allowedOrigins = [
    process.env.PUBLIC_BASE_URL,           // URL do frontend (Railway)
    "https://innovative-enjoyment-production-ed8f.up.railway.app", // Railway URL
    "http://localhost:5173",                // Dev local
    "http://localhost:3000",                // Dev local alt
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Sem origin = server-to-server (Evolution API webhooks) — permitir
      if (!origin) return callback(null, true);
      // Origem permitida
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Se a origin termina com .up.railway.app, permitir (deploy previews)
      if (origin.endsWith(".up.railway.app")) return callback(null, true);
      // Fallback: permitir (mesmo domínio não manda origin header)
      callback(null, true);
    },
    credentials: true,  // Necessário pra cookies/auth do tRPC
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use((req, res, next) => {
    console.log('[BODY]', req.method, req.url, '| Body:', JSON.stringify(req.body).substring(0, 200));
    next();
  });
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // Serve static files from multiple possible locations
  const possiblePublicPaths = [
    path.resolve(process.cwd(), 'dist/public'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(__dirname, '../dist/public'),
    path.resolve(__dirname, 'public'),
    '/app/dist/public',
    '/app/client/dist',
  ];
  
  let publicPath = null;
  for (const p of possiblePublicPaths) {
    const exists = require('fs').existsSync(p);
    console.log(`[Static] Checking: ${p} - ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (exists) {
      publicPath = p;
      break;
    }
  }
  
  if (publicPath) {
    console.log('[Static] ✅ Serving from:', publicPath);
    app.use(express.static(publicPath));
  } else {
    console.error('[Static] ❌ No static files found! Checked:', possiblePublicPaths);
    console.log('[Static] CWD:', process.cwd());
    console.log('[Static] __dirname:', __dirname);
  }

  app.get("/api/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/health/detail", healthRouter);

  app.get("/api/test", (_, res) => {
    res.json({ ok: true });
  });

  // Debug: show all request headers
  app.get("/api/debug/headers", (req, res) => {
    res.json({
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/debug/env", (req, res) => {
    res.json({
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
      nodeEnv: process.env.NODE_ENV,
    });
  });

  app.use("/api/trpc", (req, res, next) => {
    console.log("[tRPC]", req.method, req.url);
    next();
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // SSE endpoint para notificações em tempo real
  app.use("/api/events", createSSERouter());

  // Webhooks para WhatsApp, Instagram e Evolution API
  app.use("/api/webhooks", webhooksRouter);
  app.use("/api/media", mediaRouter);

  // REST endpoints para templates de fluxo (contatos, mensagens, tarefas, atendimentos)
  app.use("/api", restRouter);

  // Rotas REST do sistema (storage, clean, etc.)
  const systemRestRouter = require("./_core/routes/system").default;
  app.use("/api/system", systemRestRouter);

  // Debug: List all database tables
  app.get("/api/debug/db-tables", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql } = await import("drizzle-orm");
      const [result] = await db.execute(sql`SHOW TABLES`);
      const tables = (result as any[]).map((row: unknown) => Object.values(row)[0]);
      res.json({ tables: tables.sort(), count: tables.length });
    } catch (err: unknown) {
      res.status(500).json({ error: err.message });
    }
  });

  // Debug: Show columns for a table
  app.get("/api/debug/db-columns/:table", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql } = await import("drizzle-orm");
      const tableName = req.params.table.replace(/[^a-z_]/gi, "");
      const [result] = await db.execute(sql.raw(`DESCRIBE ${tableName}`));
      res.json({ table: tableName, columns: result });
    } catch (err: unknown) {
      res.status(500).json({ error: err.message });
    }
  });

  // Debug: Check recent conversations and messages
  // Debug: Close all open/assigned conversations (for admin actions)
  app.post("/api/debug/close-all-conversations", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql } = await import("drizzle-orm");
      const now = new Date();
      const result = await db.execute(sql`UPDATE conversations SET status = 'closed', closedAt = ${now} WHERE status IN ('open', 'assigned')`);
      res.json({ success: true, closed: result.affectedRows || 0 });
    } catch (err: unknown) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/debug/conversations-status", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql } = await import("drizzle-orm");

      // Count conversations by status
      const [statusCounts] = await db.execute(sql`
        SELECT status, COUNT(*) as count, 
               SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END) as unassigned,
               SUM(CASE WHEN assigned_to IS NOT NULL THEN 1 ELSE 0 END) as assigned
        FROM conversations 
        GROUP BY status
      `);

      // Last 5 conversations
      const [recentConvs] = await db.execute(sql`
        SELECT id, customer_name, customer_phone, status, assigned_to, 
               last_message_at, unread_count, channel
        FROM conversations 
        WHERE status IN ('open', 'assigned')
        ORDER BY last_message_at DESC LIMIT 5
      `);

      // Last 5 messages
      const [recentMsgs] = await db.execute(sql`
        SELECT cm.id, cm.conversation_id, cm.sender_type, cm.content, cm.created_at,
               cm.external_id
        FROM conversation_messages cm
        ORDER BY cm.created_at DESC LIMIT 5
      `);

      // SSE connected users
      const sseUsers = sseManager.getConnectedUsers();

      res.json({
        statusCounts,
        recentConversations: recentConvs,
        recentMessages: recentMsgs,
        sseConnectedUsers: sseUsers,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  // Debug: Check users and fix orphaned conversations
  app.get("/api/debug/users-and-fix", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql } = await import("drizzle-orm");

      // Get all users using simple select
      const allUsers = await db.select().from(users);

      // Count orphaned conversations — use parameterized values
      const [orphanRows] = await db.execute(sql`SELECT COUNT(*) as cnt FROM conversations WHERE status = ${"open"} AND assigned_to IS NULL`);

      res.json({
        activeUsers: allUsers.map((u: unknown) => ({ id: u.id, name: u.displayName || u.name, role: u.role })),
        orphanedCount: orphanRows,
        sseConnectedUsers: sseManager.getConnectedUsers(),
      });
    } catch (err: unknown) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  // Fix: Assign orphaned conversations to the least loaded agent
  app.post("/api/debug/fix-orphans", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql } = await import("drizzle-orm");

      // Get first admin user, OR the SSE-connected user if available
      const allUsers = await db.select().from(users);
      const sseUsers = sseManager.getConnectedUsers();
      // Priority: use the SSE-connected user (they're online right now)
      const connectedAdmin = sseUsers.length > 0
        ? allUsers.find((u: unknown) => String(u.id) === sseUsers[0])
        : null;
      const admin = connectedAdmin || allUsers.find((u: unknown) => u.role === 'admin') || allUsers[0];
      if (!admin) {
        return res.json({ error: "No active agent found" });
      }

      // Assign all orphaned conversations to this agent
      const [result] = await db.execute(sql`UPDATE conversations SET assigned_to = ${admin.id}, status = ${"assigned"} WHERE status = ${"open"} AND assigned_to IS NULL`);

      res.json({
        assignedTo: { id: admin.id, name: admin.displayName || admin.name, role: admin.role },
        result: result,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  // Mark conversation as read
  app.post("/api/conversations/:id/mark-read", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
      const conversationId = parseInt(req.params.id, 10);
      if (isNaN(conversationId)) { res.status(400).json({ error: "Invalid ID" }); return; }
      await db
        .update(conversationMessages)
        .set({ readAt: new Date() })
        .where(and(
          eq(conversationMessages.conversationId, conversationId),
          eq(conversationMessages.senderType, "customer"),
          sql`${conversationMessages.readAt} IS NULL`
        ));
      await db
        .update(conversations)
        .set({ unreadCount: 0 })
        .where(eq(conversations.id, conversationId));
      res.json({ success: true });
    } catch (err: unknown) {
      console.error("[mark-read] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Broadcast file upload
  app.post("/api/broadcast/upload-temp-file", async (req, res) => {
    try {
      // Parse multipart manually (simple approach for single file)
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', async () => {
        const rawBody = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        
        // Parse multipart form data
        const boundary = contentType.split('boundary=')[1];
        if (!boundary) {
          res.status(400).json({ error: 'No boundary in multipart' });
          return;
        }
        
        const boundaryBuf = Buffer.from(`--${boundary}`);
        const parts: { headers: string; body: Buffer }[] = [];
        let start = 0;
        
        while (true) {
          const idx = rawBody.indexOf(boundaryBuf, start);
          if (idx === -1) break;
          if (start > 0) {
            const partData = rawBody.slice(start, idx - 2); // -2 for \r\n before boundary
            const headerEnd = partData.indexOf('\r\n\r\n');
            if (headerEnd !== -1) {
              parts.push({
                headers: partData.slice(0, headerEnd).toString(),
                body: partData.slice(headerEnd + 4),
              });
            }
          }
          start = idx + boundaryBuf.length + 2; // +2 for \r\n after boundary
        }
        
        // Find the file part
        let filePart = parts.find(p => p.headers.includes('filename='));
        if (!filePart) {
          res.status(400).json({ error: 'No file found in upload' });
          return;
        }
        
        // Extract filename
        const filenameMatch = filePart.headers.match(/filename="([^"]+)"/);
        const originalName = filenameMatch?.[1] || 'file';
        
        // Extract content type from part headers
        const ctMatch = filePart.headers.match(/Content-Type:\s*([^\r\n]+)/i);
        const mimetype = ctMatch?.[1] || 'application/octet-stream';
        
        // Remove trailing \r\n from body
        let fileBuffer = filePart.body;
        if (fileBuffer.length >= 2 && fileBuffer[fileBuffer.length - 2] === 0x0D && fileBuffer[fileBuffer.length - 1] === 0x0A) {
          fileBuffer = fileBuffer.slice(0, -2);
        }
        
        // Upload to R2
        const { uploadToR2 } = await import('./r2-client.js');
        const result = await uploadToR2(fileBuffer, originalName, mimetype);
        
        res.json({
          fileUrl: result.url,
          fileName: originalName,
          fileType: mimetype,
          fileSize: fileBuffer.length,
        });
      });
    } catch (err: unknown) {
      console.error('[broadcast/upload] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Logging middleware for debugging
  app.use((req, res, next) => {
    console.log('[Request]', req.method, req.originalUrl || req.url);
    next();
  });

  app.get("*", (req, res) => {
    console.log('[SPA] Hit', req.method, req.originalUrl || req.url, req.path);
    if (!req.path.startsWith("/api")) {
      // Try multiple possible paths for index.html
      const possibleIndexPaths = [
        path.resolve(process.cwd(), 'dist/public/index.html'),
        path.resolve(process.cwd(), 'client/dist/index.html'),
        path.resolve(__dirname, '../dist/public/index.html'),
        path.resolve(__dirname, 'public/index.html'),
      ];
      
      let indexPath = null;
      for (const p of possibleIndexPaths) {
        if (require("fs").existsSync(p)) {
          indexPath = p;
          console.log('[SPA] Using index.html:', p);
          break;
        }
      }
      
      if (!indexPath) {
        console.error('[SPA] ERROR: index.html not found in:', possibleIndexPaths);
        return res.status(404).json({ error: "Frontend not found" });
      }
      
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("[SPA Fallback] File not found:", indexPath);
          res.status(404).json({ error: "Frontend not found" });
        }
      });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  const PORT = process.env.PORT || 3000;
  console.log(`[Server] Attempting to listen on port ${PORT}...`);

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("[Server] ✅ Successfully listening on port", PORT);
    console.log("[Server] Environment:", process.env.NODE_ENV || "development");
    console.log("[Server] Health check endpoint: /api/health");

    // Start broadcast recovery worker (reprocesses stuck broadcasts)
    import('./workers/broadcast-recovery.js').then(({ startBroadcastRecoveryWorker }) => {
      startBroadcastRecoveryWorker();
    }).catch(err => {
      console.warn('[Server] ⚠️ Failed to start broadcast recovery worker:', err.message);
    });
  });

  server.on('error', (error) => {
    console.error("[Server] ❌ Failed to start server:", error);
  });
}

startServer().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
// Railway deploy: Mon May  4 14:22:25 -03 2026
// Trigger redeploy 1779922491
