import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { apiConfigurations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("API Configuration Routes", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // Create a mock context with a test user
    const mockContext = {
      user: {
        id: 1,
        openId: "test-open-id",
        name: "Test User",
        email: "test@example.com",
        role: "admin" as const,
      },
    };
    caller = appRouter.createCaller(mockContext);

    // Clean up any existing test configurations
    const db = await getDb();
    if (db) {
      await db.delete(apiConfigurations).where(eq(apiConfigurations.provider, "whatsapp"));
      await db.delete(apiConfigurations).where(eq(apiConfigurations.provider, "instagram"));
    }
  });

  it("should return null when no configuration exists", async () => {
    const whatsappConfig = await caller.apiConfig.getByProvider({ provider: "whatsapp" });
    expect(whatsappConfig).toBeNull();

    const instagramConfig = await caller.apiConfig.getByProvider({ provider: "instagram" });
    expect(instagramConfig).toBeNull();
  });

  it("should create WhatsApp configuration", async () => {
    const config = await caller.apiConfig.create({
      provider: "whatsapp",
      token: "test-whatsapp-token",
      phoneNumberId: "123456789",
      webhookUrl: "https://example.com/webhook",
      webhookVerifyToken: "verify-token",
    });

    expect(config).toBeDefined();
    expect(config?.provider).toBe("whatsapp");
    expect(config?.token).toBe("test-whatsapp-token");
    expect(config?.phoneNumberId).toBe("123456789");
  });

  it("should retrieve existing WhatsApp configuration", async () => {
    const config = await caller.apiConfig.getByProvider({ provider: "whatsapp" });
    
    expect(config).not.toBeNull();
    expect(config?.provider).toBe("whatsapp");
    expect(config?.token).toBe("test-whatsapp-token");
  });

  it("should update WhatsApp configuration", async () => {
    const updated = await caller.apiConfig.update({
      provider: "whatsapp",
      token: "updated-token",
      phoneNumberId: "987654321",
    });

    expect(updated).toBeDefined();
    expect(updated?.token).toBe("updated-token");
    expect(updated?.phoneNumberId).toBe("987654321");
  });

  it("should toggle WhatsApp configuration active status", async () => {
    // Toggle to active
    const activated = await caller.apiConfig.toggle({
      provider: "whatsapp",
      isActive: true,
    });
    expect(activated?.isActive).toBe(1);

    // Toggle to inactive
    const deactivated = await caller.apiConfig.toggle({
      provider: "whatsapp",
      isActive: false,
    });
    expect(deactivated?.isActive).toBe(0);
  });

  it("should delete WhatsApp configuration", async () => {
    const result = await caller.apiConfig.delete({ provider: "whatsapp" });
    expect(result.success).toBe(true);

    // Verify it's deleted
    const config = await caller.apiConfig.getByProvider({ provider: "whatsapp" });
    expect(config).toBeNull();
  });

  it("should create Instagram configuration", async () => {
    const config = await caller.apiConfig.create({
      provider: "instagram",
      token: "test-instagram-token",
      pageId: "instagram-page-123",
      webhookUrl: "https://example.com/webhook/instagram",
      webhookVerifyToken: "instagram-verify",
    });

    expect(config).toBeDefined();
    expect(config?.provider).toBe("instagram");
    expect(config?.token).toBe("test-instagram-token");
    expect(config?.pageId).toBe("instagram-page-123");
  });

  it("should list all configurations", async () => {
    const configs = await caller.apiConfig.list();
    expect(Array.isArray(configs)).toBe(true);
    expect(configs.length).toBeGreaterThan(0);
    expect(configs.some(c => c.provider === "instagram")).toBe(true);
  });
});
