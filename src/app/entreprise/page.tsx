import { Suspense } from "react";
import Link from "next/link";
import { requireActor } from "@/server/auth/session";
import { getOrganizationDashboard } from "@/server/services/studio";
import { OrgMembersTable } from "@/components/studio/org-table";
import { Wordmark } from "@/components/brand/logo";
import { EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Espace entreprise", robots: { index: false } };

async function Dashboard() {
  const { actor } = await requireActor("/entreprise");
  const org = actor.organizations.find((o) => o.role === "org_admin");
  if (!org) return <EmptyState title="Vous n'administrez aucune organisation." />;
  const d = await getOrganizationDashboard(actor, org.organizationId);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{d.org.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {d.members.length}/{d.org.seats} places utilisées. Pour ajouter des salariés, contactez Harmonie IT Academy.
        </p>
      </div>
      <OrgMembersTable members={d.members} />
    </div>
  );
}

export default function OrgAdminPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line px-4 py-4 sm:px-6">
        <Link href="/campus">
          <Wordmark name="Harmonie Business" />
        </Link>
      </header>
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-[var(--radius-panel)] bg-mist" />}>
          <Dashboard />
        </Suspense>
      </main>
    </div>
  );
}
