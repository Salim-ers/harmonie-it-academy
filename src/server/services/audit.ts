import "server-only";
import { getDb } from "@/server/db";
import { auditLogs } from "@/server/db/schema";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
};

/** Journal d'audit des actions sensibles. Ne jamais y écrire de secret ni de contenu personnel inutile. */
export async function recordAudit(entry: AuditEntry) {
  await getDb()
    .insert(auditLogs)
    .values({ ...entry, targetId: entry.targetId ?? null, ip: entry.ip ?? null, metadata: entry.metadata ?? {} });
}
