"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startInterviewAction } from "@/server/actions/career";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Select } from "@/components/ui/field";
import { INTERVIEW_ROLES, ROLE_LABELS } from "@/content/career-schema";

const AVAILABLE = new Set(["support_n1", "support_industriel"]);

export function InterviewSetup({ quotaText }: { quotaText: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-4"
      action={async (f) => {
        setPending(true);
        setError(null);
        const r = await startInterviewAction({
          role: f.get("role") as (typeof INTERVIEW_ROLES)[number],
          level: f.get("level") as "debutant" | "intermediaire",
          sector: f.get("sector") as "general",
          kind: f.get("kind") as "mixte",
          lang: f.get("lang") as "fr" | "en",
          durationMin: Number(f.get("duration")) as 15 | 30 | 45,
        });
        setPending(false);
        if (!r.ok) return setError(r.error);
        router.push(`/campus/carriere/entretiens/${r.data.sessionId}`);
      }}
    >
      {error ? <FormMessage>{error}</FormMessage> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Métier visé" htmlFor="role" hint="Les autres métiers ouvriront avec leurs parcours.">
          <Select id="role" name="role" defaultValue="support_n1">
            {INTERVIEW_ROLES.map((r) => (
              <option key={r} value={r} disabled={!AVAILABLE.has(r)}>
                {ROLE_LABELS[r]}
                {AVAILABLE.has(r) ? "" : " (bientôt)"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Niveau" htmlFor="level">
          <Select id="level" name="level" defaultValue="debutant">
            <option value="debutant">Débutant</option>
            <option value="intermediaire">Intermédiaire</option>
          </Select>
        </Field>
        <Field label="Secteur" htmlFor="sector">
          <Select id="sector" name="sector" defaultValue="general">
            <option value="general">Tous secteurs</option>
            <option value="logistique">Logistique</option>
            <option value="industrie">Industrie</option>
            <option value="retail">Retail et luxe</option>
            <option value="sante">Santé</option>
          </Select>
        </Field>
        <Field label="Type d'entretien" htmlFor="kind">
          <Select id="kind" name="kind" defaultValue="mixte">
            <option value="mixte">Mixte</option>
            <option value="technique">Technique</option>
            <option value="rh">RH</option>
          </Select>
        </Field>
        <Field label="Durée" htmlFor="duration">
          <Select id="duration" name="duration" defaultValue="15">
            <option value="15">15 minutes, 4 questions</option>
            <option value="30">30 minutes, 7 questions</option>
            <option value="45">45 minutes, 10 questions</option>
          </Select>
        </Field>
        <Field label="Langue" htmlFor="lang">
          <Select id="lang" name="lang" defaultValue="fr">
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Préparation…" : "Commencer la simulation"}
        </Button>
        <span className="text-sm text-muted">{quotaText}</span>
      </div>
    </form>
  );
}
