import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  employees,
  customers,
  leads,
  InsertCustomer,
  tickets,
  notifications,
  InsertAttachment,
  auditLogs,
  automationFlows,
  visualFlows,
  uraMenus,
  apiConfigurations,
  InsertApiConfiguration,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  InsertEmployee,
  InsertUser,
  InsertCustomer,
  InsertLead,
  InsertLead,
  InsertTicket,
  InsertNotification,
  InsertAttachment,
  InsertAuditLog,
  InsertAutomationFlow,
  InsertVisualFlow,
  InsertUraMenu,
  InsertApiConfiguration,
} from "../drizzle/schema";
import {
  InsertUser,
  users,
  employees,
  customers,
  leads,
  InsertCustomer,
  tickets,
  notifications,
  InsertAttachment,
  InsertAuditLog,
  InsertAutomationFlow,
  InsertVisualFlow,
  InsertUraMenu,
  InsertApiConfiguration,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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

export type DbType = ReturnType<typeof drizzle>;

export async function getDbRaw() {
  const db = await getDb();
  if (!db) {
    console.error("[Database] Database not available");
    return null;
  }
  return db;
}
