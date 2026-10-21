"use client";

import { useState } from "react";
import { updateProfileAction } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/field";

export function ProfileForm({ initial }: { initial: { name: string; weeklyGoalMinutes: number; accessibilityNeeds: string; leaderboardOptIn: boolean } }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-4"
      action={async () => {
        setPending(true);
        const r = await updateProfileAction(s);
        setPending(false);
        setMsg(r.ok ? { ok: true, text: "Profil enregistré." } : { ok: false, text: r.error });
      }}
    >
      {msg ? <FormMessage tone={msg.ok ? "ok" : "danger"}>{msg.text}</FormMessage> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" htmlFor="pname">
          <Input id="pname" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} required maxLength={80} />
        </Field>
        <Field label="Objectif hebdomadaire (minutes)" htmlFor="goal" hint="Indicatif, sans pénalité.">
          <Input id="goal" type="number" min={30} max={1200} step={30} value={s.weeklyGoalMinutes} onChange={(e) => setS({ ...s, weeklyGoalMinutes: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Besoins d'adaptation" htmlFor="a11y" hint="Facultatif et confidentiel : temps majoré aux examens, lecteur d'écran, dyslexie… Seule l'équipe pédagogique y a accès pour adapter votre parcours.">
        <Textarea id="a11y" value={s.accessibilityNeeds} onChange={(e) => setS({ ...s, accessibilityNeeds: e.target.value })} maxLength={1000} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" className="h-4 w-4 accent-[var(--signal)]" checked={s.leaderboardOptIn} onChange={(e) => setS({ ...s, leaderboardOptIn: e.target.checked })} />
        Apparaître dans les classements de promotion (désactivé par défaut)
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
