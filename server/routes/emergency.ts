import { Request, Response, Router } from "express";

const router = Router();

// GET /api/emergency/reset-admin-password
router.get("/reset-admin-password", async (req, res) => {
  res.json({ message: "Not implemented in new router yet" });
});

export default router;
