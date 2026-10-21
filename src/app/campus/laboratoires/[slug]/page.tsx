import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { findLabSessions, getLabView, getScenarioBriefing } from "@/server/services/labs";
import { getUserTier, TIER_LABELS } from "@/server/services/entitlements";
import { LabConsole } from "@/components/labs/lab-console";
import { StartLab } from "@/components/labs/start-lab";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Panel } from "@/components/ui/misc";
import { formatDate, SECTOR_LABELS } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/campus/laboratoires/[slug]">) {
  const { slug } = await props.params;
  const b = await getScenarioBriefing(slug);
  return { title: b?.title ?? "Laboratoire" };
}

export default async function LabPage(props: PageProps<"/campus/laboratoires/[slug]">) {
  const { slug } = await props.params;
  const u = await requireUser(`/campus/laboratoires/${slug}`);
  const brief = await getScenarioBriefing(slug);
  if (!brief) notFound();
  const [tier, sessions] = await Promise.all([getUserTier(u.id), findLabSessions(u.id, slug)]);
  const current = sessions.find((s) => s.status === "active") ?? sessions.find((s) => s.status === "closed");
  const view = current ? await getLabView(u.id, current.id) : null;
  const history = sessions.filter((s) => s.status === "closed");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/campus/laboratoires" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Laboratoires
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{brief.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <Badge>{SECTOR_LABELS[brief.sector] ?? brief.sector}</Badge>
            <Badge>Difficulté {brief.difficulty}/3</Badge>
            <Badge>Environ {brief.estimatedMinutes} min</Badge>
          </div>
        </div>
        {history.length ? (
          <p className="text-sm text-muted">
            Meilleur score : {Math.max(...history.map((h) => h.score ?? 0))} / 100 sur {history.length} tentative{history.length > 1 ? "s" : ""}
          </p>
        ) : null}
      </div>

      {tier < brief.requiredTier ? (
        <Panel className="max-w-2xl p-6">
          <p className="flex items-center gap-2 font-medium">
            <Lock className="h-4 w-4" aria-hidden="true" /> Laboratoire inclus dans l&apos;offre {TIER_LABELS[brief.requiredTier]}
          </p>
          <p className="mt-2 text-[15px] text-muted">{brief.summary}</p>
          <ButtonLink href="/campus/facturation" className="mt-4">
            Voir les offres
          </ButtonLink>
        </Panel>
      ) : view ? (
        <>
          {view.status === "closed" ? (
            <p className="text-sm text-muted">Débrief de votre intervention du {formatDate(current?.endedAt)}.</p>
          ) : null}
          <LabConsole initial={view} />
        </>
      ) : (
        <Panel className="max-w-3xl p-6 sm:p-8">
          <p className="font-mono text-xs text-muted">{brief.ticket.reference}</p>
          <p className="mt-2 text-lg font-medium">{brief.ticket.title}</p>
          <p className="mt-1 text-sm text-muted">
            {brief.ticket.reporter.name}, {brief.ticket.reporter.role}, {brief.ticket.reporter.site}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{brief.ticket.description}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{brief.company.description}</p>
          <div className="mt-6 grid gap-3 border-t border-line pt-5 text-sm text-ink-2 sm:grid-cols-3">
            <p>
              <span className="block text-muted">Ce qui est noté</span>Diagnostic, résolution, méthode, validation, sécurité, SLA et note de clôture.
            </p>
            <p>
              <span className="block text-muted">Aide disponible</span>Trois indices graduels, −3 points chacun.
            </p>
            <p>
              <span className="block text-muted">Sans risque</span>Les actions dangereuses sont simulées et expliquées.
            </p>
          </div>
          <div className="mt-6">
            <StartLab slug={slug} />
          </div>
        </Panel>
      )}
    </div>
  );
}
