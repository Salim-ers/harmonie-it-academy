"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { auditSecurityEventAction } from "@/server/actions/account";
import { Button } from "@/components/ui/button";

type S = { id: string; token: string; userAgent?: string | null; ipAddress?: string | null; createdAt: Date | string; expiresAt: Date | string };

function describe(ua?: string | null) {
  if (!ua) return "Appareil inconnu";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "Appareil";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  return `${br} sur ${os}`;
}

export function SessionsPanel() {
  const [sessions, setSessions] = useState<S[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const load = async () => {
    const [list, me] = await Promise.all([authClient.listSessions(), authClient.getSession()]);
    setSessions((list.data as S[] | null) ?? []);
    setCurrent(me.data?.session.token ?? null);
  };
  useEffect(() => {
    let alive = true;
    Promise.all([authClient.listSessions(), authClient.getSession()]).then(([list, me]) => {
      if (!alive) return;
      setSessions((list.data as S[] | null) ?? []);
      setCurrent(me.data?.session.token ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="text-ink">
                {describe(s.userAgent)}
                {s.token === current ? <span className="ml-2 text-xs text-ok">cet appareil</span> : null}
              </p>
              <p className="text-xs text-muted">
                Ouverte le {new Date(s.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                {s.ipAddress ? `, adresse ${s.ipAddress}` : ""}
              </p>
            </div>
            {s.token !== current ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await authClient.revokeSession({ token: s.token });
                  await load();
                }}
              >
                Déconnecter
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {sessions.length > 1 ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await authClient.revokeOtherSessions();
            await auditSecurityEventAction("auth.sessions_revoked");
            await load();
          }}
        >
          Déconnecter tous les autres appareils
        </Button>
      ) : null}
    </div>
  );
}
