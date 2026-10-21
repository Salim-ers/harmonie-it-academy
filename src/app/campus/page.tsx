import Link from "next/link";
import { ArrowRight, FlaskConical, Play, Sparkles } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getDashboard } from "@/server/services/dashboard";
import { Badge, EmptyState, Panel, ProgressBar } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { SkillDomains } from "@/components/campus/skill-domains";
import { TIER_LABELS } from "@/server/services/entitlements";
import { formatDate, formatDuration } from "@/lib/format";
import { BADGES, type BadgeCode } from "@/server/services/xp";
import { listUnreadNotifications } from "@/server/services/notifications";
import { NotificationsPanel } from "@/components/campus/notifications-panel";

export const metadata = { title: { absolute: "Tableau de bord — Harmonie Campus" } };

export default async function CampusHome() {
  const u = await requireUser("/campus");
  const [d, unread] = await Promise.all([getDashboard(u.id), listUnreadNotifications(u.id)]);
  const firstName = u.name.split(" ")[0];
  const pathPct = d.path && d.path.total ? (d.path.completed / d.path.total) * 100 : 0;
  const goalPct = d.weeklyGoal ? Math.min(100, (d.weekMinutes / d.weeklyGoal) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">Offre {TIER_LABELS[d.tier] ?? "Découverte"}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Bonjour {firstName}</h1>
        </div>
        <p className="text-sm text-muted">
          {d.xp} points d&apos;expérience, {formatDuration(d.totalMinutes)} d&apos;apprentissage au total
        </p>
      </div>

      {!u.emailVerified ? (
        <Panel className="border-warn/40 bg-warn-wash px-5 py-4 text-sm text-ink">Confirmez votre adresse e-mail pour sécuriser votre compte : le lien vous a été envoyé à l&apos;inscription.</Panel>
      ) : null}

      <NotificationsPanel items={unread.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))} />

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="relative overflow-hidden p-6 sm:p-7">
          {d.resume ? (
            <>
              <p className="text-sm text-muted">{d.resume.courseTitle}</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">{d.resume.title}</h2>
              <p className="mt-1 text-sm text-muted">{formatDuration(d.resume.durationMin)}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ButtonLink href={`/campus/cours/${d.resume.slug}`}>
                  <Play className="h-4 w-4" aria-hidden="true" /> Reprendre
                </ButtonLink>
                {!d.placementDone ? (
                  <Link href="/campus/evaluations/positionnement-support-n1" className="text-sm text-ink-2 underline-offset-4 hover:underline">
                    Faire d&apos;abord le positionnement (12 questions)
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <EmptyState title="Parcours terminé">Toutes les leçons du parcours sont validées. Passez l&apos;examen final ou entraînez-vous en entretien.</EmptyState>
          )}
          {d.path ? (
            <div className="mt-7 border-t border-line pt-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink-2">{d.path.title}</span>
                <span className="tabular-nums text-ink">
                  {d.path.completed}/{d.path.total} leçons
                </span>
              </div>
              <ProgressBar value={pathPct} label="Progression du parcours" className="mt-2" />
            </div>
          ) : null}
        </Panel>

        <Panel className="p-6">
          <h2 className="text-sm font-medium text-ink">Cette semaine</h2>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
            {formatDuration(d.weekMinutes)}
            <span className="ml-2 text-sm font-normal text-muted">sur {formatDuration(d.weeklyGoal)}</span>
          </p>
          <ProgressBar value={goalPct} label="Objectif hebdomadaire" tone="signal" className="mt-3" />
          <p className="mt-3 text-sm text-muted">L&apos;objectif est indicatif et modifiable dans votre compte. Pas de série à préserver : apprenez à votre rythme.</p>
          {d.badges.length ? (
            <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Badges obtenus">
              {d.badges.map((b) => (
                <li key={b}>
                  <Badge tone="gold">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {BADGES[b as BadgeCode]?.name ?? b}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-ink">Vos formations</h2>
            <Link href="/campus/formations" className="text-sm text-muted hover:text-ink">
              Tout voir
            </Link>
          </div>
          <ul className="mt-5 space-y-4">
            {d.courses.map((c) => (
              <li key={c.slug}>
                <Link href={`/campus/formations/${c.slug}`} className="group block">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-ink group-hover:underline">{c.title}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {c.completed}/{c.total}
                    </span>
                  </div>
                  <ProgressBar value={c.total ? (c.completed / c.total) * 100 : 0} label={`Progression : ${c.title}`} className="mt-2" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-ink">Carte de compétences</h2>
            <Link href="/campus/competences" className="text-sm text-muted hover:text-ink">
              Détail et méthode
            </Link>
          </div>
          <SkillDomains domains={d.skillMap.domains} className="mt-5" />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="p-6">
          <h2 className="font-medium text-ink">Prochaines leçons</h2>
          {d.nextLessons.length ? (
            <ol className="mt-4 space-y-3">
              {d.nextLessons.map((l) => (
                <li key={l.slug}>
                  <Link href={`/campus/cours/${l.slug}`} className="flex items-start justify-between gap-3 text-sm hover:underline">
                    <span className="text-ink">{l.title}</span>
                    <span className="shrink-0 text-muted">{formatDuration(l.durationMin)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-muted">Toutes les leçons du parcours sont validées.</p>
          )}
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-ink">Laboratoires</h2>
            <Link href="/campus/laboratoires" className="text-sm text-muted hover:text-ink">
              Catalogue
            </Link>
          </div>
          {d.labs.length ? (
            <ul className="mt-4 space-y-3">
              {d.labs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/campus/laboratoires/${l.slug}`} className="text-ink hover:underline">
                    {l.title}
                  </Link>
                  {l.status === "closed" ? <Badge tone={(l.score ?? 0) >= 70 ? "ok" : "warn"}>{l.score} / 100</Badge> : l.status === "active" ? <Badge tone="signal">En cours</Badge> : <Badge>Abandonné</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>Traitez votre premier incident simulé : c&apos;est là que la théorie devient un savoir-faire.</p>
              <Link href="/campus/laboratoires/zebra-quai-3" className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
                <FlaskConical className="h-4 w-4" aria-hidden="true" /> Les étiquettes du quai 3 ne sortent plus
              </Link>
            </div>
          )}
        </Panel>

        <Panel className="p-6">
          <h2 className="font-medium text-ink">À revoir</h2>
          {d.toReview.length || d.weakSkills.length ? (
            <ul className="mt-4 space-y-3 text-sm">
              {d.toReview.map((r) => (
                <li key={r.id}>
                  <Link href={`/campus/cours/${r.lessonSlug}#quiz`} className="flex items-center justify-between gap-3 hover:underline">
                    <span className="text-ink">{r.title.replace(/^Quiz — /, "")}</span>
                    <Badge tone="warn">{r.percent} %</Badge>
                  </Link>
                </li>
              ))}
              {d.weakSkills.map((s) => (
                <li key={s.code} className="flex items-center justify-between gap-3">
                  <span className="text-ink-2">{s.name}</span>
                  <Badge tone="warn">{s.level} %</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">Les quiz non réussis et les compétences fragiles apparaîtront ici, avec un lien direct pour réviser.</p>
          )}
        </Panel>
      </div>

      {d.recentAttempts.length ? (
        <Panel className="overflow-hidden">
          <h2 className="px-6 pt-5 font-medium text-ink">Derniers résultats</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-line text-left text-muted">
                  <th className="px-6 py-2.5 font-normal">Évaluation</th>
                  <th className="px-6 py-2.5 font-normal">Date</th>
                  <th className="px-6 py-2.5 text-right font-normal">Score</th>
                </tr>
              </thead>
              <tbody>
                {d.recentAttempts.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="px-6 py-3">
                      <Link href={`/campus/evaluations/tentatives/${a.id}`} className="text-ink hover:underline">
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-muted">{formatDate(a.submittedAt, { day: "numeric", month: "short" })}</td>
                    <td className="px-6 py-3 text-right">
                      <Badge tone={a.passed ? "ok" : "warn"}>{a.percent} %</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-medium text-ink">Une offre d&apos;emploi en vue ?</h2>
          <p className="mt-1 text-sm text-muted">Collez-la : vous verrez ce qu&apos;elle exige, ce que vous avez déjà prouvé et un plan de préparation jusqu&apos;à l&apos;entretien.</p>
        </div>
        <ButtonLink href="/campus/carriere" variant="secondary">
          Analyser une offre <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </Panel>
    </div>
  );
}
