import type { ReactNode } from "react";

export function PageIntro({ title, children, aside }: { title: string; children?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <h1 className="font-display text-[42px] leading-[1.05] text-ink sm:text-[56px]">{title}</h1>
          {children ? <div className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2">{children}</div> : null}
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-ink-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink-2">
      {children}
    </div>
  );
}

export function LegalNotice() {
  return (
    <p className="rounded-[var(--radius-control)] border border-warn/40 bg-warn-wash px-4 py-3 text-sm text-ink">
      Document de travail préparé pour Harmonie Solutions. Il doit être complété (identité, adresses, sous-traitants) et validé par un professionnel du droit avant mise en ligne
      définitive.
    </p>
  );
}
