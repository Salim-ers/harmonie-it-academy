import Link from "next/link";
import { getActor, getCurrentUser } from "@/server/auth/session";
import { can } from "@/server/authz/policies";
import { SignOutButton } from "./sign-out-button";

/** Partie dépendante de la session : rendue en streaming derrière un Suspense. */
export async function UserMenu() {
  const u = await getCurrentUser();
  if (!u) return null;
  const actor = await getActor(u.id);
  const staff = can.isStaffRole(actor);
  const orgAdmin = actor?.organizations.some((o) => o.role === "org_admin");
  return (
    <div className="flex items-center gap-2">
      {staff ? (
        <Link href="/studio" className="hidden rounded-[var(--radius-control)] border border-line px-2.5 py-1.5 text-sm text-ink-2 hover:border-line-strong sm:inline-block">
          Harmonie Studio
        </Link>
      ) : null}
      {orgAdmin ? (
        <Link href="/entreprise" className="hidden rounded-[var(--radius-control)] border border-line px-2.5 py-1.5 text-sm text-ink-2 hover:border-line-strong sm:inline-block">
          Espace entreprise
        </Link>
      ) : null}
      <span className="hidden max-w-[160px] truncate text-sm text-ink-2 md:inline" title={u.email}>
        {u.name}
      </span>
      <SignOutButton />
    </div>
  );
}
