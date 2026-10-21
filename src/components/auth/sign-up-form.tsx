"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { signUpAction, type SignUpState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { PasswordInput } from "./password-input";

export function SignUpForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUpAction, {});
  if (state.done) {
    return (
      <div className="space-y-4">
        <MailCheck className="h-8 w-8 text-ok" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight">Vérifiez votre boîte de réception</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Si l&apos;adresse <strong className="text-ink">{state.email}</strong> peut être utilisée, un lien de confirmation vient d&apos;y être envoyé. Il est valable 24 heures.
        </p>
        <p className="text-sm text-muted">Rien reçu ? Regardez dans les courriers indésirables, puis essayez de vous connecter : un nouveau lien sera envoyé.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Créer votre compte</h1>
        <p className="text-[15px] text-muted">
          Gratuit, sans carte bancaire. Déjà inscrit ?{" "}
          <Link href="/connexion" className="text-ink underline underline-offset-4">
            Se connecter
          </Link>
        </p>
      </div>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Prénom et nom" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required maxLength={80} />
      </Field>
      <Field label="Adresse e-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mot de passe" htmlFor="password" hint="12 caractères minimum. Une phrase de passe est idéale.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={12} />
      </Field>
      <label className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-2">
        <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 shrink-0 accent-[var(--signal)]" />
        <span>
          J&apos;accepte les{" "}
          <Link href="/legal/cgv" className="underline underline-offset-4" target="_blank">
            conditions d&apos;utilisation et de vente
          </Link>{" "}
          et j&apos;ai lu la{" "}
          <Link href="/legal/confidentialite" className="underline underline-offset-4" target="_blank">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Création du compte…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
