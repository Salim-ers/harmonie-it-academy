"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bell } from "lucide-react";
import { markNotificationsReadAction } from "@/server/actions/account";

export function NotificationsPanel({ items }: { items: { id: string; title: string; href: string | null; createdAt: string }[] }) {
  const [pending, start] = useTransition();
  if (!items.length) return null;
  return (
    <section aria-labelledby="nouveautes" className="rounded-[var(--radius-panel)] border border-signal/25 bg-signal-wash/50 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="nouveautes" className="flex items-center gap-2 text-sm font-medium text-ink">
          <Bell className="h-4 w-4 text-signal" aria-hidden="true" /> Nouveautés pour vous
        </h2>
        <button type="button" onClick={() => start(async () => void (await markNotificationsReadAction()))} disabled={pending} className="text-sm text-muted hover:text-ink disabled:opacity-50">
          Marquer comme lu
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-[15px]">
        {items.map((n) => (
          <li key={n.id}>{n.href ? <Link href={n.href} className="text-signal-ink hover:underline">{n.title}</Link> : <span className="text-ink">{n.title}</span>}</li>
        ))}
      </ul>
    </section>
  );
}
