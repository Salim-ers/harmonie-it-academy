import { Check } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getPlans } from "@/server/services/catalog";
import { getBillingOverview } from "@/server/services/billing";
import { getUserTier, TIER_LABELS } from "@/server/services/entitlements";
import { features } from "@/lib/env";
import { CheckoutButton, PortalButton } from "@/components/billing/plan-actions";
import { Badge, PageHeader, Panel } from "@/components/ui/misc";
import { FormMessage } from "@/components/ui/field";
import { ButtonLink } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Abonnement" };

const STATUS: Record<string, string> = { active: "Actif", trialing: "Essai", past_due: "Paiement en retard", canceled: "Résilié", unpaid: "Impayé", incomplete: "Incomplet", incomplete_expired: "Expiré", paused: "En pause" };

export default async function BillingPage(props: PageProps<"/campus/facturation">) {
  const u = await requireUser("/campus/facturation");
  const sp = (await props.searchParams) as { statut?: string };
  const [plans, overview, tier] = await Promise.all([getPlans(), getBillingOverview(u.id), getUserTier(u.id)]);
  const stripeReady = features.stripe();
  return (
    <div className="space-y-8">
      <PageHeader title="Abonnement" description={`Offre actuelle : ${TIER_LABELS[tier] ?? "Découverte"}. Vous pouvez résilier à tout moment ; l'accès reste ouvert jusqu'à la fin de la période réglée.`} actions={overview.subscriptions.length ? <PortalButton /> : null} />
      {sp.statut === "merci" ? (
        <FormMessage tone="ok">Merci. Votre accès est activé dès que Stripe confirme le paiement, en général en quelques secondes. Actualisez la page si l&apos;offre n&apos;apparaît pas encore.</FormMessage>
      ) : null}
      {sp.statut === "annule" ? <FormMessage tone="info">Paiement annulé : rien n&apos;a été débité.</FormMessage> : null}
      {!stripeReady ? <FormMessage tone="info">Le paiement en ligne n&apos;est pas encore activé sur cet environnement (clés Stripe non configurées).</FormMessage> : null}

      <div className="grid gap-4 lg:grid-cols-4">
        {plans.map((p) => {
          const current = p.tier === tier && (p.tier > 0 ? overview.hasActive : true) && p.code !== "business";
          return (
            <Panel key={p.code} className={cn("flex flex-col p-5", p.code === "pro" && "border-ink")}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{p.name}</p>
                {current ? <Badge tone="ok">Votre offre</Badge> : null}
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{formatPrice(p.priceCents, p.interval)}</p>
              <p className="mt-1 text-sm text-muted">{p.tagline}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-ink-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {p.code === "business" ? (
                  <ButtonLink href="/entreprises#contact" variant="secondary" className="w-full">
                    Demander un devis
                  </ButtonLink>
                ) : p.tier > tier && !overview.hasActive && stripeReady ? (
                  <CheckoutButton planCode={p.code} label={`Passer à ${p.name}`} variant={p.code === "pro" ? "primary" : "secondary"} />
                ) : p.tier > tier && overview.hasActive ? (
                  <p className="text-sm text-muted">Changez d&apos;offre depuis le portail de facturation.</p>
                ) : null}
              </div>
            </Panel>
          );
        })}
      </div>

      {overview.subscriptions.length ? (
        <Panel className="overflow-hidden" as="section">
          <h2 className="px-5 pt-4 font-medium">Abonnements</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {overview.subscriptions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span className="text-ink">{plans.find((p) => p.code === s.planCode)?.name ?? s.planCode}</span>
                <span className="flex items-center gap-3 text-muted">
                  {s.currentPeriodEnd ? `${s.cancelAtPeriodEnd ? "Se termine" : "Renouvellement"} le ${formatDate(s.currentPeriodEnd)}` : null}
                  <Badge tone={s.status === "active" ? "ok" : s.status === "past_due" ? "warn" : "neutral"}>{STATUS[s.status] ?? s.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {overview.invoices.length ? (
        <Panel className="overflow-hidden" as="section">
          <h2 className="px-5 pt-4 font-medium">Factures</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {overview.invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-ink">{formatDate(i.createdAt)}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">{(i.amountCents / 100).toLocaleString("fr-FR", { style: "currency", currency: i.currency.toUpperCase() })}</span>
                  {i.hostedUrl ? (
                    <a href={i.hostedUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      Voir
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
