import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import {
  users,
  customers,
  leads,
  tickets,
  notifications,
  visualFlows,
  automationFlows,
  uraMenus,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function upsertUser(userData: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserByOpenId(userData.openId);

  if (existing) {
    // Update
    await db
      .update(users)
      .set({
        ...(userData.name !== undefined && { name: userData.name }),
        ...(userData.email !== undefined && { email: userData.email }),
        ...(userData.loginMethod !== undefined && {
          loginMethod: userData.loginMethod,
        }),
        ...(userData.lastSignedIn != null && {
          lastSignedIn: userData.lastSignedIn,
        }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    return await getUserByOpenId(userData.openId);
  } else {
    // Insert
    const result = await db.insert(users).values({
      openId: userData.openId,
      name: userData.name || null,
      email: userData.email || null,
      loginMethod: userData.loginMethod || null,
      lastSignedIn: userData.lastSignedIn || new Date(),
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return await getUserByOpenId(userData.openId);
  }
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Configurar pool com mais conexões e timeout maior
      const db = drizzle(process.env.DATABASE_URL, {
        connection: {
          // Pool configuration
          waitForConnections: true,
          connectionLimit: 50, // Aumentado para 50 (era 20)
          queueLimit: 0,
          // Timeouts
          connectTimeout: 20000, // 20s
          acquireTimeout: 20000, // 20s
          // Keepalive
          enableKeepAlive: true,
          keepAliveInitialDelay: 0,
        },
      });
      _db = db;
      console.log("[Database] Connected successfully with enhanced pool (50)");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export type DbType = ReturnType<typeof drizzle>;

export async function getDbRaw() {
  const db = await getDb();
  if (!db) {
    console.error("[Database] Database not available");
    return null;
  }

  try {
    // Access the underlying mysql2 connection through drizzle's session
    const session = (db as any).session;
    if (!session || !session.client) {
      throw new Error("Could not access underlying database connection");
    }
    const client = session.client;

    // Test the connection
    await client.execute("SELECT 1");

    return {
      raw: async (sql: string, values?: any[]) => {
        // Use mysql2's execute method for prepared statements with parameters
        const [rows] = await client.execute(sql, values);
        return rows;
      },
      ...db,
    };
  } catch (error) {
    console.error("[Database] Error accessing raw client:", error);
    return db as any;
  }
}

// ==================== CUSTOMERS ====================

export async function getAllCustomers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(customers).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createCustomer(data: {
  name: string;
  email?: string;
  phone?: string;
  cpfCnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  tags?: string;
  notes?: string;
  status?: "active" | "inactive" | "blocked";
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: any = await db.insert(customers).values({
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    cpfCnpj: data.cpfCnpj || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zipCode || null,
    tags: data.tags || null,
    notes: data.notes || null,
    status: data.status || "active",
    createdBy: data.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const insertId = Number((result as any)?.insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    return { success: true };
  }
  return await getCustomerById(insertId);
}

// ==================== LEADS ====================

export async function getAllLeads() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(leads).orderBy(desc(leads.updatedAt));
}

export async function createLead(data: {
  customerId?: number;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  stage?:
    | "prospect"
    | "qualified"
    | "proposal"
    | "negotiation"
    | "closed_won"
    | "closed_lost";
  value?: number;
  assignedTo?: number;
  followUpDate?: Date;
  notes?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: any = await db.insert(leads).values({
    customerId: data.customerId ?? null,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    source: data.source || null,
    stage: data.stage || "prospect",
    value: data.value ?? null,
    assignedTo: data.assignedTo ?? null,
    followUpDate: data.followUpDate ?? null,
    notes: data.notes || null,
    createdBy: data.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const insertId = Number((result as any)?.insertId);
  return {
    id: Number.isFinite(insertId) && insertId > 0 ? insertId : null,
  };
}

// ==================== TICKETS ====================

export async function getAllTickets() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(tickets).orderBy(desc(tickets.createdAt));
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createTicket(data: {
  ticketNumber: string;
  customerId?: number;
  subject: string;
  description?: string;
  status?: "open" | "in_progress" | "pending" | "resolved" | "closed";
  priority?: "low" | "medium" | "high" | "critical";
  category?: string;
  channel?: "whatsapp" | "instagram" | "email" | "phone" | "web";
  assignedTo?: number;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: any = await db.insert(tickets).values({
    ticketNumber: data.ticketNumber,
    customerId: data.customerId ?? null,
    subject: data.subject,
    description: data.description || null,
    status: data.status || "open",
    priority: data.priority || "medium",
    category: data.category || null,
    channel: data.channel || null,
    assignedTo: data.assignedTo ?? null,
    createdBy: data.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const insertId = Number((result as any)?.insertId);
  if (!Number.isFinite(insertId) || insertId <= 0) {
    return { success: true };
  }
  return await getTicketById(insertId);
}

// ==================== NOTIFICATIONS ====================

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

// ==================== VISUAL FLOWS ====================

export async function getAllVisualFlows() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(visualFlows)
    .orderBy(desc(visualFlows.updatedAt));
}

export async function getVisualFlowById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(visualFlows)
    .where(eq(visualFlows.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createVisualFlow(data: {
  name: string;
  description?: string;
  flowData: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(visualFlows).values({
    name: data.name,
    description: data.description || null,
    flowData: data.flowData,
    isActive: 0,
    executionCount: 0,
    createdBy: data.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result;
}

export async function updateVisualFlow(
  id: number,
  updates: Partial<{
    name: string;
    description: string;
    flowData: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(visualFlows)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(visualFlows.id, id));
}

export async function deleteVisualFlow(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(visualFlows).where(eq(visualFlows.id, id));
}

export async function toggleVisualFlow(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Only one visual flow active at a time (selected flow behavior)
  if (isActive) {
    await db.update(visualFlows).set({ isActive: 0, updatedAt: new Date() });
  }

  return await db
    .update(visualFlows)
    .set({
      isActive: isActive ? 1 : 0,
      updatedAt: new Date(),
    })
    .where(eq(visualFlows.id, id));
}

// ==================== AUTOMATION FLOWS ====================

export async function getAllAutomationFlows() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(automationFlows)
    .orderBy(desc(automationFlows.updatedAt));
}

export async function createAutomationFlow(data: {
  name: string;
  description?: string;
  channel: "whatsapp" | "instagram" | "both";
  trigger: string;
  response: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(automationFlows).values({
    name: data.name,
    description: data.description || null,
    channel: data.channel,
    trigger: data.trigger,
    response: data.response,
    isActive: 1,
    responseCount: 0,
    createdBy: data.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result;
}

export async function updateAutomationFlow(
  id: number,
  updates: Partial<{
    name: string;
    description: string;
    channel: "whatsapp" | "instagram" | "both";
    trigger: string;
    response: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(automationFlows)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(automationFlows.id, id));
}

export async function deleteAutomationFlow(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(automationFlows).where(eq(automationFlows.id, id));
}

export async function toggleAutomationFlow(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(automationFlows)
    .set({
      isActive: isActive ? 1 : 0,
      updatedAt: new Date(),
    })
    .where(eq(automationFlows.id, id));
}

// ==================== URA MENUS ====================

export async function getAllUraMenus() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(uraMenus).orderBy(desc(uraMenus.updatedAt));
}

export async function getUraMenuById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(uraMenus)
    .where(eq(uraMenus.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getActiveUraMenu() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(uraMenus)
    .where(eq(uraMenus.isActive, 1))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createUraMenu(data: {
  name: string;
  welcomeMessage: string;
  menuData: string;
  workingHours?: string;
  offHoursMessage?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(uraMenus).values({
    name: data.name,
    welcomeMessage: data.welcomeMessage,
    menuData: data.menuData,
    workingHours: data.workingHours || null,
    offHoursMessage: data.offHoursMessage || null,
    isActive: 1,
    createdBy: data.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result;
}

export async function updateUraMenu(
  id: number,
  updates: Partial<{
    name: string;
    welcomeMessage: string;
    menuData: string;
    workingHours: string;
    offHoursMessage: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(uraMenus)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(uraMenus.id, id));
}

export async function deleteUraMenu(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(uraMenus).where(eq(uraMenus.id, id));
}

export async function toggleUraMenu(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(uraMenus)
    .set({
      isActive: isActive ? 1 : 0,
      updatedAt: new Date(),
    })
    .where(eq(uraMenus.id, id));
}

// ==================== EMPLOYEES/USERS ====================

export async function getAllEmployees() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Import employees schema
  const { employees } = await import("../drizzle/schema");

  // Get all users with their employee data
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  // Get all employees
  const allEmployees = await db.select().from(employees);

  // Merge user and employee data
  return allUsers.map(user => {
    const employeeData = allEmployees.find(e => e.userId === user.id);
    return {
      user: user,
      employee: employeeData || null,
    };
  });
}
