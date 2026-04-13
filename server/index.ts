import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "./db";
import { applySqlMigrations } from "./_core/migrations";
import path from "path";
import { eq, and, sql } from "drizzle-orm";
import { conversations, conversationMessages } from "../drizzle/schema";
// __dirname is natively available in CJS (esbuild --format=cjs)
import { appRouter } from "./routers/index";
import { createContext } from "./_core/trpc/context";
import healthRouter from "./_core/routes/health";
import createSSERouter from "./routers-sse";
import webhooksRouter from "./webhooks";
import cookieParser from "cookie-parser";

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
    } catch (tableErr: any) {
      console.warn("[DB] ⚠️ Could not create internal_messages:", tableErr.message);
    }

    // Safety net: ensure customers.source column exists
    try {
      const [colRows] = await db.execute(sql`SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'source'`);
      if (!Array.isArray(colRows) || colRows.length === 0) {
        await db.execute(sql`ALTER TABLE customers ADD COLUMN source VARCHAR(64) DEFAULT 'manual' AFTER status`);
        console.log("[DB] ✅ customers.source column added");
      }
    } catch (colErr: any) {
      console.warn("[DB] ⚠️ Could not add customers.source:", colErr.message);
    }
  } catch (error) {
    console.error("[Startup Error]", error);
    throw error;
  }

  const app = express();
  // Aumentar limite do body-parser para 50MB (padrão é 100kb)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  const publicPath = path.join(__dirname, "../dist/public");
  app.use(express.static(publicPath));
  console.log("[Static] Serving from:", publicPath);

  app.get("/api/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/health/detail", healthRouter);

  app.get("/api/test", (_, res) => {
    res.json({ ok: true });
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

  // Debug: List all database tables
  app.get("/api/debug/db-tables", async (_, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { sql } = await import("drizzle-orm");
      const [result] = await db.execute(sql`SHOW TABLES`);
      const tables = (result as any[]).map((row: any) => Object.values(row)[0]);
      res.json({ tables: tables.sort(), count: tables.length });
    } catch (err: any) {
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
    } catch (err: any) {
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
    } catch (err: any) {
      console.error('[broadcast/upload] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Image proxy for WhatsApp profile pictures (pps.whatsapp.net blocks direct browser access)
  app.get("/api/proxy-image", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        res.status(400).json({ error: 'Missing url parameter' });
        return;
      }

      // Only allow WhatsApp CDN URLs to prevent abuse
      if (!imageUrl.startsWith('https://pps.whatsapp.net/') && !imageUrl.startsWith('https://mmg.whatsapp.net/')) {
        res.status(403).json({ error: 'Only WhatsApp CDN URLs are allowed' });
        return;
      }

      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        res.status(response.status).json({ error: `Upstream returned ${response.status}` });
        return;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await response.arrayBuffer());

      // Cache for 1 hour
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(buffer);
    } catch (err: any) {
      console.error('[proxy-image] Error:', err.message);
      res.status(500).json({ error: 'Failed to fetch image' });
    }
  });

  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      const indexPath = path.join(__dirname, "../dist/public/index.html");
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
