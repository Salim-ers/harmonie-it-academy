import Link from "next/link";
import { requireStudio } from "@/server/auth/session";
import { listUsers } from "@/server/services/studio";
import { Badge, PageHeader } from "@/components/ui/misc";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Utilisateurs" };
const ROLE: Record<string, string> = { student: "Étudiant", trainer: "Formateur", mentor: "Mentor", pedago_lead: "Resp. pédagogique", super_admin: "Super-admin" };

export default async function UsersPage(props: PageProps<"/studio/apprenants">) {
  const { actor } = await requireStudio("/studio/apprenants");
  const q = String(((await props.searchParams) as { q?: string }).q ?? "");
  const users = await listUsers(actor, q);
  return (
    <div className="space-y-6">
      <PageHeader title="Utilisateurs" description={actor.role === "trainer" || actor.role === "mentor" ? "Apprenants inscrits aux formations qui vous sont affectées." : "Tous les comptes. Chaque consultation de résultats individuels est journalisée."} />
      <form className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="Nom ou e-mail" aria-label="Rechercher" />
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
      </form>
      <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="px-4 py-2.5 font-normal">Nom</th>
              <th className="px-4 py-2.5 font-normal">E-mail</th>
              <th className="px-4 py-2.5 font-normal">Rôle</th>
              <th className="px-4 py-2.5 font-normal">Inscription</th>
              <th className="px-4 py-2.5 font-normal">État</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5">
                  <Link href={`/studio/apprenants/${u.id}`} className="text-ink hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-ink-2">{u.email}</td>
                <td className="px-4 py-2.5">{ROLE[u.role]}</td>
                <td className="px-4 py-2.5 text-muted">{formatDate(u.createdAt, { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-2.5">
                  <span className="flex gap-1.5">
                    {u.status === "suspended" ? <Badge tone="danger">Suspendu</Badge> : null}
                    {!u.emailVerified ? <Badge tone="warn">Non vérifié</Badge> : null}
                    {u.twoFactorEnabled ? <Badge tone="ok">MFA</Badge> : null}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
