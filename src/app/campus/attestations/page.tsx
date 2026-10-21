import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { attestations } from "@/server/db/schema";
import { EmptyState, PageHeader, Panel } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { formatCode } from "@/lib/codes-client";
import { Monogram } from "@/components/brand/logo";

export const metadata = { title: "Attestations" };

export default async function AttestationsPage() {
  const u = await requireUser("/campus/attestations");
  const rows = await getDb().select().from(attestations).where(eq(attestations.userId, u.id));
  return (
    <div className="space-y-8">
      <PageHeader
        title="Attestations"
        description="Les attestations internes Harmonie IT Academy sont délivrées après la réussite d'un examen final. Elles ne sont ni des diplômes d'État, ni des titres RNCP, ni des certifications d'éditeurs."
      />
      {rows.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {rows.map((a) => (
            <Panel key={a.id} className="relative overflow-hidden p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">Harmonie IT Academy atteste que</p>
                  <p className="mt-1 text-xl font-semibold">{u.name}</p>
                  <p className="mt-3 text-[15px] text-ink-2">{a.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    Délivrée le {formatDate(a.issuedAt)}, score {(a.details as { percent?: number }).percent ?? "—"} %
                  </p>
                </div>
                <Monogram tone="gold" className="h-10 w-10" />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <p className="flex items-center gap-2 text-sm">
                  <BadgeCheck className="h-4 w-4 text-gold" aria-hidden="true" /> Code <code className="inline-code">{formatCode(a.verificationCode)}</code>
                </p>
                <Link href={`/verifier/${a.verificationCode}`} className="text-sm underline underline-offset-4">
                  Page de vérification publique
                </Link>
              </div>
              {a.revokedAt ? <p className="mt-3 text-sm text-danger">Révoquée le {formatDate(a.revokedAt)}.</p> : null}
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState title="Aucune attestation pour l'instant" action={<ButtonLink href="/campus/evaluations/examen-final-support-n1">Voir l&apos;examen final Support N1</ButtonLink>}>
          Terminez le parcours, entraînez-vous avec l&apos;examen blanc, puis passez l&apos;examen final.
        </EmptyState>
      )}
    </div>
  );
}
