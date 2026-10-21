import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireStudio } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { lessonVersions } from "@/server/db/schema";
import { getLessonForEditing } from "@/server/services/studio";
import { StaticBlock } from "@/components/lesson/blocks";
import { Badge } from "@/components/ui/misc";
import type { LessonDoc } from "@/content/schema";
import { ForbiddenError } from "@/server/authz/policies";

export const metadata = { title: "Aperçu" };

export default async function PreviewPage(props: PageProps<"/studio/apercu/[versionId]">) {
  const { versionId } = await props.params;
  if (!z.uuid().safeParse(versionId).success) notFound();
  const { actor } = await requireStudio();
  const [v] = await getDb().select().from(lessonVersions).where(eq(lessonVersions.id, versionId));
  if (!v) notFound();
  try {
    await getLessonForEditing(actor, v.lessonId);
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
  const doc = v.content as LessonDoc;
  return (
    <article className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge tone="warn">Aperçu de la version {v.version}</Badge>
        <span className="text-sm text-muted">Les quiz et exercices interactifs s&apos;affichent sous forme résumée.</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">{doc.meta.title}</h1>
      <p className="max-w-[70ch] text-lg text-ink-2">{doc.meta.summary}</p>
      {doc.blocks.map((b) =>
        b.kind === "quiz" ? (
          <p key={b.id} className="max-w-[78ch] rounded-[var(--radius-panel)] border border-dashed border-line-strong px-5 py-4 text-sm text-muted">
            Quiz : {b.questions.join(", ")}
          </p>
        ) : b.kind === "exercise" ? (
          <div key={b.id} className="max-w-[78ch] rounded-[var(--radius-panel)] border border-dashed border-line-strong px-5 py-4 text-sm">
            <p className="font-medium">Exercice : {b.title}</p>
            <p className="mt-1 text-muted">{b.task}</p>
            <ol className="mt-2 list-decimal pl-5 text-ink-2">
              {b.hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
          </div>
        ) : (
          <StaticBlock key={b.id} block={b} />
        ),
      )}
    </article>
  );
}
