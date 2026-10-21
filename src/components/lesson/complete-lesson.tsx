"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { completeLessonAction } from "@/server/actions/learning";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

export function CompleteLesson({ slug, completed, next }: { slug: string; completed: boolean; next: { slug: string; title: string } | null }) {
  const [done, setDone] = useState(completed);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="max-w-[78ch] rounded-[var(--radius-panel)] border border-line bg-surface p-5">
      {done ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-medium text-ok">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Leçon validée
          </p>
          {next ? (
            <Link href={`/campus/cours/${next.slug}`} className="text-sm font-medium text-ink hover:underline">
              Leçon suivante : {next.title}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[15px] text-ink-2">Une leçon se valide lorsque son quiz est réussi (au moins 60 %).</p>
          {error ? <FormMessage>{error}</FormMessage> : null}
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              const r = await completeLessonAction(slug);
              setPending(false);
              if (!r.ok) return setError(r.error);
              setDone(true);
            }}
          >
            {pending ? "Validation…" : "Marquer la leçon comme terminée"}
          </Button>
        </div>
      )}
    </div>
  );
}
