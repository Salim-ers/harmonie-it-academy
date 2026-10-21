import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getAuth } from "@/server/auth/auth";
import { getActor } from "@/server/auth/session";
import { can } from "@/server/authz/policies";
import { getDb } from "@/server/db";
import { recordAudit } from "@/server/services/audit";

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Export pour audit : inscriptions, progression, évaluations. Pseudonymisé (identifiant interne, pas d'e-mail). */
export async function GET(req: Request) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  const actor = session ? await getActor(session.user.id) : null;
  if (!can.viewPlatformAnalytics(actor)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const rows = await getDb().execute<Record<string, unknown>>(sql`
    select e.user_id as apprenant, c.slug as formation, e.status as statut, e.created_at as inscrit_le, e.completed_at as termine_le,
      (select count(*) from lesson_progress p join lessons l on l.id = p.lesson_id join course_modules m on m.id = l.module_id where p.user_id = e.user_id and m.course_id = c.id and p.status = 'completed') as lecons_terminees,
      (select coalesce(sum(t.seconds), 0) / 60 from learning_time t where t.user_id = e.user_id) as minutes_totales,
      (select pr.placement::text from user_profiles pr where pr.user_id = e.user_id) as positionnement,
      (select max(a.percent) from attempts a join assessments s on s.id = a.assessment_id where a.user_id = e.user_id and s.kind = 'exam' and a.status = 'submitted') as examen_final
    from enrollments e join courses c on c.id = e.course_id order by e.created_at
  `);
  const header = ["apprenant", "formation", "statut", "inscrit_le", "termine_le", "lecons_terminees", "minutes_totales", "positionnement", "examen_final"];
  const body = [header.join(";"), ...[...rows].map((r) => header.map((h) => csv(r[h])).join(";"))].join("\n");
  await recordAudit({ actorId: actor!.id, action: "quality.export", targetType: "export", metadata: { rows: rows.length } });
  return new NextResponse(`﻿${body}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="harmonie-suivi-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
