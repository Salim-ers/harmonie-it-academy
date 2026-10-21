"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { PasswordInput } from "./password-input";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (sent) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Lien envoyé</h1>
        <p className="text-[15px] leading-relaxed text-muted">Si un compte correspond à cette adresse, vous recevrez un lien valable 30 minutes.</p>
        <Link href="/connexion" className="text-sm text-ink underline underline-offset-4">
          Retour à la connexion
        </Link>
      </div>
    );
  }
  return (
    <form
      className="space-y-5"
      action={async (form) => {
        setPending(true);
        setError(null);
        const { error: err } = await authClient.requestPasswordReset({ email: String(form.get("email") ?? ""), redirectTo: "/reinitialiser-mot-de-passe" });
        setPending(false);
        if (err && err.status === 429) return setError(authErrorMessage(err));
        setSent(true);
      }}
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
        <p className="text-[15px] text-muted">Indiquez l&apos;adresse de votre compte : nous vous enverrons un lien pour en choisir un nouveau.</p>
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Field label="Adresse e-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Envoi…" : "Recevoir le lien"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token, invalid }: { token: string | null; invalid: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!token || invalid) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Lien expiré</h1>
        <p className="text-[15px] text-muted">Ce lien de réinitialisation n&apos;est plus valable.</p>
        <Link href="/mot-de-passe-oublie" className="text-sm text-ink underline underline-offset-4">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }
  return (
    <form
      className="space-y-5"
      action={async (form) => {
        const pw = String(form.get("password") ?? "");
        if (pw.length < 12) return setError("Le mot de passe doit contenir au moins 12 caractères.");
        if (pw !== String(form.get("confirm") ?? "")) return setError("Les deux mots de passe ne correspondent pas.");
        setPending(true);
        const { error: err } = await authClient.resetPassword({ newPassword: pw, token });
        setPending(false);
        if (err) return setError(authErrorMessage(err));
        router.replace("/connexion?reinitialise=1");
      }}
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
        <p className="text-[15px] text-muted">Toutes vos sessions ouvertes seront déconnectées par sécurité.</p>
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Field label="Nouveau mot de passe" htmlFor="password" hint="12 caractères minimum.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={12} />
      </Field>
      <Field label="Confirmez le mot de passe" htmlFor="confirm">
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={12} />
      </Field>
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
