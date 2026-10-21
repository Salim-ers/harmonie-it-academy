"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text, label = "Copier la commande" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {}
      }}
      className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-term-dim transition hover:bg-white/10 hover:text-term-fg"
      aria-label={label}
    >
      {done ? <Check className="h-3.5 w-3.5 text-term-ok" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {done ? "Copié" : "Copier"}
    </button>
  );
}
