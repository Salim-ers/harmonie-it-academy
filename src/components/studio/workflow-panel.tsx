"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDraftAction, reviewStepAction } from "@/server/actions/studio";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/field";

type Step = "submit" | "technical" | "pedagogical";

export function WorkflowPanel({
  lessonId,
  version,
  canEdit,
  canTechnical,
  canPedagogical,
}: {
  lessonId: string;
  version: { id: string; status: string; version: number } | null;
  canEdit: boolean;
  canTechnical: boolean;
  canPedagogical: boolean;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function act(step: Step, decision: "approved" | "changes_requested") {
    if (!version) return;
    setPending(true);
    setError(null);
    const r = await reviewStepAction({ versionId: version.id, step, decision, comment });
    setPending(false);
    if (!r.ok) return setError(r.error);
    setComment("");
    router.refresh();
  }

  const status = version?.status;
  return (
    <div className="space-y-3">
      <ol className="space-y-1.5 text-sm">
        {[
          ["draft", "Brouillon"],
          ["technical_review", "Révision technique"],
          ["pedagogical_review", "Validation pédagogique"],
          ["published", "Publication"],
        ].map(([k, l]) => (
          <li key={k} className={k === status ? "font-medium text-ink" : "text-muted"}>
            {k === status ? "● " : "○ "}
            {l}
          </li>
        ))}
      </ol>
      {error ? <FormMessage>{error}</FormMessage> : null}
      {!version || status === "published" || status === "archived" ? (
        canEdit ? (
          <Button
            className="w-full"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const r = await createDraftAction(lessonId);
              setPending(false);
              if (!r.ok) return setError(r.error);
              router.refresh();
            }}
          >
            Créer une nouvelle version
          </Button>
        ) : (
          <p className="text-sm text-muted">Aucune version en cours.</p>
        )
      ) : (
        <>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Commentaire (obligatoire pour demander des corrections)" aria-label="Commentaire de relecture" className="min-h-20 text-sm" />
          {status === "draft" && canEdit ? (
            <Button className="w-full" disabled={pending} onClick={() => act("submit", "approved")}>
              Soumettre à la révision technique
            </Button>
          ) : null}
          {status === "technical_review" && canTechnical ? (
            <div className="grid gap-2">
              <Button disabled={pending} onClick={() => act("technical", "approved")}>
                Valider techniquement
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => act("technical", "changes_requested")}>
                Demander des corrections
              </Button>
            </div>
          ) : null}
          {status === "pedagogical_review" && canPedagogical ? (
            <div className="grid gap-2">
              <Button variant="signal" disabled={pending} onClick={() => act("pedagogical", "approved")}>
                Valider et publier
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => act("pedagogical", "changes_requested")}>
                Demander des corrections
              </Button>
            </div>
          ) : null}
          {(status === "technical_review" && !canTechnical) || (status === "pedagogical_review" && !canPedagogical) ? (
            <p className="text-sm text-muted">En attente d&apos;une autre personne : l&apos;auteur ne peut pas valider sa propre version.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
