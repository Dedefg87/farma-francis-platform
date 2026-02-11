import { describe, it, expect, vi, beforeEach } from "vitest";
import { sseAuthMiddleware, sseRateLimitMiddleware } from "./sse-auth";
import { verifyToken } from "./auth";
import { logger } from "./_core/logger";

// Mock dependencies
vi.mock("./auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("./_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SSE Authentication Middleware", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      headers: {},
      ip: "127.0.0.1",
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe("sseAuthMiddleware", () => {
    it("should reject request without token", async () => {
      await sseAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication token required",
      });
      expect(next).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should reject request with invalid token", async () => {
      req.query.token = "invalid-token";
      (verifyToken as any).mockResolvedValueOnce(null);

      await sseAuthMiddleware(req, res, next);

      expect(verifyToken).toHaveBeenCalledWith("invalid-token");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid authentication token",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should accept request with valid token from query", async () => {
      req.query.token = "valid-token";
      const mockUser = { id: "user-123", email: "test@example.com" };
      (verifyToken as any).mockResolvedValueOnce(mockUser);

      await sseAuthMiddleware(req, res, next);

      expect(verifyToken).toHaveBeenCalledWith("valid-token");
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        "SSE connection authenticated",
        expect.any(Object)
      );
    });

    it("should accept request with valid token from header", async () => {
      req.headers.authorization = "Bearer valid-token";
      const mockUser = { id: "user-123", email: "test@example.com" };
      (verifyToken as any).mockResolvedValueOnce(mockUser);

      await sseAuthMiddleware(req, res, next);

      expect(verifyToken).toHaveBeenCalledWith("valid-token");
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it("should handle authentication errors gracefully", async () => {
      req.query.token = "some-token";
      (verifyToken as any).mockRejectedValueOnce(new Error("JWT error"));

      await sseAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Authentication error" });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("sseRateLimitMiddleware", () => {
    it("should reject request without userId", () => {
      sseRateLimitMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "User ID required" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should allow request within rate limit", () => {
      req.query.userId = "user-123";

      sseRateLimitMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should block request exceeding rate limit", () => {
      req.query.userId = "user-456";

      // Make 10 requests (at limit)
      for (let i = 0; i < 10; i++) {
        sseRateLimitMiddleware(req, res, next);
      }

      // Reset mocks for the 11th request
      next.mockClear();
      res.status.mockClear();
      res.json.mockClear();

      // 11th request should be blocked
      sseRateLimitMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: "Too many connection attempts",
      });
      expect(next).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        "SSE rate limit exceeded",
        expect.any(Object)
      );
    });

    it("should allow requests after rate limit window passes", async () => {
      req.query.userId = "user-789";

      // Make requests up to limit
      for (let i = 0; i < 10; i++) {
        sseRateLimitMiddleware(req, res, next);
      }

      // All 10 requests should have been allowed
      expect(next).toHaveBeenCalledTimes(10);
    });
  });
});
