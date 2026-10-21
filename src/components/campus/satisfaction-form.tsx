"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { submitSatisfactionAction } from "@/server/actions/learning";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Answer = { rating: number; usefulForJob: boolean | null; comment: string } | null;

/** Appréciation de fin de formation. Les réponses sont lues par l'équipe pédagogique sans votre nom. */
export function SatisfactionForm({ courseId, answer }: { courseId: string; answer: Answer }) {
  const [rating, setRating] = useState(answer?.rating ?? 0);
  const [useful, setUseful] = useState<boolean | null>(answer?.usefulForJob ?? null);
  const [comment, setComment] = useState(answer?.comment ?? "");
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await submitSatisfactionAction({ courseId, rating, usefulForJob: useful, comment });
          setMsg(r.ok ? { tone: "ok", text: "Merci, votre avis est enregistré. Vous pouvez le modifier à tout moment." } : { tone: "danger", text: r.error });
        });
      }}
    >
      <fieldset>
        <legend className="text-sm font-medium text-ink">Votre note globale</legend>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Note de 1 à 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} sur 5`}
              onClick={() => setRating(n)}
              className="rounded p-1 text-line-strong hover:text-gold"
            >
              <Star className={cn("h-6 w-6", n <= rating && "fill-[var(--gold)] text-gold")} aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-ink">Cette formation vous aide-t-elle pour votre projet professionnel ?</legend>
        <div className="mt-2 flex gap-2">
          {[
            { v: true, l: "Oui" },
            { v: false, l: "Pas vraiment" },
          ].map((o) => (
            <label key={o.l} className={cn("flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-3 py-1.5 text-sm", useful === o.v ? "border-signal bg-signal-wash" : "border-line hover:border-line-strong")}>
              <input type="radio" name="useful" className="accent-[var(--signal)]" checked={useful === o.v} onChange={() => setUseful(o.v)} />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="sat-comment" className="text-sm font-medium text-ink">
          Ce qui vous a aidé, ce qui manque
        </label>
        <Textarea id="sat-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1500} placeholder="Facultatif. Une leçon trop rapide, un exemple qui vous a manqué, un laboratoire marquant…" />
      </div>
      {msg ? <FormMessage tone={msg.tone}>{msg.text}</FormMessage> : null}
      <Button type="submit" variant="secondary" disabled={pending || rating === 0}>
        {pending ? "Envoi…" : answer ? "Mettre à jour mon avis" : "Envoyer mon avis"}
      </Button>
    </form>
  );
}
