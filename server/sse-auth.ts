import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth";
import { logger } from "./_core/logger";

/**
 * SSE Authentication Middleware
 * Validates JWT token for SSE connections
 */
export async function sseAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from query parameter or header
    const token =
      (req.query.token as string) ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      logger.warn("SSE connection attempt without token", {
        ip: req.ip,
        userId: req.query.userId,
      });
      res.status(401).json({ error: "Authentication token required" });
      return;
    }

    // Verify token
    const user = await verifyToken(token);

    if (!user) {
      logger.warn("SSE connection attempt with invalid token", {
        ip: req.ip,
        userId: req.query.userId,
      });
      res.status(401).json({ error: "Invalid authentication token" });
      return;
    }

    // Attach user to request
    (req as any).user = user;

    // Log successful authentication
    logger.info("SSE connection authenticated", {
      userId: user.id,
      ip: req.ip,
    });

    next();
  } catch (error) {
    logger.error("SSE authentication error", error);
    res.status(500).json({ error: "Authentication error" });
  }
}

/**
 * Rate limiting for SSE connections
 * Prevents connection spam
 */
const connectionAttempts = new Map<
  string,
  { count: number; lastAttempt: number }
>();

export function sseRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.query.userId as string;

  if (!userId) {
    res.status(400).json({ error: "User ID required" });
    return;
  }

  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxAttempts = 10; // Max 10 connections per minute

  const attempts = connectionAttempts.get(userId);

  if (attempts) {
    if (now - attempts.lastAttempt > windowMs) {
      // Reset counter after window
      connectionAttempts.set(userId, { count: 1, lastAttempt: now });
    } else if (attempts.count >= maxAttempts) {
      logger.warn("SSE rate limit exceeded", {
        userId,
        attempts: attempts.count,
      });
      res.status(429).json({ error: "Too many connection attempts" });
      return;
    } else {
      attempts.count++;
      attempts.lastAttempt = now;
    }
  } else {
    connectionAttempts.set(userId, { count: 1, lastAttempt: now });
  }

  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance
    cleanupOldEntries(windowMs);
  }

  next();
}

function cleanupOldEntries(windowMs: number) {
  const now = Date.now();
  for (const [userId, data] of connectionAttempts.entries()) {
    if (now - data.lastAttempt > windowMs) {
      connectionAttempts.delete(userId);
    }
  }
}
