import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BookOpen, ChevronLeft, FlaskConical, MessagesSquare, NotebookPen } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getJobAnalysis } from "@/server/services/career";
import { ForbiddenError } from "@/server/authz/policies";
import { Badge, Panel } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";
import { DeleteAnalysis } from "@/components/career/delete-analysis";
import { getCatalog, getPublicScenarios } from "@/server/services/catalog";

const STATUS = {
  acquis: { label: "Prouvé", tone: "ok" },
  "a-consolider": { label: "À consolider", tone: "warn" },
  "a-travailler": { label: "À travailler", tone: "danger" },
  "hors-plateforme": { label: "Pas encore couvert ici", tone: "neutral" },
  "non-evalue": { label: "À préparer", tone: "neutral" },
} as const;

const TASK_ICON = { lecon: BookOpen, labo: FlaskConical, entretien: MessagesSquare, revision: NotebookPen };

export default async function OfferAnalysisPage(props: PageProps<"/campus/carriere/offres/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const u = await requireUser(`/campus/carriere/offres/${id}`);
  let row;
  try {
    row = await getJobAnalysis(u.id, id);
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
  const r = row.result;
  const [catalog, scenarioList] = await Promise.all([getCatalog(), getPublicScenarios()]);
  const lessonTitle = new Map(catalog.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => [l.slug, l.title] as const))));
  const labTitle = new Map(scenarioList.map((s) => [s.slug, s.title] as const));
  const groups = (["technique", "outil", "methode", "relationnel", "langue", "secteur"] as const)
    .map((c) => ({ c, items: r.detected.filter((d) => d.category === c) }))
    .filter((g) => g.items.length);
  const CAT = { technique: "Compétences techniques", outil: "Outils", methode: "Méthodes et niveau", relationnel: "Savoir-être", langue: "Langues", secteur: "Environnement" };

  return (
    <div className="space-y-6">
      <Link href="/campus/carriere" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Harmonie Career
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{row.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Analysée le {formatDate(row.createdAt)}
            {row.interviewDate ? `, entretien prévu le ${formatDate(row.interviewDate)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/campus/carriere/cv?offre=${row.id}`} className="text-sm font-medium text-ink hover:underline">
            Comparer mon CV à cette offre
          </Link>
          <DeleteAnalysis id={row.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="p-5">
          <p className="text-sm text-muted">Préparation estimée</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{r.readiness === null ? "—" : `${r.readiness} %`}</p>
          <p className="mt-1 text-xs text-muted">Moyenne de vos niveaux prouvés sur les compétences demandées, les exigences marquées indispensables comptant double.</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-sm text-muted">Niveau visé</p>
          <p className="mt-1 text-lg font-medium">{r.level === "n2" ? "Support N2" : r.level === "n1" ? "Support N1" : "Non précisé"}</p>
          <p className="mt-1 text-sm text-muted">
            {r.junior ? "Profil débutant accepté. " : ""}
            {r.experienceYears ? `Expérience demandée : ${r.experienceYears} an(s).` : ""}
          </p>
        </Panel>
        <Panel className="p-5">
          <p className="text-sm text-muted">Points détectés</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{r.detected.length}</p>
          <p className="mt-1 text-sm text-muted">{r.detected.filter((d) => d.important).length} présentés comme indispensables</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          {groups.map((g) => (
            <Panel key={g.c} className="overflow-hidden" as="section">
              <h2 className="border-b border-line px-5 py-3 font-medium">{CAT[g.c]}</h2>
              <ul className="divide-y divide-line">
                {g.items.map((d) => {
                  const st = STATUS[d.status];
                  return (
                    <li key={d.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-ink">
                          {d.label}
                          {d.important ? <span className="ml-2 text-xs font-normal text-danger">indispensable</span> : null}
                        </p>
                        <div className="flex items-center gap-2">
                          {d.candidateLevel !== null ? <span className="text-sm tabular-nums text-muted">{d.candidateLevel} %</span> : null}
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted">Repéré : {d.matched.join(", ")}</p>
                      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{d.advice}</p>
                      {d.lessons.length || d.scenarios.length ? (
                        <ul className="mt-2.5 space-y-1 text-sm">
                          {d.lessons.map((l) => (
                            <li key={l}>
                              <Link href={`/campus/cours/${l}`} className="inline-flex items-start gap-1.5 text-signal-ink hover:underline">
                                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>
                                  <span className="sr-only">Leçon : </span>
                                  {lessonTitle.get(l) ?? "Leçon associée"}
                                </span>
                              </Link>
                            </li>
                          ))}
                          {d.scenarios.map((s) => (
                            <li key={s}>
                              <Link href={`/campus/laboratoires/${s}`} className="inline-flex items-start gap-1.5 text-signal-ink hover:underline">
                                <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span>
                                  <span className="sr-only">Laboratoire : </span>
                                  {labTitle.get(s) ?? "Incident associé"}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
          {!r.detected.length ? <Panel className="p-5 text-sm text-muted">Aucune compétence reconnue. L&apos;offre est-elle bien celle d&apos;un poste informatique ?</Panel> : null}
        </div>

        <Panel className="h-fit p-5 xl:sticky xl:top-20" as="section">
          <h2 className="font-medium">Plan de préparation</h2>
          <ol className="mt-4 space-y-5">
            {r.plan.map((d) => (
              <li key={d.day} className="relative border-l border-line pl-5">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-signal" aria-hidden="true" />
                <p className="text-sm text-muted">
                  Jour {d.day}
                  {d.date ? `, ${formatDate(d.date, { weekday: "long", day: "numeric", month: "short" })}` : ""}
                </p>
                <p className="font-medium text-ink">{d.focus}</p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {d.tasks.map((t, i) => {
                    const Icon = TASK_ICON[t.kind];
                    const href = t.kind === "lecon" ? `/campus/cours/${t.ref}` : t.kind === "labo" ? `/campus/laboratoires/${t.ref}` : t.kind === "entretien" ? "/campus/carriere" : null;
                    return (
                      <li key={i} className="flex gap-2 text-ink-2">
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                        {href ? (
                          <Link href={href} className="hover:underline">
                            {t.label}
                          </Link>
                        ) : (
                          t.label
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-line pt-4 text-xs text-muted">{r.disclaimer}</p>
        </Panel>
      </div>
    </div>
  );
}
