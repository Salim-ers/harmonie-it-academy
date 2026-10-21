"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startAttemptAction } from "@/server/actions/learning";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

export function StartAttempt({ slug, label }: { slug: string; label: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const r = await startAttemptAction(slug);
          setPending(false);
          if (!r.ok) return setError(r.error);
          router.push(`/campus/evaluations/tentatives/${r.data.attemptId}`);
        }}
      >
        {pending ? "Préparation…" : label}
      </Button>
      {error ? <FormMessage>{error}</FormMessage> : null}
    </div>
  );
}
