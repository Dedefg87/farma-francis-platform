import type { InferSelectModel } from "drizzle-orm";
import { users } from "../../drizzle/schema";

export type User = InferSelectModel<typeof users>;

import { COOKIE_NAME } from "@shared/const";
// ... resto do código original (mantenha o que já existe)
