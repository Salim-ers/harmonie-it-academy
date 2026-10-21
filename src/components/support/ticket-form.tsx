"use client";

import { useActionState } from "react";
import { createTicketAction } from "@/server/actions/support";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/field";

export function TicketForm({ categories }: { categories: Record<string, string> }) {
  const [state, action, pending] = useActionState(createTicketAction, null as null | { error?: string });
  return (
    <form action={action} className="space-y-4">
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
        <Field label="Catégorie" htmlFor="category">
          <Select id="category" name="category" defaultValue="question_pedagogique">
            {Object.entries(categories).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Objet" htmlFor="subject">
          <Input id="subject" name="subject" required maxLength={160} />
        </Field>
      </div>
      <Field label="Votre demande" htmlFor="body" hint="Pour une correction contestée, indiquez l'évaluation et la question concernées.">
        <Textarea id="body" name="body" required maxLength={5000} className="min-h-32" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer"}
      </Button>
    </form>
  );
}
