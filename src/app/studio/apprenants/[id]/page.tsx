import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireStudio } from "@/server/auth/session";
import { getLearnerSummary } from "@/server/services/studio";
import { can, ForbiddenError } from "@/server/authz/policies";
import { getDb } from "@/server/db";
import { user } from "@/server/db/schema";
import { UserControls } from "@/components/studio/user-controls";
import { Badge, PageHeader, Panel, Stat } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Apprenant" };

export default async function LearnerPage(props: PageProps<"/studio/apprenants/[id]">) {
  const { id } = await props.params;
  const { actor } = await requireStudio();
  let s;
  try {
    s = await getLearnerSummary(actor, id);
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
  if (!s.user) notFound();
  const [u] = await getDb().select({ role: user.role, status: user.status }).from(user).where(eq(user.id, id));
  return (
    <div className="space-y-6">
      <PageHeader title={s.user.name} description={`Inscrit le ${formatDate(s.user.createdAt)}`} />
      <Panel className="grid gap-6 p-5 sm:grid-cols-3">
        <Stat label="Leçons terminées" value={s.completedLessons} />
        <Stat label="Évaluations" value={s.attempts.length} />
        <Stat label="Incidents clôturés" value={s.labs.length} />
      </Panel>
      {s.placement ? (
        <Panel className="p-5">
          <h2 className="text-sm font-medium">Positionnement initial</h2>
          <p className="mt-1 text-sm text-ink-2">
            {Object.entries(s.placement)
              .map(([k, v]) => `${k} ${v} %`)
              .join(", ")}
          </p>
        </Panel>
      ) : null}
      {s.accessibilityNeeds ? (
        <Panel className="border-signal/30 bg-signal-wash p-5">
          <h2 className="text-sm font-medium">Besoins d&apos;adaptation déclarés (confidentiel)</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">{s.accessibilityNeeds}</p>
        </Panel>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <h2 className="px-5 pt-4 text-sm font-medium">Évaluations</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {s.attempts.map((a, i) => (
              <li key={i} className="flex justify-between px-5 py-2.5">
                <span>{a.title}</span>
                <Badge tone={a.passed ? "ok" : "warn"}>{a.percent} %</Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="overflow-hidden">
          <h2 className="px-5 pt-4 text-sm font-medium">Laboratoires</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {s.labs.map((l, i) => (
              <li key={i} className="flex justify-between px-5 py-2.5">
                <span>{l.title}</span>
                <span className="tabular-nums">{l.score}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      {can.manageUsers(actor) && u ? (
        <Panel className="p-5">
          <h2 className="mb-4 text-sm font-medium">Administration du compte</h2>
          <UserControls userId={id} role={u.role} status={u.status} self={id === actor.id} />
        </Panel>
      ) : null}
    </div>
  );
}
