"use client";

import { useState } from "react";
import { staffReplyTicketAction, staffTicketStatusAction } from "@/server/actions/studio";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Msg = { id: string; body: string; createdAt: Date | string; authorName: string | null; fromStaff: boolean };

export function StaffTicketThread({ ticketId, messages, status }: { ticketId: string; messages: Msg[]; status: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className={cn("rounded-[var(--radius-panel)] border px-4 py-3", m.fromStaff ? "border-signal/25 bg-signal-wash" : "border-line bg-surface")}>
            <p className="text-xs text-muted">
              {m.authorName}, {new Date(m.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[15px] text-ink-2">{m.body}</p>
          </li>
        ))}
      </ol>
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label="Réponse" className="min-h-28" />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!body.trim()}
          onClick={async () => {
            const r = await staffReplyTicketAction(ticketId, body);
            if (!r.ok) return setError(r.error);
            setBody("");
          }}
        >
          Répondre
        </Button>
        {status !== "resolved" ? (
          <Button variant="secondary" onClick={async () => void (await staffTicketStatusAction(ticketId, "resolved"))}>
            Marquer comme résolu
          </Button>
        ) : null}
        <Button variant="ghost" onClick={async () => void (await staffTicketStatusAction(ticketId, "closed"))}>
          Clôturer
        </Button>
      </div>
    </div>
  );
}
