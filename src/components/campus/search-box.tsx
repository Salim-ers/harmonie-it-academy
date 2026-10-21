"use client";

import Link from "next/link";
import { Lock, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Hit = { kind: "lesson" | "glossary" | "scenario"; slug: string; title: string; excerpt: string; snippet: string; locked: boolean };

function hrefFor(h: Hit) {
  return h.kind === "lesson" ? `/campus/cours/${h.slug}` : h.kind === "scenario" ? `/campus/laboratoires/${h.slug}` : `/glossaire#${h.slug}`;
}

/** Surligne les passages délimités par « » renvoyés par ts_headline (texte uniquement, aucun HTML). */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/(«[^»]*»)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("«") ? (
          <mark key={i} className="rounded bg-signal-wash px-0.5 text-ink">
            {p.slice(1, -1)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function SearchBox() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/recherche?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (r.ok) setHits(((await r.json()) as { hits: Hit[] }).hits);
      } catch {}
      setLoading(false);
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line text-sm text-muted transition hover:border-line-strong sm:w-56 sm:justify-start sm:px-3"
        aria-label="Rechercher dans les cours"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Rechercher</span>
        <kbd className="ml-auto hidden rounded border border-line px-1.5 font-mono text-[11px] sm:inline">Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="m-auto mt-[12vh] w-[min(640px,calc(100vw-2rem))] rounded-[var(--radius-panel)] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-ink/30"
        aria-label="Recherche"
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="h-4 w-4 text-muted" aria-hidden="true" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="DHCP, compte verrouillé, imprimante…"
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
            aria-label="Termes recherchés"
          />
          {loading ? <span className="text-xs text-muted">…</span> : null}
        </div>
        <ul className="max-h-[60vh] overflow-y-auto p-2" aria-live="polite">
          {q.trim().length >= 2 && !hits.length && !loading ? <li className="px-3 py-6 text-center text-sm text-muted">Aucun résultat. Essayez un terme plus général.</li> : null}
          {(q.trim().length >= 2 ? hits : []).map((h) => (
            <li key={`${h.kind}-${h.slug}`}>
              <Link href={hrefFor(h)} onClick={() => setOpen(false)} className="block rounded-[var(--radius-control)] px-3 py-2.5 hover:bg-mist">
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  {h.locked ? <Lock className="h-3.5 w-3.5 text-muted" aria-label="Contenu réservé" /> : null}
                  {h.title}
                  <span className="text-xs font-normal text-muted">{h.kind === "lesson" ? "Leçon" : h.kind === "scenario" ? "Laboratoire" : "Glossaire"}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{h.snippet ? <Snippet text={h.snippet} /> : h.excerpt}</span>
              </Link>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
