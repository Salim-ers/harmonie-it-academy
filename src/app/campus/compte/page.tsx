import { eq } from "drizzle-orm";
import { requireActor } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { userProfiles } from "@/server/db/schema";
import { can } from "@/server/authz/policies";
import { ProfileForm } from "@/components/account/profile-form";
import { TwoFactorPanel } from "@/components/account/two-factor-panel";
import { SessionsPanel } from "@/components/account/sessions-panel";
import { DangerZone } from "@/components/account/danger-zone";
import { PageHeader, Panel } from "@/components/ui/misc";

export const metadata = { title: "Compte et sécurité" };

export default async function AccountPage(props: PageProps<"/campus/compte">) {
  const { user, actor } = await requireActor("/campus/compte");
  const sp = (await props.searchParams) as { mfa?: string };
  const [profile] = await getDb().select().from(userProfiles).where(eq(userProfiles.userId, user.id));
  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Compte et sécurité" description={`Connecté avec ${user.email}`} />
      <Panel className="p-6" as="section">
        <h2 className="mb-4 font-medium">Profil</h2>
        <ProfileForm initial={{ name: user.name, weeklyGoalMinutes: profile?.weeklyGoalMinutes ?? 180, accessibilityNeeds: profile?.accessibilityNeeds ?? "", leaderboardOptIn: profile?.leaderboardOptIn ?? false }} />
      </Panel>
      <Panel className="p-6" as="section">
        <h2 id="securite" className="mb-4 scroll-mt-24 font-medium">
          Double authentification
        </h2>
        <TwoFactorPanel enabled={user.twoFactorEnabled} required={can.isStaffRole(actor) || sp.mfa === "obligatoire"} />
      </Panel>
      <Panel className="p-6" as="section">
        <h2 className="mb-4 font-medium">Sessions ouvertes</h2>
        <SessionsPanel />
      </Panel>
      <Panel className="p-6" as="section">
        <h2 className="mb-1 font-medium">Vos données</h2>
        <p className="mb-4 text-sm text-muted">Exportez l&apos;ensemble de vos données ou supprimez votre compte. Ces droits s&apos;exercent sans justification.</p>
        <DangerZone />
      </Panel>
    </div>
  );
}
