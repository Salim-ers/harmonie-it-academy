import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getInterviewView } from "@/server/services/career";
import { ForbiddenError } from "@/server/authz/policies";
import { InterviewRunner } from "@/components/career/interview-runner";
import { Panel } from "@/components/ui/misc";
import { ROLE_LABELS, type InterviewRole } from "@/content/career-schema";
import type { RubricResult } from "@/server/engines/rubric";

export const metadata = { title: "Simulation d'entretien" };

export default async function InterviewPage(props: PageProps<"/campus/carriere/entretiens/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const u = await requireUser(`/campus/carriere/entretiens/${id}`);
  let v;
  try {
    v = await getInterviewView(u.id, id);
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
  return (
    <div className="space-y-6">
      <Link href="/campus/carriere" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Harmonie Career
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Entretien {ROLE_LABELS[v.session.role as InterviewRole] ?? v.session.role}</h1>
        <p className="mt-1 text-sm text-muted">
          {v.session.kind === "mixte" ? "Entretien mixte" : v.session.kind === "rh" ? "Entretien RH" : "Entretien technique"}, {v.session.durationMin} minutes,{" "}
          {v.session.lang === "en" ? "en anglais" : "en français"}
          {v.session.sector !== "general" ? `, secteur ${v.session.sector}` : ""}
        </p>
      </div>
      {v.session.status === "completed" ? (
        <Panel className="border-ok/30 bg-ok-wash p-5">
          <p className="font-medium">Simulation terminée : {v.session.score} % de moyenne</p>
          <p className="mt-1 text-sm text-ink-2">Les notions travaillées alimentent votre carte de compétences. Relisez les réponses modèles, puis recommencez dans quelques jours.</p>
        </Panel>
      ) : null}
      <InterviewRunner
        sessionId={v.session.id}
        status={v.session.status}
        lang={v.session.lang as "fr" | "en"}
        initial={v.questions.map((q) => ({ ...q, answer: q.answer ? { ...q.answer, feedback: q.answer.feedback as RubricResult } : null }))}
      />
    </div>
  );
}
