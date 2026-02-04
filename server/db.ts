import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  employees, 
  InsertEmployee,
  customers,
  InsertCustomer,
  leads,
  InsertLead,
  tickets,
  InsertTicket,
  notifications,
  InsertNotification,
  attachments,
  InsertAttachment,
  auditLogs,
  InsertAuditLog,
  automationFlows,
  InsertAutomationFlow,
  visualFlows,
  InsertVisualFlow,
  uraMenus,
  InsertUraMenu,
  apiConfigurations,
  InsertApiConfiguration
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Employee management
export async function createEmployee(employee: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(employees).values(employee);
  return result;
}

export async function getEmployeeByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllEmployees() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    employee: employees,
    user: users,
  }).from(employees).leftJoin(users, eq(employees.userId, users.id));
}

// Audit logging
export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(auditLogs).values(log);
}

// Customer management
export async function createCustomer(customer: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(customers).values(customer);
  return result;
}

export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(customers).orderBy(customers.createdAt);
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Lead management
export async function createLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(leads).values(lead);
  return result;
}

export async function getAllLeads() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(leads).orderBy(leads.createdAt);
}

// Ticket management
export async function createTicket(ticket: InsertTicket) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(tickets).values(ticket);
  return result;
}

export async function getAllTickets() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(tickets).orderBy(tickets.createdAt);
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Notification management
export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(notifications).values(notification);
  return result;
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(notifications.createdAt);
}

// Attachment management
export async function createAttachment(attachment: InsertAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(attachments).values(attachment);
  return result;
}

// Automation flows management
export async function getAllAutomationFlows() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(automationFlows).orderBy(automationFlows.createdAt);
}

export async function getAutomationFlowById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(automationFlows).where(eq(automationFlows.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAutomationFlow(flow: InsertAutomationFlow) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(automationFlows).values(flow);
  return result;
}

export async function updateAutomationFlow(id: number, updates: Partial<InsertAutomationFlow>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(automationFlows).set(updates).where(eq(automationFlows.id, id));
  return await getAutomationFlowById(id);
}

export async function deleteAutomationFlow(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(automationFlows).where(eq(automationFlows.id, id));
  return { success: true };
}

export async function toggleAutomationFlow(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(automationFlows).set({ isActive: isActive ? 1 : 0 }).where(eq(automationFlows.id, id));
  return await getAutomationFlowById(id);
}

// Visual flows management (N8N-style)
export async function getAllVisualFlows() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(visualFlows).orderBy(visualFlows.updatedAt);
}

export async function getVisualFlowById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(visualFlows).where(eq(visualFlows.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createVisualFlow(flow: InsertVisualFlow) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(visualFlows).values(flow);
  return result;
}

export async function updateVisualFlow(id: number, updates: Partial<InsertVisualFlow>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(visualFlows).set({ ...updates, updatedAt: new Date() }).where(eq(visualFlows.id, id));
  return await getVisualFlowById(id);
}

export async function deleteVisualFlow(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(visualFlows).where(eq(visualFlows.id, id));
  return { success: true };
}

export async function toggleVisualFlow(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(visualFlows).set({ isActive: isActive ? 1 : 0 }).where(eq(visualFlows.id, id));
  return await getVisualFlowById(id);
}

export async function incrementFlowExecution(id: number) {
  const db = await getDb();
  if (!db) return;
  
  const flow = await getVisualFlowById(id);
  if (flow) {
    await db.update(visualFlows)
      .set({ executionCount: (flow.executionCount || 0) + 1 })
      .where(eq(visualFlows.id, id));
  }
}

// URA menus management
export async function getAllUraMenus() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(uraMenus).orderBy(uraMenus.updatedAt);
}

export async function getUraMenuById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(uraMenus).where(eq(uraMenus.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveUraMenu() {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(uraMenus).where(eq(uraMenus.isActive, 1)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUraMenu(menu: InsertUraMenu) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(uraMenus).values(menu);
  return result;
}

export async function updateUraMenu(id: number, updates: Partial<InsertUraMenu>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(uraMenus).set({ ...updates, updatedAt: new Date() }).where(eq(uraMenus.id, id));
  return await getUraMenuById(id);
}

export async function deleteUraMenu(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(uraMenus).where(eq(uraMenus.id, id));
  return { success: true };
}

export async function toggleUraMenu(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Deactivate all other menus if activating this one
  if (isActive) {
    await db.update(uraMenus).set({ isActive: 0 });
  }
  
  await db.update(uraMenus).set({ isActive: isActive ? 1 : 0 }).where(eq(uraMenus.id, id));
  return await getUraMenuById(id);
}


// ============================================
// API CONFIGURATIONS
// ============================================

export async function getApiConfigurations() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(apiConfigurations);
}

export async function getApiConfigurationByProvider(provider: "whatsapp" | "instagram") {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(apiConfigurations).where(eq(apiConfigurations.provider, provider)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createApiConfiguration(config: InsertApiConfiguration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if configuration for this provider already exists
  const existing = await getApiConfigurationByProvider(config.provider);
  if (existing) {
    throw new Error(`Configuration for ${config.provider} already exists. Use update instead.`);
  }
  
  const result = await db.insert(apiConfigurations).values(config);
  return await getApiConfigurationByProvider(config.provider);
}

export async function updateApiConfiguration(provider: "whatsapp" | "instagram", updates: Partial<InsertApiConfiguration>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(apiConfigurations).set({ ...updates, updatedAt: new Date() }).where(eq(apiConfigurations.provider, provider));
  return await getApiConfigurationByProvider(provider);
}

export async function deleteApiConfiguration(provider: "whatsapp" | "instagram") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(apiConfigurations).where(eq(apiConfigurations.provider, provider));
  return { success: true };
}

export async function toggleApiConfiguration(provider: "whatsapp" | "instagram", isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(apiConfigurations).set({ isActive: isActive ? 1 : 0 }).where(eq(apiConfigurations.provider, provider));
  return await getApiConfigurationByProvider(provider);
}
