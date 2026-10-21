"use client";

import { useState } from "react";
import { regeneratePassportCodeAction, updatePassportAction } from "@/server/actions/career";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";

export function PassportSettings({ initial, publicUrl }: { initial: { enabled: boolean; displayName: string; headline: string; showPortfolio: boolean }; publicUrl: string }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-5"
      action={async () => {
        setPending(true);
        const r = await updatePassportAction(s);
        setPending(false);
        setMsg(r.ok ? { tone: "ok", text: s.enabled ? "Passeport public enregistré." : "Passeport désactivé : la page publique n'est plus accessible." } : { tone: "danger", text: r.error });
      }}
    >
      {msg ? <FormMessage tone={msg.tone}>{msg.text}</FormMessage> : null}
      <label className="flex items-start gap-3 rounded-[var(--radius-control)] border border-line p-4">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--signal)]" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
        <span>
          <span className="block font-medium text-ink">Rendre mon passeport accessible par lien</span>
          <span className="mt-0.5 block text-sm text-muted">Toute personne disposant du lien pourra le consulter. Il n&apos;est pas référencé par les moteurs de recherche. Votre e-mail n&apos;y apparaît jamais.</span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom affiché" htmlFor="displayName">
          <Input id="displayName" value={s.displayName} onChange={(e) => setS({ ...s, displayName: e.target.value })} maxLength={80} required />
        </Field>
        <Field label="Accroche" htmlFor="headline" hint="Ex. : En reconversion vers le support IT N1">
          <Input id="headline" value={s.headline} onChange={(e) => setS({ ...s, headline: e.target.value })} maxLength={160} />
        </Field>
      </div>
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" className="h-4 w-4 accent-[var(--signal)]" checked={s.showPortfolio} onChange={(e) => setS({ ...s, showPortfolio: e.target.checked })} />
        Afficher les comptes rendus d&apos;incidents que j&apos;ai ajoutés à mon portfolio
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {initial.enabled ? (
          <>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4">
              Ouvrir la page publique
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!confirm("Générer un nouveau lien ? L'ancien cessera immédiatement de fonctionner.")) return;
                const r = await regeneratePassportCodeAction();
                setMsg(r.ok ? { tone: "ok", text: "Nouveau lien généré." } : { tone: "danger", text: r.error });
              }}
            >
              Changer de lien
            </Button>
          </>
        ) : null}
      </div>
    </form>
  );
}
