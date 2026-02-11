import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  executeAutomationWithSSE,
  saveMessageAndNotify,
} from "./automation-sse";
import { sseManager, EVENTS } from "./_core/sse";
import { getDb } from "./db";

// Mock dependencies
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./_core/sse", () => ({
  sseManager: {
    emitToUser: vi.fn(),
  },
  EVENTS: {
    MESSAGE_NEW: "message:new",
    CONVERSATION_UPDATE: "conversation:update",
  },
}));

vi.mock("./_core/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../drizzle/schema", () => ({
  conversations: {},
  conversationMessages: {},
}));

describe("Automation SSE Integration", () => {
  let mockDb: any;
  let currentCapturedValues: any[] = [];

  const createMockDb = () => {
    const capturedValues: any[] = [];
    currentCapturedValues = capturedValues;
    const db: any = {};
    Object.assign(db, {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 456 }]), // Return a conversation
      insert: vi.fn().mockReturnValue(db),
      values: vi.fn((...args: any[]) => {
        capturedValues.push(args);
        return db;
      }),
      $returningId: vi.fn().mockResolvedValue([{ insertId: 123 }]),
      get capturedValues() {
        return capturedValues;
      },
    });
    return db;
  };

  beforeEach(() => {
    mockDb = createMockDb();
    (getDb as any).mockResolvedValue(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("executeAutomationWithSSE", () => {
    it("should execute welcome-message automation successfully", async () => {
      const params = {
        automationId: "welcome-message",
        templateType: "pharma",
        customerId: 1,
        context: { name: "John" },
      };

      const result = await executeAutomationWithSSE(params);

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(sseManager.emitToUser).toHaveBeenCalledTimes(2); // MESSAGE_NEW + CONVERSATION_UPDATE
    });

    it("should execute follow-up-2h automation successfully", async () => {
      const params = {
        automationId: "follow-up-2h",
        templateType: "pharma",
        customerId: 1,
      };

      const result = await executeAutomationWithSSE(params);

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should execute urgent-notification automation successfully", async () => {
      const params = {
        automationId: "urgent-notification",
        templateType: "pharma",
        customerId: 1,
      };

      const result = await executeAutomationWithSSE(params);

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should execute offer-reminder automation successfully", async () => {
      const params = {
        automationId: "offer-reminder",
        templateType: "pharma",
        customerId: 1,
      };

      const result = await executeAutomationWithSSE(params);

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should execute custom automation for unknown automationId", async () => {
      const params = {
        automationId: "custom-automation",
        templateType: "pharma",
        customerId: 1,
        context: {},
      };

      const result = await executeAutomationWithSSE(params);

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should find active conversation when conversationId is not provided", async () => {
      mockDb.limit.mockResolvedValueOnce([{ id: 456 }]);

      const params = {
        automationId: "welcome-message",
        templateType: "pharma",
        customerId: 1,
      };

      await executeAutomationWithSSE(params);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should use provided conversationId when available", async () => {
      const params = {
        automationId: "welcome-message",
        templateType: "pharma",
        customerId: 1,
        conversationId: 789,
      };

      await executeAutomationWithSSE(params);

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should return error when database is not available", async () => {
      (getDb as any).mockResolvedValueOnce(null);

      const params = {
        automationId: "welcome-message",
        templateType: "pharma",
        customerId: 1,
      };

      const result = await executeAutomationWithSSE(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database not available");
    });

    it("should handle errors gracefully", async () => {
      mockDb.insert.mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const params = {
        automationId: "welcome-message",
        templateType: "pharma",
        customerId: 1,
      };

      const result = await executeAutomationWithSSE(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should greet based on time of day - morning", async () => {
      const morningHour = new Date().setHours(8, 0, 0, 0);
      vi.setSystemTime(morningHour);

      const params = {
        automationId: "welcome-message",
        templateType: "pharma",
        customerId: 1,
        context: { name: "John" },
      };

      await executeAutomationWithSSE(params);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Bom dia"),
        })
      );
    });

    it("should greet based on time of day - afternoon", async () => {
      const afternoonHour = new Date().setHours(14, 0, 0, 0);
      vi.setSystemTime(afternoonHour);

      const params = {
        automationId: "welcome-message",
        templateType: "pharma",
        customerId: 1,
        context: { name: "John" },
      };

      await executeAutomationWithSSE(params);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Boa tarde"),
        })
      );
    });

    it("should greet based on time of day - evening", async () => {
      const eveningHour = new Date().setHours(20, 0, 0, 0);
      vi.setSystemTime(eveningHour);

      const params = {
        automationId: "welcome-message",
        templateType: "pharma",
        customerId: 1,
        context: { name: "John" },
      };

      await executeAutomationWithSSE(params);

      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Boa noite"),
        })
      );
    });
  });

  describe("saveMessageAndNotify", () => {
    it("should not save message when conversationId is undefined", async () => {
      await saveMessageAndNotify(mockDb, undefined, 1, "Test message", "test");

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(sseManager.emitToUser).not.toHaveBeenCalled();
    });

    it("should save message with correct senderType", async () => {
      await saveMessageAndNotify(mockDb, 123, 1, "Test message", "test");

      const insertCall = mockDb.values.mock.calls[0][0];
      expect(insertCall.senderType).toBe("agent");
      expect(insertCall.content).toBe("Test message");
      expect(insertCall.conversationId).toBe(123);
    });

    it("should emit MESSAGE_NEW event", async () => {
      await saveMessageAndNotify(mockDb, 123, 1, "Test message", "test");

      expect(sseManager.emitToUser).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          type: EVENTS.MESSAGE_NEW,
          data: expect.objectContaining({
            conversationId: 123,
            message: expect.objectContaining({
              content: "Test message",
              senderType: "agent",
            }),
          }),
        })
      );
    });

    it("should emit CONVERSATION_UPDATE event", async () => {
      await saveMessageAndNotify(mockDb, 123, 1, "Test message", "test");

      expect(sseManager.emitToUser).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          type: EVENTS.CONVERSATION_UPDATE,
          data: expect.objectContaining({
            conversationId: 123,
            lastMessage: "Test message",
          }),
        })
      );
    });
  });
});
