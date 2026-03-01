import rateLimit from "express-rate-limit";
import { Request } from "express";

/**
 * Security configurations for production
 * Implements rate limiting per user (not global)
 */

// Key generator that uses user ID or IP address
export function getRateLimitKey(req: Request): string {
  // If user is authenticated, use user ID
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback to IP address
  const forwarded = req.headers["x-forwarded-for"] as string | undefined;
  const ip = forwarded?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  return `ip:${ip}`;
}

// Stricter rate limiting for authenticated users (per user)
export const authenticatedLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per authenticated user
  keyGenerator: (req) => {
    const userId = (req as any).user?.id;
    return userId ? `auth:user:${userId}` : `ip:${req.ip}`;
  },
  message: {
    error: "Too many requests - please slow down",
    retryAfter: "60 seconds"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More permissive for public endpoints
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  keyGenerator: (req) => {
    // Use forwarded IP for behind-proxy scenarios
    const forwarded = req.headers["x-forwarded-for"] as string | undefined;
    const ip = forwarded?.split(",")[0]?.trim() || req.ip || "unknown";
    return `public:${ip}`;
  },
  message: {
    error: "Too many requests from this IP"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook endpoints - separate high limit
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute (for burst webhook traffic)
  keyGenerator: (req) => {
    // Identify by webhook signature if available, else by IP
    const sig = req.headers["x-hub-signature-256"] as string | undefined;
    if (sig) return `webhook:sig:${sig.substring(0, 16)}`;
    return `webhook:ip:${req.ip}`;
  },
  message: {
    error: "Webhook rate limit exceeded"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin endpoint strict rate limiting
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per admin
  keyGenerator: (req) => {
    const userId = (req as any).user?.id;
    const isAdmin = (req as any).user?.role === "admin";
    return isAdmin ? `admin:${userId}` : `non-admin:${userId || req.ip}`;
  },
  message: {
    error: "Admin actions rate limited - please wait"
  },
  standardHeaders: true,
  legacyHeaders: false,
});
