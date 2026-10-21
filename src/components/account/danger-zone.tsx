"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";

export function DangerZone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <a href="/api/compte/export" className="inline-flex h-10 items-center rounded-[var(--radius-control)] border border-line-strong px-4 text-sm font-medium text-ink hover:border-ink-2">
          Télécharger mes données (JSON)
        </a>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Supprimer mon compte
        </Button>
      </div>
      {open ? (
        <form
          className="space-y-3 rounded-[var(--radius-control)] border border-danger/40 bg-danger-wash p-4"
          action={async (f) => {
            setPending(true);
            setError(null);
            const r = await authClient.deleteUser({ password: String(f.get("password") ?? "") });
            setPending(false);
            if (r.error) return setError(authErrorMessage(r.error));
            router.replace("/?compte=supprime");
          }}
        >
          <p className="text-sm text-ink">
            La suppression est définitive : progression, résultats, analyses d&apos;offres, passeport et attestations seront effacés. Un abonnement actif doit être résilié avant.
            Les factures sont conservées le temps imposé par la loi.
          </p>
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Field label="Mot de passe" htmlFor="pw-del">
            <PasswordInput id="pw-del" name="password" required autoComplete="current-password" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={pending}>
              Supprimer définitivement
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
