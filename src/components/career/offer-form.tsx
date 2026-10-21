"use client";

import { useActionState } from "react";
import { analyzeOfferAction } from "@/server/actions/career";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/field";

export function OfferForm() {
  const [state, action, pending] = useActionState(analyzeOfferAction, null as null | { error?: string });
  return (
    <form action={action} className="space-y-4">
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="Intitulé de l'offre" htmlFor="title">
          <Input id="title" name="title" placeholder="Technicien support N1, Lyon" required maxLength={160} />
        </Field>
        <Field label="Date de l'entretien" htmlFor="interviewDate" hint="Facultatif">
          <Input id="interviewDate" name="interviewDate" type="date" />
        </Field>
      </div>
      <Field label="Texte complet de l'offre" htmlFor="offerText" hint="Collez l'annonce telle quelle. Elle reste privée et vous pouvez la supprimer à tout moment.">
        <Textarea id="offerText" name="offerText" required minLength={200} maxLength={20000} className="min-h-56" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Analyse…" : "Analyser l'offre"}
      </Button>
    </form>
  );
}
