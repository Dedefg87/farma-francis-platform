import type { InferSelectModel } from "drizzle-orm";
import { users } from "../../drizzle/schema";

export type User = InferSelectModel<typeof users>;

import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
// ... resto do código original
