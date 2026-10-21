import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/lib/env";

export type Db = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as { __hiaSql?: ReturnType<typeof postgres>; __hiaDb?: Db };

/**
 * Client unique par processus. `prepare: false` : compatible avec le pooler de Neon (mode transaction).
 * En serverless, `max` reste bas : chaque instance ouvre peu de connexions.
 */
export function getDb(): Db {
  if (g.__hiaDb) return g.__hiaDb;
  const sql = postgres(env().DATABASE_URL, {
    prepare: false,
    max: env().NODE_ENV === "production" ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  g.__hiaSql = sql;
  g.__hiaDb = drizzle(sql, { schema, casing: "snake_case" });
  return g.__hiaDb;
}

export const db = new Proxy({} as Db, {
  get(_t, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export { schema };
