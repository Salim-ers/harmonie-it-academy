import { Suspense } from "react";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { verifyAttestation } from "@/server/services/career";
import { PageIntro } from "@/components/marketing/page-intro";
import { formatDate } from "@/lib/format";
import { formatCode } from "@/lib/codes-client";

export const metadata = { title: "Vérification d'attestation", robots: { index: false } };

async function Result({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const a = await verifyAttestation(code);
  if (!a || a.revokedAt) {
    return (
      <div className="flex gap-3 rounded-[var(--radius-panel)] border border-danger/30 bg-danger-wash p-5">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <p className="font-medium">{a?.revokedAt ? "Attestation révoquée" : "Aucune attestation ne correspond à ce code"}</p>
          <p className="mt-1 text-sm text-ink-2">Vérifiez la saisie du code {formatCode(code.toUpperCase())}. En cas de doute, contactez Harmonie IT Academy.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-panel)] border border-ok/30 bg-ok-wash p-6">
      <p className="flex items-center gap-2 font-medium text-ok">
        <BadgeCheck className="h-5 w-5" aria-hidden="true" /> Attestation authentique
      </p>
      <dl className="mt-4 grid gap-3 text-[15px] sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Titulaire</dt>
          <dd className="font-medium">{a.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Délivrée le</dt>
          <dd className="font-medium">{formatDate(a.issuedAt)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-muted">Intitulé</dt>
          <dd className="font-medium">{a.title}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Résultat</dt>
          <dd className="font-medium">{(a.details as { percent?: number }).percent ?? "—"} % (seuil 70 %)</dd>
        </div>
      </dl>
      <p className="mt-5 text-sm text-ink-2">
        Attestation interne délivrée par Harmonie IT Academy après réussite d&apos;un examen en ligne. Il ne s&apos;agit ni d&apos;un diplôme d&apos;État, ni d&apos;un titre RNCP, ni d&apos;une
        certification d&apos;éditeur.
      </p>
    </div>
  );
}

export default function VerifyCodePage(props: PageProps<"/verifier/[code]">) {
  return (
    <>
      <PageIntro title="Vérification d'attestation" />
      <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-[var(--radius-panel)] bg-mist" />}>
          <Result params={props.params} />
        </Suspense>
      </section>
    </>
  );
}
