"use client";

import { useState } from "react";
import { grantAccessAction, setUserRoleAction, setUserStatusAction } from "@/server/actions/studio";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, Select } from "@/components/ui/field";

const ROLES = { student: "Étudiant", trainer: "Formateur", mentor: "Mentor / correcteur", pedago_lead: "Responsable pédagogique", super_admin: "Super-administrateur" };

export function UserControls({ userId, role, status, self }: { userId: string; role: string; status: string; self: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [r, setR] = useState(role);
  const [tier, setTier] = useState("2");
  const [until, setUntil] = useState("");
  const done = (res: { ok: boolean; error?: string }, ok: string) => setMsg(res.ok ? { ok: true, t: ok } : { ok: false, t: res.error ?? "Erreur" });
  return (
    <div className="space-y-4">
      {msg ? <FormMessage tone={msg.ok ? "ok" : "danger"}>{msg.t}</FormMessage> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={r} onChange={(e) => setR(e.target.value)} disabled={self} className="w-60" aria-label="Rôle">
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Button variant="secondary" disabled={self || r === role} onClick={async () => done(await setUserRoleAction(userId, r), "Rôle modifié ; la personne devra se reconnecter.")}>
          Changer le rôle
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={tier} onChange={(e) => setTier(e.target.value)} className="w-48" aria-label="Accès offert">
          <option value="0">Retirer l&apos;accès offert</option>
          <option value="1">Academy</option>
          <option value="2">Academy Pro</option>
        </Select>
        <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="w-44" aria-label="Jusqu'au" />
        <Button variant="secondary" onClick={async () => done(await grantAccessAction(userId, Number(tier), until || null), "Accès mis à jour.")}>
          Accorder un accès
        </Button>
      </div>
      {!self ? (
        <Button
          variant={status === "active" ? "danger" : "secondary"}
          onClick={async () => {
            if (status === "active" && !confirm("Suspendre ce compte ? Ses sessions seront fermées immédiatement.")) return;
            done(await setUserStatusAction(userId, status === "active" ? "suspended" : "active"), status === "active" ? "Compte suspendu." : "Compte réactivé.");
          }}
        >
          {status === "active" ? "Suspendre le compte" : "Réactiver le compte"}
        </Button>
      ) : null}
    </div>
  );
}
