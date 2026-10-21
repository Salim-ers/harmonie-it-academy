import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";

export class RateLimitError extends Error {
  constructor(public retryAfterSec: number) {
    super(`Trop de demandes. Réessayez dans ${Math.ceil(retryAfterSec / 60)} minute(s).`);
  }
}

/**
 * Fenêtre fixe stockée en base (fonctionne sur plusieurs instances serverless).
 * Opération atomique : un seul upsert par appel.
 */
export async function consumeRateLimit(key: string, limit: number, windowSec: number) {
  const rows = await getDb().execute<{ count: number; window_start: Date }>(sql`
    insert into app_rate_limits (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when app_rate_limits.window_start < now() - make_interval(secs => ${windowSec}) then 1 else app_rate_limits.count + 1 end,
      window_start = case when app_rate_limits.window_start < now() - make_interval(secs => ${windowSec}) then now() else app_rate_limits.window_start end
    returning count, window_start
  `);
  const row = rows[0];
  if (row && Number(row.count) > limit) {
    const elapsed = (Date.now() - new Date(row.window_start).getTime()) / 1000;
    throw new RateLimitError(Math.max(1, windowSec - elapsed));
  }
}
