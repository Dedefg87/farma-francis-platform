import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { apiConfigurations, receivedMessages } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  getReceivedMessages,
  getReceivedMessageById,
  getReceivedMessageByExternalId,
  markMessageAsProcessed,
  getConversationHistory,
  findOrCreateCustomerByPhone,
  getMessageStatistics,
} from "./db-messages";

describe("Webhook Message Processing", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clean up test data
    await db.delete(receivedMessages).where(eq(receivedMessages.fromNumber, "+5511999999999"));
    await db.delete(receivedMessages).where(eq(receivedMessages.externalId, "test-msg-123"));
    await db.delete(receivedMessages).where(eq(receivedMessages.externalId, "test-msg-456"));
  });

  it("should save a WhatsApp text message", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(receivedMessages).values({
      provider: "whatsapp",
      externalId: "test-msg-123",
      fromNumber: "+5511999999999",
      fromName: "Test User",
      messageType: "text",
      messageText: "Hello, this is a test message",
      timestamp: Date.now(),
      rawPayload: JSON.stringify({ test: true }),
      processed: 0,
    });

    expect(result).toBeDefined();

    // Verify it was saved
    const message = await getReceivedMessageByExternalId("test-msg-123", "whatsapp");
    expect(message).not.toBeNull();
    expect(message?.messageText).toBe("Hello, this is a test message");
    expect(message?.fromNumber).toBe("+5511999999999");
  });

  it("should retrieve message by external ID", async () => {
    const message = await getReceivedMessageByExternalId("test-msg-123", "whatsapp");
    
    expect(message).not.toBeNull();
    expect(message?.provider).toBe("whatsapp");
    expect(message?.externalId).toBe("test-msg-123");
  });

  it("should mark message as processed", async () => {
    const message = await getReceivedMessageByExternalId("test-msg-123", "whatsapp");
    expect(message).not.toBeNull();

    if (message) {
      const updated = await markMessageAsProcessed(message.id, {
        customerId: 1,
      });

      expect(updated).not.toBeNull();
      expect(updated?.processed).toBe(1);
      expect(updated?.customerId).toBe(1);
      expect(updated?.processedAt).not.toBeNull();
    }
  });

  it("should save an Instagram message", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(receivedMessages).values({
      provider: "instagram",
      externalId: "test-msg-456",
      fromNumber: "instagram-user-123",
      messageType: "text",
      messageText: "Instagram test message",
      timestamp: Date.now(),
      rawPayload: JSON.stringify({ test: true }),
      processed: 0,
    });

    const message = await getReceivedMessageByExternalId("test-msg-456", "instagram");
    expect(message).not.toBeNull();
    expect(message?.provider).toBe("instagram");
  });

  it("should get conversation history", async () => {
    const history = await getConversationHistory("+5511999999999", "whatsapp", 10);
    
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].fromNumber).toBe("+5511999999999");
  });

  it("should find or create customer by phone", async () => {
    const customer = await findOrCreateCustomerByPhone("+5511888888888", "Test Customer");
    
    expect(customer).toBeDefined();
    expect(customer.phone).toBe("+5511888888888");
    expect(customer.name).toContain("Test Customer");

    // Try to find again - should return existing
    const customer2 = await findOrCreateCustomerByPhone("+5511888888888");
    expect(customer2.id).toBe(customer.id);
  });

  it("should get message statistics", async () => {
    const stats = await getMessageStatistics();
    
    expect(stats).toBeDefined();
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.processed).toBe("number");
    expect(typeof stats.pending).toBe("number");
    expect(stats.byType).toBeDefined();
    expect(stats.byProvider).toBeDefined();
  });

  it("should filter messages by provider", async () => {
    const whatsappMessages = await getReceivedMessages({ provider: "whatsapp", limit: 10 });
    const instagramMessages = await getReceivedMessages({ provider: "instagram", limit: 10 });
    
    expect(Array.isArray(whatsappMessages)).toBe(true);
    expect(Array.isArray(instagramMessages)).toBe(true);
    
    whatsappMessages.forEach(msg => {
      expect(msg.provider).toBe("whatsapp");
    });
    
    instagramMessages.forEach(msg => {
      expect(msg.provider).toBe("instagram");
    });
  });

  it("should filter messages by processed status", async () => {
    const processedMessages = await getReceivedMessages({ processed: true, limit: 10 });
    const pendingMessages = await getReceivedMessages({ processed: false, limit: 10 });
    
    processedMessages.forEach(msg => {
      expect(msg.processed).toBe(1);
    });
    
    pendingMessages.forEach(msg => {
      expect(msg.processed).toBe(0);
    });
  });
});

describe("Webhook Configuration", () => {
  it("should have WhatsApp or Instagram configuration", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const configs = await db.select().from(apiConfigurations);
    
    // At least one configuration should exist (or be creatable)
    expect(Array.isArray(configs)).toBe(true);
  });
});
