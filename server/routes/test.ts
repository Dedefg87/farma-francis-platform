import { Request, Response, Router } from "express";

const router = Router();

// GET /api/test/status
router.get("/status", async (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /api/test/flows
router.get("/flows", async (req, res) => {
  res.json({ flows: [] });
});

// POST /api/test/activate/:id
router.post("/activate/:id", async (req, res) => {
  res.json({ success: true });
});

// POST /api/test/simulate-message
router.post("/simulate-message", async (req, res) => {
  res.json({ success: true });
});

// POST /api/test/trigger-flow
router.post("/trigger-flow", async (req, res) => {
  res.json({ success: true });
});

// GET /api/test/messages
router.get("/messages", async (req, res) => {
  res.json({ messages: [] });
});

// GET /api/test/health
router.get("/health", async (req, res) => {
  res.json({ status: "ok" });
});

// POST /api/test/clear-messages
router.post("/clear-messages", async (req, res) => {
  res.json({ success: true });
});

export default router;
