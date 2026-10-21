"use client";

import { useState, useTransition, type ReactNode } from "react";
import { AlertTriangle, Check, CircleDot, Copy, ShieldCheck } from "lucide-react";
import { reviewCvAction } from "@/server/actions/career";
import type { CvReview, CvTermLine } from "@/server/engines/cv-review";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Textarea } from "@/components/ui/field";
import { Badge, Panel } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

const STATUS = {
  ok: { icon: Check, cls: "text-ok", label: "Bon point" },
  "a-ameliorer": { icon: CircleDot, cls: "text-warn", label: "À améliorer" },
  attention: { icon: AlertTriangle, cls: "text-danger", label: "À corriger" },
} as const;

export function CvReviewTool({ offers, defaultOfferId }: { offers: { id: string; title: string }[]; defaultOfferId: string }) {
  const [cvText, setCvText] = useState("");
  const [offerId, setOfferId] = useState(defaultOfferId);
  const [result, setResult] = useState<CvReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <Panel className="p-6" as="section">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const r = await reviewCvAction({ cvText, offerId });
              if (r.ok) setResult(r.data);
              else setError(r.error);
            });
          }}
        >
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Field
            label="Texte de votre CV"
            htmlFor="cvText"
            hint="Copiez le contenu de votre CV (depuis Word, PDF ou Google Docs) et collez-le ici. Il n'est pas enregistré : l'analyse se fait à la volée et disparaît quand vous quittez la page."
          >
            <Textarea id="cvText" value={cvText} onChange={(e) => setCvText(e.target.value)} required minLength={200} maxLength={15000} className="min-h-64" />
          </Field>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field label="Offre visée" htmlFor="offerId" hint={offers.length ? undefined : "Analysez d'abord une offre pour comparer votre CV à ses exigences."}>
              <select
                id="offerId"
                value={offerId}
                onChange={(e) => setOfferId(e.target.value)}
                className="h-10 w-full min-w-64 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-sm text-ink"
              >
                <option value="">Aucune offre précise</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" disabled={pending || cvText.trim().length < 200}>
              {pending ? "Relecture…" : "Relire mon CV"}
            </Button>
          </div>
        </form>
      </Panel>

      {result ? <Result r={result} /> : null}
    </div>
  );
}

function Result({ r }: { r: CvReview }) {
  return (
    <div className="space-y-6" aria-live="polite">
      <Panel as="section" className="p-6">
        <h2 className="font-medium text-ink">Forme et lisibilité</h2>
        <ul className="mt-4 space-y-4">
          {r.checks.map((c) => {
            const s = STATUS[c.status];
            return (
              <li key={c.id} className="flex gap-3">
                <s.icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.cls)} aria-hidden="true" />
                <div>
                  <p className="text-[15px] font-medium text-ink">
                    {c.title} <span className="sr-only">({s.label})</span>
                  </p>
                  <p className="mt-0.5 text-[15px] leading-relaxed text-ink-2">{c.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <TermPanel
          title="Vous l'avez prouvé, ajoutez-le"
          empty="Rien à ajouter pour l'instant : chaque laboratoire et chaque examen réussi alimente cette liste."
          lines={r.addProven}
          render={(l) => (
            <>
              Niveau prouvé {l.provenLevel} %{l.inOffer ? ", et l'offre le demande" : ""}.
            </>
          )}
        />
        <TermPanel
          title="Cité dans votre CV : préparez-vous à le défendre"
          empty="Tout ce que votre CV affirme est appuyé par des preuves sur la plateforme, ou n'est pas évaluable ici."
          lines={r.defend}
          render={(l) => <>{l.provenLevel === null ? "Aucune preuve sur la plateforme pour l'instant." : `Niveau prouvé ${l.provenLevel} %, encore à confirmer.`} {l.advice}</>}
        />
      </div>

      {r.offerCoverage ? (
        <Panel as="section" className="p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-medium text-ink">Face à l&apos;offre choisie</h2>
            <p className="text-sm text-muted">
              Votre CV reprend {r.offerCoverage.inCv} des {r.offerCoverage.total} points repérés dans l&apos;annonce.
            </p>
          </div>
          {r.offerGaps.length ? (
            <ul className="mt-4 divide-y divide-line">
              {r.offerGaps.map((l) => (
                <li key={l.id} className="py-3">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-ink">
                    {l.label}
                    {l.importantInOffer ? <Badge tone="danger">Présenté comme indispensable</Badge> : null}
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{l.advice}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[15px] text-ink-2">Chaque point de l&apos;offre est soit dans votre CV, soit prouvé sur la plateforme.</p>
          )}
          <p className="mt-4 text-sm text-muted">
            N&apos;ajoutez un terme de l&apos;annonce que si vous pouvez l&apos;expliquer. Le plan de préparation de l&apos;analyse d&apos;offre vous dit par où commencer.
          </p>
        </Panel>
      ) : null}

      {r.suggestedSection.length ? <Suggested lines={r.suggestedSection} /> : null}

      <p className="flex gap-2 text-sm text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {r.disclaimer}
      </p>
    </div>
  );
}

function TermPanel({ title, empty, lines, render }: { title: string; empty: string; lines: CvTermLine[]; render: (l: CvTermLine) => ReactNode }) {
  return (
    <Panel as="section" className="p-6">
      <h2 className="font-medium text-ink">{title}</h2>
      {lines.length ? (
        <ul className="mt-4 space-y-3">
          {lines.map((l) => (
            <li key={l.id}>
              <p className="text-[15px] font-medium text-ink">{l.label}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{render(l)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      )}
    </Panel>
  );
}

function Suggested({ lines }: { lines: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = lines.join("\n");
  return (
    <Panel as="section" className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-ink">Rubrique « Projets » proposée</h2>
          <p className="mt-1 text-sm text-muted">Écrite uniquement à partir de vos preuves. Adaptez-la à votre ton.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {}
          }}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copié" : "Copier le texte"}
        </Button>
      </div>
      <ul className="mt-4 space-y-2 rounded-[var(--radius-control)] border border-line bg-paper p-4 text-[15px] leading-relaxed text-ink">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </Panel>
  );
}
