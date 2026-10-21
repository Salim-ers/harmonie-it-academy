"use client";

import { useState } from "react";
import { replyTicketAction, setTicketStatusAction } from "@/server/actions/support";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Msg = { id: string; body: string; createdAt: Date | string; authorName: string | null; fromStaff: boolean };

export function TicketThread({ ticketId, messages, status, staffView }: { ticketId: string; messages: Msg[]; status: string; staffView: boolean }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className={cn("rounded-[var(--radius-panel)] border px-4 py-3", m.fromStaff ? "border-signal/25 bg-signal-wash" : "border-line bg-surface")}>
            <p className="text-xs text-muted">
              {m.fromStaff ? `Équipe Harmonie${m.authorName ? `, ${m.authorName}` : ""}` : m.authorName ?? "Vous"}, {new Date(m.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[15px] text-ink-2">{m.body}</p>
          </li>
        ))}
      </ol>
      {status !== "closed" ? (
        <form
          className="space-y-3"
          action={async () => {
            setPending(true);
            setError(null);
            const r = await replyTicketAction(ticketId, body);
            setPending(false);
            if (!r.ok) return setError(r.error);
            setBody("");
          }}
        >
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label="Votre message" className="min-h-28" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !body.trim()}>
              Répondre
            </Button>
            <Button variant="ghost" onClick={async () => void (await setTicketStatusAction(ticketId, staffView ? "resolved" : "closed"))}>
              {staffView ? "Marquer comme résolu" : "Clôturer ma demande"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">Demande clôturée.</p>
      )}
    </div>
  );
}
