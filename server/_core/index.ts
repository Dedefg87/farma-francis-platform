import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
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
      sseManager.addClient(String(decoded.userId), res);
    });
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Webhook routes for WhatsApp and Instagram
  const webhookRouter = await import("../webhooks");
  app.use("/api/webhooks", webhookRouter.default);

  // Test Routes - Sistema de Teste de Fluxos
  const testFlowsRouter = await import("../test-flows");
  app.get("/api/test/status", testFlowsRouter.getSystemStatus);
  app.get("/api/test/flows", testFlowsRouter.listAllFlows);
  app.post("/api/test/activate/:id", testFlowsRouter.activateFlow);
  app.post("/api/test/simulate-message", testFlowsRouter.simulateMessage);
  app.post("/api/test/trigger-flow", testFlowsRouter.triggerFlowManually);
  app.get("/api/test/messages", testFlowsRouter.listRecentMessages);
  app.get("/api/test/health", testFlowsRouter.healthCheck);
  app.post("/api/test/clear-messages", testFlowsRouter.clearTestMessages);

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
