import { requireUser } from "@/server/auth/session";
import { getOrCreatePassport, getPublicPassport } from "@/server/services/career";
import { getSkillMap } from "@/server/services/skills";
import { getLabHistory } from "@/server/services/labs";
import { PassportSettings } from "@/components/career/passport-settings";
import { PassportCard } from "@/components/career/passport-card";
import { PageHeader, Panel } from "@/components/ui/misc";
import { env } from "@/lib/env";

export const metadata = { title: "Passeport de compétences" };

export default async function PassportPage() {
  const u = await requireUser("/campus/carriere/passeport");
  const p = await getOrCreatePassport(u.id);
  const [map, labs, pub] = await Promise.all([getSkillMap(u.id), getLabHistory(u.id), p.enabled ? getPublicPassport(p.publicCode) : null]);
  const url = `${env().APP_URL}/passeport/${p.publicCode}`;
  return (
    <div className="space-y-8">
      <PageHeader title="Passeport de compétences" description="Ce que vous pouvez prouver, présenté proprement à un recruteur. Vous décidez de ce qui est visible, et pour combien de temps." />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Panel className="p-6">
          <PassportSettings initial={{ enabled: p.enabled, displayName: p.displayName, headline: p.headline, showPortfolio: p.showPortfolio }} publicUrl={url} />
          {p.enabled ? <p className="mt-5 break-all rounded-[var(--radius-control)] bg-mist px-3 py-2 font-mono text-xs text-ink-2">{url}</p> : null}
        </Panel>
        <div className="space-y-3">
          <p className="text-sm text-muted">Aperçu</p>
          <PassportCard
            data={{
              displayName: p.displayName,
              headline: p.headline,
              domains: map.domains.filter((d) => d.level !== null),
              attestations: pub?.attestations.map((a) => ({ title: a.title, code: a.code })) ?? [],
              incidents: labs.filter((l) => l.status === "closed" && l.inPortfolio).length,
            }}
          />
        </div>
      </div>
    </div>
  );
}
