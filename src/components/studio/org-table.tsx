import type { ReactNode } from "react";
import { formatDate } from "@/lib/format";

type M = { userId: string; name: string; email: string; role: string; completed: number | null; avgScore: number | null; labs: number | null; lastActivity: Date | string | null };

export function OrgMembersTable({ members, action }: { members: M[]; action?: (userId: string) => ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="px-4 py-2.5 font-normal">Salarié</th>
            <th className="px-4 py-2.5 text-right font-normal">Leçons terminées</th>
            <th className="px-4 py-2.5 text-right font-normal">Score moyen</th>
            <th className="px-4 py-2.5 text-right font-normal">Incidents</th>
            <th className="px-4 py-2.5 font-normal">Dernière activité</th>
            {action ? <th className="px-4 py-2.5" /> : null}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.userId} className="border-b border-line last:border-0">
              <td className="px-4 py-2.5">
                <span className="text-ink">{m.name}</span>
                <span className="block text-xs text-muted">
                  {m.email}
                  {m.role === "org_admin" ? ", administrateur" : ""}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{m.completed ?? "—"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{m.avgScore === null ? "—" : `${m.avgScore} %`}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{m.labs ?? "—"}</td>
              <td className="px-4 py-2.5 text-muted">{m.lastActivity ? formatDate(m.lastActivity, { day: "numeric", month: "short" }) : "—"}</td>
              {action ? <td className="px-4 py-2.5 text-right">{action(m.userId)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      {members.some((m) => m.completed === null) ? <p className="px-4 py-3 text-xs text-muted">Le partage des résultats est désactivé pour cette organisation.</p> : null}
    </div>
  );
}
