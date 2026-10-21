"use client";

import { Button } from "@/components/ui/button";

export default function CampusError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-lg space-y-4 py-10">
      <h1 className="text-xl font-semibold">Cette page n&apos;a pas pu s&apos;afficher.</h1>
      <p className="text-[15px] text-muted">Une erreur technique est survenue{error.digest ? ` (réf. ${error.digest})` : ""}. Votre progression enregistrée n&apos;est pas perdue.</p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
