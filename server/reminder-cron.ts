import { getDb } from "./db";
import {
  reminders,
  customers,
  users,
  customerTreatments,
} from "../drizzle/schema";
import { eq, and, lte, gte, sql, ne, isNotNull, isNull, or, lt } from "drizzle-orm";
import { startOfDay, endOfDay, addDays, subDays, format } from "date-fns";

