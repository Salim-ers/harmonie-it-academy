"use client";

import { useActionState } from "react";
import { contactAction, type ContactState } from "@/server/actions/public";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/field";

export function ContactForm({ kind }: { kind: "contact" | "business" }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(contactAction, {});
  if (state.sent) return <FormMessage tone="ok">Merci, votre message est bien parti. Nous vous répondons sous deux jours ouvrés.</FormMessage>;
  return (
    <form action={action} className="space-y-4">
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      <input type="hidden" name="kind" value={kind} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Site web</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" htmlFor="c-name">
          <Input id="c-name" name="name" required autoComplete="name" />
        </Field>
        <Field label="E-mail professionnel" htmlFor="c-email">
          <Input id="c-email" name="email" type="email" required autoComplete="email" />
        </Field>
      </div>
      {kind === "business" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Entreprise" htmlFor="c-company">
            <Input id="c-company" name="company" autoComplete="organization" />
          </Field>
          <Field label="Nombre de personnes à former" htmlFor="c-seats">
            <Input id="c-seats" name="seats" inputMode="numeric" />
          </Field>
        </div>
      ) : null}
      <Field label="Message" htmlFor="c-msg">
        <Textarea id="c-msg" name="message" required className="min-h-32" />
      </Field>
      <p className="text-xs text-muted">Vos coordonnées servent uniquement à vous répondre. Voir la politique de confidentialité.</p>
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer"}
      </Button>
    </form>
  );
}
