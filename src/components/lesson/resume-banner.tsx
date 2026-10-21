"use client";

import { useState } from "react";

export function ResumeBanner({ blockId }: { blockId: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="mb-6 flex max-w-[78ch] flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-signal/25 bg-signal-wash px-4 py-3 text-sm">
      <span className="text-ink">Vous aviez commencé cette leçon.</span>
      <span className="flex gap-2">
        <button
          type="button"
          className="font-medium text-signal-ink hover:underline"
          onClick={() => {
            document.getElementById(blockId)?.scrollIntoView({ behavior: "smooth", block: "start" });
            setHidden(true);
          }}
        >
          Reprendre où je m&apos;étais arrêté
        </button>
        <button type="button" className="text-muted hover:text-ink" onClick={() => setHidden(true)}>
          Ignorer
        </button>
      </span>
    </div>
  );
}
