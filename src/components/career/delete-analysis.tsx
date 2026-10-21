"use client";

import { useRouter } from "next/navigation";
import { deleteAnalysisAction } from "@/server/actions/career";
import { Button } from "@/components/ui/button";

export function DeleteAnalysis({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!confirm("Supprimer définitivement cette analyse et le texte de l'offre ?")) return;
        const r = await deleteAnalysisAction(id);
        if (r.ok) router.push("/campus/carriere");
      }}
    >
      Supprimer l&apos;analyse
    </Button>
  );
}
