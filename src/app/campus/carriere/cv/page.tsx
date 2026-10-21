import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listJobAnalyses } from "@/server/services/career";
import { CvReviewTool } from "@/components/career/cv-review";
import { PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Relecture de CV" };

export default async function CvReviewPage(props: PageProps<"/campus/carriere/cv">) {
  const { offre } = await props.searchParams;
  const u = await requireUser("/campus/carriere/cv");
  const analyses = await listJobAnalyses(u.id);
  const preselected = typeof offre === "string" && analyses.some((a) => a.id === offre) ? offre : (analyses[0]?.id ?? "");
  return (
    <div className="space-y-8">
      <Link href="/campus/carriere" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Harmonie Career
      </Link>
      <PageHeader
        title="Relecture de CV"
        description="Votre CV confronté à trois questions de recruteur : est-il clair, montre-t-il ce que vous avez réellement prouvé, répond-il à l'offre visée ?"
      />
      <CvReviewTool offers={analyses.map((a) => ({ id: a.id, title: a.title }))} defaultOfferId={preselected} />
    </div>
  );
}
