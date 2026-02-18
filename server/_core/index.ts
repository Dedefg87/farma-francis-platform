import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import { sql } from "drizzle-orm";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sseManager } from "./sse";
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

  // Debug logging middleware
  try {
    const debugModule = await import("../debug");
    app.use(debugModule.webhookLogger);
  } catch (e) {
    console.error("[Server] Debug module not loaded");
  }

  app.use("/api/", apiLimiter);

  app.get("/api/events", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const jwt = await import("jsonwebtoken");
    let decoded: { userId: number } | null = null;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: number;
      };
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sseManager.addClient(String(decoded.userId), res);

    req.on("close", () => {
      // sseManager.addClient already registers a close handler for cleanup.
    });
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Webhook routes for WhatsApp and Instagram
  const webhookRouter = await import("../webhooks");
  app.use("/api/webhooks", webhookRouter.default);

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

      // Get schema for each table if exists
      const schemas: any = {};
      for (const row of tables as any[]) {
        const tableName = String(Object.values(row)[0]);
        const columns = await db.execute(
          sql`DESCRIBE ${sql.identifier(tableName)}`
        );
        schemas[tableName] = columns;
      }

      res.json({
        tablesFound: tables,
        schemas: schemas,
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
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, async () => {
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
