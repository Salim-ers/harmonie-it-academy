"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play } from "lucide-react";
import { startLabAction } from "@/server/actions/labs";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

export function StartLab({ slug, label = "Prendre le ticket" }: { slug: string; label?: string }) {
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
          const r = await startLabAction(slug);
          setPending(false);
          if (!r.ok) return setError(r.error);
          router.refresh();
        }}
      >
        <Play className="h-4 w-4" aria-hidden="true" /> {pending ? "Ouverture…" : label}
      </Button>
      {error ? <FormMessage>{error}</FormMessage> : null}
    </div>
  );
}
