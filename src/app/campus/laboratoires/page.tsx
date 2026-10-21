import Link from "next/link";
import { Lock } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getPublicScenarios } from "@/server/services/catalog";
import { getUserTier, TIER_LABELS } from "@/server/services/entitlements";
import { getLabHistory } from "@/server/services/labs";
import { Badge, PageHeader } from "@/components/ui/misc";
import { SECTOR_LABELS } from "@/lib/format";

export const metadata = { title: "Laboratoires" };

export default async function LabsPage() {
  const u = await requireUser("/campus/laboratoires");
  const [scenarios, tier, history] = await Promise.all([getPublicScenarios(), getUserTier(u.id), getLabHistory(u.id)]);
  return (
    <div className="space-y-8">
      <PageHeader
        title="Harmonie Labs"
        description="Des incidents d'entreprise simulés : vous interrogez, observez, testez et corrigez. Chaque résultat est cohérent avec la vraie cause, et chaque intervention se termine par un débrief noté."
      />
      <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface">
        {scenarios.map((s) => {
          const mine = history.filter((h) => h.slug === s.slug);
          const best = mine.filter((m) => m.status === "closed").reduce<number | null>((a, m) => (m.score !== null && (a === null || m.score > a) ? m.score : a), null);
          const active = mine.some((m) => m.status === "active");
          const locked = tier < s.requiredTier;
          return (
            <li key={s.slug}>
              <Link href={`/campus/laboratoires/${s.slug}`} className="grid gap-2 px-5 py-4 transition hover:bg-mist/50 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    {locked ? <Lock className="h-3.5 w-3.5 text-muted" aria-label="Réservé" /> : null}
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{s.summary}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge>{SECTOR_LABELS[s.sector] ?? s.sector}</Badge>
                  <Badge>Niveau {s.difficulty}</Badge>
                  {locked ? <Badge tone="gold">{TIER_LABELS[s.requiredTier]}</Badge> : active ? <Badge tone="signal">En cours</Badge> : best !== null ? <Badge tone={best >= 70 ? "ok" : "warn"}>{best} / 100</Badge> : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">
        Des laboratoires sur machines virtuelles isolées et temporaires sont prévus dans une étape ultérieure. Aucune commande n&apos;est exécutée sur un vrai système aujourd&apos;hui.
      </p>
    </div>
  );
}
