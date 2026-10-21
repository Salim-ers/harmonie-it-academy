"use client";

import { useState, useTransition } from "react";
import { submitAssignmentAction } from "@/server/actions/mentoring";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/field";

export function AssignmentForm({ slug, disabledReason }: { slug: string; disabledReason: string | null }) {
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await submitAssignmentAction({ slug, body });
          if (r.ok) {
            setBody("");
            setMsg({ tone: "ok", text: "Livrable envoyé. Vous serez prévenu dans votre tableau de bord dès que la relecture sera faite." });
          } else setMsg({ tone: "danger", text: r.error });
        });
      }}
    >
      <label htmlFor="body" className="text-sm font-medium text-ink">
        Votre livrable
      </label>
      <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={12000} className="min-h-72" disabled={Boolean(disabledReason)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{words} mots. Relisez-vous : le mentor relit la version envoyée, pas un brouillon.</p>
        <Button type="submit" disabled={pending || Boolean(disabledReason) || body.trim().length < 300}>
          {pending ? "Envoi…" : "Envoyer pour relecture"}
        </Button>
      </div>
      {disabledReason ? <FormMessage tone="info">{disabledReason}</FormMessage> : null}
      {msg ? <FormMessage tone={msg.tone}>{msg.text}</FormMessage> : null}
    </form>
  );
}
