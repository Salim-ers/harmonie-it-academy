"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMemberAction, createOrganizationAction, removeMemberAction } from "@/server/actions/studio";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/field";

export function CreateOrgForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_200px_120px_auto] sm:items-end"
      action={async (f) => {
        const r = await createOrganizationAction({ name: String(f.get("name")), slug: String(f.get("slug")), seats: Number(f.get("seats")) });
        if (!r.ok) return setError(r.error);
        router.push(`/studio/organisations/${r.data.id}`);
      }}
    >
      {error ? (
        <div className="sm:col-span-4">
          <FormMessage>{error}</FormMessage>
        </div>
      ) : null}
      <Field label="Nom" htmlFor="o-name">
        <Input id="o-name" name="name" required />
      </Field>
      <Field label="Identifiant" htmlFor="o-slug">
        <Input id="o-slug" name="slug" required pattern="[a-z0-9-]{2,60}" />
      </Field>
      <Field label="Places" htmlFor="o-seats">
        <Input id="o-seats" name="seats" type="number" min={1} defaultValue={10} required />
      </Field>
      <Button type="submit">Créer</Button>
    </form>
  );
}

export function AddMemberForm({ organizationId, canNameAdmin }: { organizationId: string; canNameAdmin: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  return (
    <form
      className="space-y-3"
      action={async (f) => {
        const r = await addMemberAction(organizationId, String(f.get("email")), (f.get("role") as "member" | "org_admin") ?? "member");
        setMsg(r.ok ? { ok: true, t: "Membre ajouté, accès Academy Pro ouvert." } : { ok: false, t: r.error });
      }}
    >
      {msg ? <FormMessage tone={msg.ok ? "ok" : "danger"}>{msg.t}</FormMessage> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <Field label="E-mail du salarié (compte existant)" htmlFor="m-email">
          <Input id="m-email" name="email" type="email" required />
        </Field>
        <Field label="Rôle" htmlFor="m-role">
          <Select id="m-role" name="role" defaultValue="member">
            <option value="member">Salarié</option>
            {canNameAdmin ? <option value="org_admin">Administrateur entreprise</option> : null}
          </Select>
        </Field>
        <Button type="submit">Ajouter</Button>
      </div>
    </form>
  );
}

export function RemoveMemberButton({ organizationId, userId }: { organizationId: string; userId: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (confirm("Retirer ce salarié de l'organisation ? Son accès offert par l'entreprise prendra fin.")) await removeMemberAction(organizationId, userId);
      }}
    >
      Retirer
    </Button>
  );
}
