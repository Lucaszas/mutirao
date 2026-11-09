import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Em desenvolvimento usa um arquivo SQLite local; em produção, um banco Turso (libSQL)
// configurado via DATABASE_URL e DATABASE_AUTH_TOKEN.
const client = createClient({
  url: process.env.DATABASE_URL ?? "file:local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export { schema };
