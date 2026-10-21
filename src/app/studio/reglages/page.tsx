import { asc } from "drizzle-orm";
import { requireStudio } from "@/server/auth/session";
import { can } from "@/server/authz/policies";
import { getDb } from "@/server/db";
import { plans } from "@/server/db/schema";
import { getSettings } from "@/server/services/catalog";
import { BrandForm, PlanForm } from "@/components/studio/settings-forms";
import { EmptyState, PageHeader, Panel } from "@/components/ui/misc";

export const metadata = { title: "Réglages et offres" };

export default async function SettingsPage() {
  const { actor } = await requireStudio("/studio/reglages");
  if (!can.manageSettings(actor)) return <EmptyState title="Accès réservé aux super-administrateurs" />;
  const [settings, rows] = await Promise.all([getSettings(), getDb().select().from(plans).orderBy(asc(plans.position))]);
  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title="Réglages et offres" description="Identité de la plateforme et offres commerciales, modifiables sans toucher au code." />
      <Panel className="p-6" as="section">
        <h2 className="mb-4 font-medium">Identité</h2>
        <BrandForm initial={settings} />
      </Panel>
      {rows.map((p) => (
        <Panel key={p.code} className="p-6" as="section">
          <h2 className="mb-4 font-medium">Offre {p.name}</h2>
          <PlanForm plan={p} />
        </Panel>
      ))}
    </div>
  );
}
