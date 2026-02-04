import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("automation flows", () => {
  it("should list all automation flows", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const flows = await caller.automation.list();

    expect(Array.isArray(flows)).toBe(true);
  });

  it("should create a new automation flow", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const newFlow = {
      name: "Test Flow",
      description: "Test automation flow",
      channel: "whatsapp" as const,
      trigger: "test, hello",
      response: "This is a test response",
    };

    const result = await caller.automation.create(newFlow);

    expect(result).toBeDefined();
    expect(result.insertId).toBeGreaterThan(0);
  });

  it("should toggle automation flow status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a flow first
    const newFlow = {
      name: "Toggle Test Flow",
      description: "Test toggle functionality",
      channel: "instagram" as const,
      trigger: "toggle",
      response: "Toggle response",
    };

    const created = await caller.automation.create(newFlow);
    const flowId = created.insertId;

    // Toggle to inactive
    const toggled = await caller.automation.toggle({
      id: flowId,
      isActive: false,
    });

    expect(toggled).toBeDefined();
    expect(toggled?.isActive).toBe(0);

    // Toggle back to active
    const toggledAgain = await caller.automation.toggle({
      id: flowId,
      isActive: true,
    });

    expect(toggledAgain?.isActive).toBe(1);
  });

  it("should update an automation flow", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a flow first
    const newFlow = {
      name: "Update Test Flow",
      description: "Original description",
      channel: "both" as const,
      trigger: "update",
      response: "Original response",
    };

    const created = await caller.automation.create(newFlow);
    const flowId = created.insertId;

    // Update the flow
    const updated = await caller.automation.update({
      id: flowId,
      name: "Updated Flow Name",
      description: "Updated description",
      response: "Updated response",
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe("Updated Flow Name");
    expect(updated?.description).toBe("Updated description");
    expect(updated?.response).toBe("Updated response");
  });

  it("should delete an automation flow", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a flow first
    const newFlow = {
      name: "Delete Test Flow",
      description: "Will be deleted",
      channel: "whatsapp" as const,
      trigger: "delete",
      response: "Delete response",
    };

    const created = await caller.automation.create(newFlow);
    const flowId = created.insertId;

    // Delete the flow
    const result = await caller.automation.delete({ id: flowId });

    expect(result).toEqual({ success: true });
  });
});
