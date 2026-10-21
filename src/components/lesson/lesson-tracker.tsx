"use client";

import { useEffect, useRef } from "react";
import { touchLessonAction } from "@/server/actions/learning";

/**
 * Mémorise la position de lecture (dernier bloc visible) et le temps réellement passé
 * (onglet visible uniquement). Envoi toutes les 30 s et à la fermeture.
 */
export function LessonTracker({ slug }: { slug: string }) {
  const lastBlock = useRef<string | null>(null);
  const activeSince = useRef<number | null>(null);
  const accumulated = useRef(0);

  useEffect(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-block]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) lastBlock.current = (e.target as HTMLElement).dataset.block ?? null;
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    blocks.forEach((b) => io.observe(b));
    const start = () => {
      if (document.visibilityState === "visible" && activeSince.current === null) activeSince.current = Date.now();
    };
    const stop = () => {
      if (activeSince.current !== null) {
        accumulated.current += (Date.now() - activeSince.current) / 1000;
        activeSince.current = null;
      }
    };
    const flush = () => {
      stop();
      const delta = Math.round(accumulated.current);
      accumulated.current = 0;
      if (delta > 0 || lastBlock.current) void touchLessonAction({ slug, blockId: lastBlock.current, deltaSec: delta });
      start();
    };
    start();
    const onVis = () => (document.visibilityState === "visible" ? start() : flush());
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(flush, 30_000);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
      flush();
    };
  }, [slug]);
  return null;
}
