import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: role,
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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Customers Router", () => {
  it("should list customers for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const customers = await caller.customers.list();
    expect(Array.isArray(customers)).toBe(true);
  });

  it("should create a customer with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.customers.create({
      name: "Test Customer",
      email: "customer@test.com",
      phone: "+5511999999999",
      status: "active",
    });

    expect(result).toBeDefined();
  });
});

describe("Leads Router", () => {
  it("should list leads for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const leads = await caller.leads.list();
    expect(Array.isArray(leads)).toBe(true);
  });

  it("should create a lead with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.leads.create({
      name: "Test Lead",
      email: "lead@test.com",
      phone: "+5511888888888",
      source: "whatsapp",
      stage: "prospect",
      value: 1000,
    });

    expect(result).toBeDefined();
  });
});

describe("Tickets Router", () => {
  it("should list tickets for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tickets = await caller.tickets.list();
    expect(Array.isArray(tickets)).toBe(true);
  });

  it("should create a ticket with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const ticketNumber = `TKT-${Date.now()}`;
    const result = await caller.tickets.create({
      ticketNumber,
      subject: "Test Ticket",
      description: "This is a test ticket",
      status: "open",
      priority: "medium",
      channel: "web",
    });

    expect(result).toBeDefined();
  });
});

describe("Employees Router", () => {
  it("should list employees for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const employees = await caller.employees.list();
    expect(Array.isArray(employees)).toBe(true);
  });
});

describe("Notifications Router", () => {
  it("should list notifications for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const notifications = await caller.notifications.list();
    expect(Array.isArray(notifications)).toBe(true);
  });
});

describe("Auth Router", () => {
  it("should return user info for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
  });

  it("should return null for unauthenticated users", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});
