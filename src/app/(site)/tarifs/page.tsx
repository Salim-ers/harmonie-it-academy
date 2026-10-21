import { Check } from "lucide-react";
import { getPlans } from "@/server/services/catalog";
import { PageIntro } from "@/components/marketing/page-intro";
import { ButtonLink } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { FaqList, HOME_FAQ } from "@/components/marketing/faq";

export const metadata = { title: "Tarifs", description: "Découverte gratuite, Academy, Academy Pro et offre Business pour les entreprises." };

export default async function PricingPage() {
  const plans = await getPlans();
  return (
    <>
      <PageIntro title="Des offres simples, sans engagement">Prix TTC indicatifs. Résiliation à tout moment depuis votre espace ; l&apos;accès reste ouvert jusqu&apos;à la fin de la période réglée.</PageIntro>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-4">
          {plans.map((p) => (
            <div key={p.code} className={cn("flex flex-col rounded-[var(--radius-panel)] border bg-surface p-6", p.code === "pro" ? "border-ink" : "border-line")}>
              <p className="font-medium">{p.name}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{formatPrice(p.priceCents, p.interval)}</p>
              <p className="mt-2 text-sm text-muted">{p.tagline}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink href={p.code === "business" ? "/entreprises" : p.tier === 0 ? "/inscription" : `/inscription?suite=/campus/facturation`} variant={p.code === "pro" ? "primary" : "secondary"} className="mt-6 w-full">
                {p.code === "business" ? "Demander un devis" : p.tier === 0 ? "Créer un compte" : `Choisir ${p.name}`}
              </ButtonLink>
            </div>
          ))}
        </div>
        <div className="mt-16 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-2xl font-semibold tracking-tight">Questions fréquentes</h2>
          <FaqList items={HOME_FAQ} />
        </div>
      </section>
    </>
  );
}
