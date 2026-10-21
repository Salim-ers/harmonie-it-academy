import Link from "next/link";
import { requireStudio } from "@/server/auth/session";
import { listOrganizations } from "@/server/services/studio";
import { can } from "@/server/authz/policies";
import { CreateOrgForm } from "@/components/studio/org-forms";
import { EmptyState, PageHeader, Panel } from "@/components/ui/misc";

export const metadata = { title: "Organisations" };

export default async function OrgsPage() {
  const { actor } = await requireStudio("/studio/organisations");
  if (!can.manageUsers(actor)) return <EmptyState title="Accès réservé aux super-administrateurs" />;
  const orgs = await listOrganizations(actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Organisations" description="Entreprises clientes Harmonie Business. Chaque administrateur d'entreprise ne voit que ses salariés." />
      <Panel className="p-5">
        <CreateOrgForm />
      </Panel>
      <ul className="divide-y divide-line rounded-[var(--radius-panel)] border border-line bg-surface text-sm">
        {orgs.map((o) => (
          <li key={o.id}>
            <Link href={`/studio/organisations/${o.id}`} className="flex justify-between px-5 py-3 hover:bg-mist/40">
              <span>{o.name}</span>
              <span className="tabular-nums text-muted">
                {o.members}/{o.seats} places
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
