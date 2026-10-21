import { requireStudio } from "@/server/auth/session";
import { can } from "@/server/authz/policies";
import { listAudit } from "@/server/services/studio";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Journal d'audit" };

export default async function AuditPage() {
  const { actor } = await requireStudio("/studio/audit");
  if (!can.viewAuditLog(actor)) return <EmptyState title="Accès réservé aux super-administrateurs" />;
  const rows = await listAudit(actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Journal d'audit" description="Actions sensibles : rôles, suspensions, publications, exports, consultations de résultats, facturation." />
      <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="px-4 py-2.5 font-normal">Date</th>
              <th className="px-4 py-2.5 font-normal">Auteur</th>
              <th className="px-4 py-2.5 font-normal">Action</th>
              <th className="px-4 py-2.5 font-normal">Cible</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-2">{r.actorName ?? "système"}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2 text-xs text-muted">
                  {r.targetType} {r.targetId ? r.targetId.slice(0, 8) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
