"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { PasswordInput } from "./password-input";

function safeNext(next: string | null) {
  // Uniquement des chemins internes : pas de redirection ouverte vers un site tiers.
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/campus";
}

export function SignInForm({ next, oauth }: { next: string | null; oauth: { google: boolean; microsoft: boolean } }) {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const target = safeNext(next);

  async function onCredentials(form: FormData) {
    setPending(true);
    setError(null);
    setInfo(null);
    const email = String(form.get("email") ?? "");
    const { data, error: err } = await authClient.signIn.email({ email, password: String(form.get("password") ?? ""), callbackURL: target });
    setPending(false);
    if (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") setInfo(authErrorMessage(err));
      else setError(authErrorMessage(err));
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      setStep("totp");
      return;
    }
    router.replace(target);
    router.refresh();
  }

  async function onTotp(form: FormData) {
    setPending(true);
    setError(null);
    const code = String(form.get("code") ?? "").replace(/\s/g, "");
    const backup = code.length > 6;
    const res = backup ? await authClient.twoFactor.verifyBackupCode({ code }) : await authClient.twoFactor.verifyTotp({ code, trustDevice: Boolean(form.get("trust")) });
    setPending(false);
    if (res.error) return setError(authErrorMessage(res.error));
    router.replace(target);
    router.refresh();
  }

  if (step === "totp") {
    return (
      <form action={onTotp} className="space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Vérification en deux étapes</h1>
          <p className="text-[15px] text-muted">Saisissez le code à six chiffres de votre application d&apos;authentification, ou l&apos;un de vos codes de secours.</p>
        </div>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <Field label="Code" htmlFor="code">
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus required maxLength={20} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" name="trust" className="h-4 w-4 accent-[var(--signal)]" /> Faire confiance à cet appareil pendant 30 jours
        </label>
        <Button type="submit" disabled={pending} className="w-full" size="lg">
          {pending ? "Vérification…" : "Valider"}
        </Button>
      </form>
    );
  }

  return (
    <form action={onCredentials} className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Se connecter</h1>
        <p className="text-[15px] text-muted">
          Pas encore de compte ?{" "}
          <Link href={`/inscription${next ? `?suite=${encodeURIComponent(next)}` : ""}`} className="text-ink underline underline-offset-4">
            Créer un compte gratuit
          </Link>
        </p>
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
      {info ? <FormMessage tone="info">{info}</FormMessage> : null}
      <Field label="Adresse e-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        <Link href="/mot-de-passe-oublie" className="text-sm text-muted hover:text-ink">
          Mot de passe oublié ?
        </Link>
      </div>
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      {oauth.google || oauth.microsoft ? (
        <div className="space-y-2 border-t border-line pt-5">
          {oauth.google ? (
            <Button variant="secondary" className="w-full" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: target })}>
              Continuer avec Google
            </Button>
          ) : null}
          {oauth.microsoft ? (
            <Button variant="secondary" className="w-full" onClick={() => authClient.signIn.social({ provider: "microsoft", callbackURL: target })}>
              Continuer avec Microsoft
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
