import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { requireStudio } from "@/server/auth/session";
import { getLessonForEditing } from "@/server/services/studio";
import { can, ForbiddenError } from "@/server/authz/policies";
import { LessonEditor } from "@/components/studio/lesson-editor";
import { WorkflowPanel } from "@/components/studio/workflow-panel";
import { Badge, Panel } from "@/components/ui/misc";
import { VERSION_LABEL } from "../page";
import { formatDateTime } from "@/lib/format";
import type { LessonDoc } from "@/content/schema";

export const metadata = { title: "Édition de leçon" };

export default async function EditLessonPage(props: PageProps<"/studio/contenus/[lessonId]">) {
  const { lessonId } = await props.params;
  if (!z.uuid().safeParse(lessonId).success) notFound();
  const { actor } = await requireStudio(`/studio/contenus/${lessonId}`);
  let data;
  try {
    data = await getLessonForEditing(actor, lessonId);
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
  const working = data.versions.find((v) => ["draft", "technical_review", "pedagogical_review"].includes(v.status));
  const current = working ?? data.versions.find((v) => v.status === "published") ?? data.versions[0];
  return (
    <div className="space-y-6">
      <Link href="/studio/contenus" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Contenus
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{data.lesson.title}</h1>
        {current ? <Badge tone={VERSION_LABEL[current.status].t}>v{current.version}, {VERSION_LABEL[current.status].l}</Badge> : null}
      </div>
      <div className="grid gap-6 2xl:grid-cols-[1fr_320px]">
        <div>
          {current ? (
            <LessonEditor key={current.id} versionId={current.id} initial={current.content as LessonDoc} editable={current.status === "draft" && data.permissions.edit} />
          ) : null}
        </div>
        <aside className="space-y-4">
          <Panel className="p-4">
            <h2 className="mb-3 text-sm font-medium">Circuit de validation</h2>
            <WorkflowPanel
              lessonId={lessonId}
              version={working ? { id: working.id, status: working.status, version: working.version } : null}
              canEdit={data.permissions.edit}
              canTechnical={working ? can.technicalReview(actor, data.courseId, working.authorId) : false}
              canPedagogical={working ? can.pedagogicalReview(actor, working.authorId) : false}
            />
            {current ? (
              <Link href={`/studio/apercu/${current.id}`} className="mt-3 inline-block text-sm underline underline-offset-4">
                Aperçu de la version
              </Link>
            ) : null}
          </Panel>
          <Panel className="p-4">
            <h2 className="mb-2 text-sm font-medium">Versions</h2>
            <ul className="space-y-1.5 text-sm">
              {data.versions.map((v) => (
                <li key={v.id} className="flex justify-between gap-2">
                  <span>
                    v{v.version} <span className="text-muted">{v.authorName ?? "import"}</span>
                  </span>
                  <span className="text-xs text-muted">{VERSION_LABEL[v.status].l}</span>
                </li>
              ))}
            </ul>
          </Panel>
          {data.reviews.length ? (
            <Panel className="p-4">
              <h2 className="mb-2 text-sm font-medium">Historique des relectures</h2>
              <ul className="space-y-2.5 text-sm">
                {data.reviews.map((r) => (
                  <li key={r.id}>
                    <p className="text-ink-2">
                      {r.reviewerName ?? "—"} : {r.decision === "changes_requested" ? "corrections demandées" : r.decision === "published" ? "publiée" : r.decision === "submitted" ? "soumise" : "validée"}
                    </p>
                    {r.comment ? <p className="text-muted">{r.comment}</p> : null}
                    <p className="text-xs text-muted">{formatDateTime(r.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
