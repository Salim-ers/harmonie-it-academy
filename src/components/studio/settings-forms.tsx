"use client";

import { useState } from "react";
import { updatePlanAction, updateSettingsAction } from "@/server/actions/studio";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/field";

export function BrandForm({ initial }: { initial: { brandName: string; owner: string; signature: string; contactEmail: string } }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  return (
    <form
      className="space-y-4"
      action={async (f) => {
        const r = await updateSettingsAction({ "brand.name": String(f.get("name")), "brand.owner": String(f.get("owner")), "brand.signature": String(f.get("signature")), "brand.contactEmail": String(f.get("email")) });
        setMsg(r.ok ? { ok: true, t: "Réglages enregistrés." } : { ok: false, t: r.error });
      }}
    >
      {msg ? <FormMessage tone={msg.ok ? "ok" : "danger"}>{msg.t}</FormMessage> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de la plateforme" htmlFor="b-name">
          <Input id="b-name" name="name" defaultValue={initial.brandName} required />
        </Field>
        <Field label="Société propriétaire" htmlFor="b-owner" hint="Le logo indique « Harmony Solutions » : vérifiez l'orthographe officielle.">
          <Input id="b-owner" name="owner" defaultValue={initial.owner} required />
        </Field>
        <Field label="Signature" htmlFor="b-sig">
          <Input id="b-sig" name="signature" defaultValue={initial.signature} />
        </Field>
        <Field label="E-mail de contact (réception des formulaires)" htmlFor="b-email">
          <Input id="b-email" name="email" type="email" defaultValue={initial.contactEmail} required />
        </Field>
      </div>
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}

type Plan = { code: string; name: string; priceCents: number | null; tagline: string; features: string[]; stripePriceId: string | null; active: boolean; interval: string };

export function PlanForm({ plan }: { plan: Plan }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  return (
    <form
      className="space-y-3"
      action={async (f) => {
        const price = String(f.get("price") ?? "").replace(",", ".");
        const r = await updatePlanAction(plan.code, {
          name: String(f.get("name")),
          priceCents: plan.interval === "custom" || price === "" ? null : Math.round(Number(price) * 100),
          tagline: String(f.get("tagline")),
          features: String(f.get("features")).split("\n").map((x) => x.trim()).filter(Boolean),
          stripePriceId: String(f.get("stripe") ?? "").trim() || null,
          active: f.get("active") === "on",
        });
        setMsg(r.ok ? { ok: true, t: "Offre enregistrée." } : { ok: false, t: r.error });
      }}
    >
      {msg ? <FormMessage tone={msg.ok ? "ok" : "danger"}>{msg.t}</FormMessage> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nom" htmlFor={`${plan.code}-name`}>
          <Input id={`${plan.code}-name`} name="name" defaultValue={plan.name} />
        </Field>
        <Field label="Prix affiché (€ / mois)" htmlFor={`${plan.code}-price`} hint="Doit correspondre au prix Stripe.">
          <Input id={`${plan.code}-price`} name="price" defaultValue={plan.priceCents === null ? "" : (plan.priceCents / 100).toFixed(2)} disabled={plan.interval === "custom"} />
        </Field>
        <Field label="Identifiant de prix Stripe" htmlFor={`${plan.code}-stripe`}>
          <Input id={`${plan.code}-stripe`} name="stripe" defaultValue={plan.stripePriceId ?? ""} placeholder="price_…" disabled={plan.interval === "custom" || plan.priceCents === 0} />
        </Field>
      </div>
      <Field label="Accroche" htmlFor={`${plan.code}-tag`}>
        <Input id={`${plan.code}-tag`} name="tagline" defaultValue={plan.tagline} />
      </Field>
      <Field label="Avantages (un par ligne)" htmlFor={`${plan.code}-feat`}>
        <Textarea id={`${plan.code}-feat`} name="features" defaultValue={plan.features.join("\n")} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={plan.active} /> Offre visible
      </label>
      <Button type="submit" variant="secondary">
        Enregistrer l&apos;offre
      </Button>
    </form>
  );
}
