"use client";

import { useState } from "react";
import { checkoutAction, portalAction } from "@/server/actions/billing";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

export function CheckoutButton({ planCode, label, variant = "primary" }: { planCode: string; label: string; variant?: "primary" | "secondary" }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        variant={variant}
        className="w-full"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const r = await checkoutAction(planCode);
          if (!r.ok) {
            setPending(false);
            return setError(r.error);
          }
          window.location.assign(r.data.url);
        }}
      >
        {pending ? "Redirection vers le paiement…" : label}
      </Button>
      {error ? <FormMessage>{error}</FormMessage> : null}
    </div>
  );
}

export function PortalButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const r = await portalAction();
          if (!r.ok) {
            setPending(false);
            return setError(r.error);
          }
          window.location.assign(r.data.url);
        }}
      >
        Gérer l&apos;abonnement et les factures
      </Button>
      {error ? <FormMessage>{error}</FormMessage> : null}
    </div>
  );
}
