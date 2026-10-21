import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { getAttemptView } from "@/server/services/assessments";
import { AttemptRunner } from "@/components/assessment/attempt-runner";
import { ForbiddenError } from "@/server/authz/policies";

export const metadata = { title: "Évaluation" };

export default async function AttemptPage(props: PageProps<"/campus/evaluations/tentatives/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const u = await requireUser(`/campus/evaluations/tentatives/${id}`);
  let view;
  try {
    view = await getAttemptView(u.id, id);
  } catch (e) {
    // Une tentative d'un autre utilisateur répond « introuvable » : on ne confirme même pas son existence.
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{view.assessment.title}</h1>
      <AttemptRunner initial={view} />
    </div>
  );
}
