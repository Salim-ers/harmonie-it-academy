import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStudio } from "@/server/auth/session";
import { getOrganizationDashboard } from "@/server/services/studio";
import { can, ForbiddenError } from "@/server/authz/policies";
import { AddMemberForm, RemoveMemberButton } from "@/components/studio/org-forms";
import { OrgMembersTable } from "@/components/studio/org-table";
import { PageHeader, Panel } from "@/components/ui/misc";

export default async function OrgPage(props: PageProps<"/studio/organisations/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { actor } = await requireStudio();
  let d;
  try {
    d = await getOrganizationDashboard(actor, id);
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }
  return (
    <div className="space-y-6">
      <PageHeader title={d.org.name} description={`${d.members.length}/${d.org.seats} places utilisées`} />
      <Panel className="p-5">
        <AddMemberForm organizationId={id} canNameAdmin={can.manageUsers(actor)} />
      </Panel>
      <OrgMembersTable members={d.members} action={(userId) => <RemoveMemberButton organizationId={id} userId={userId} />} />
    </div>
  );
}
