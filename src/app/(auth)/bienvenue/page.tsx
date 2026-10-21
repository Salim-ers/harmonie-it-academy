import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { ButtonLink } from "@/components/ui/button";

/** Arrivée après confirmation de l'adresse e-mail. */
async function Welcome({ searchParams }: { searchParams: Promise<{ suite?: string; error?: string }> }) {
  const sp = await searchParams;
  if (sp.error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Lien de confirmation expiré</h1>
        <p className="text-[15px] text-muted">Connectez-vous : un nouveau lien vous sera envoyé automatiquement.</p>
        <ButtonLink href="/connexion">Se connecter</ButtonLink>
      </div>
    );
  }
  const u = await getCurrentUser();
  if (!u) redirect("/connexion");
  const next = sp.suite && sp.suite.startsWith("/") && !sp.suite.startsWith("//") ? sp.suite : "/campus";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Bienvenue, {u.name.split(" ")[0]}</h1>
      <p className="text-[15px] leading-relaxed text-muted">
        Votre adresse est confirmée. Nous vous conseillons de commencer par le positionnement : douze questions, sans note éliminatoire, pour savoir par où commencer.
      </p>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/campus/evaluations/positionnement-support-n1">Faire le positionnement</ButtonLink>
        <ButtonLink href={next} variant="secondary">
          Plus tard
        </ButtonLink>
      </div>
    </div>
  );
}

export default function Page(props: PageProps<"/bienvenue">) {
  return (
    <Suspense>
      <Welcome searchParams={props.searchParams as Promise<{ suite?: string; error?: string }>} />
    </Suspense>
  );
}
