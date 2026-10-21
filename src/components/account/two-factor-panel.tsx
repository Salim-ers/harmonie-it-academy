"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { ShieldCheck } from "lucide-react";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { auditSecurityEventAction } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";

export function TwoFactorPanel({ enabled, required }: { enabled: boolean; required: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "password" | "scan" | "codes" | "disable">("idle");
  const [uri, setUri] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!uri) return;
    QRCode.toString(uri, { type: "svg", margin: 1, width: 180 }).then(setSvg);
  }, [uri]);

  if (enabled && step !== "codes") {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 font-medium text-ok">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Double authentification activée
        </p>
        {step === "disable" ? (
          <form
            className="space-y-3"
            action={async (f) => {
              setPending(true);
              const r = await authClient.twoFactor.disable({ password: String(f.get("password") ?? "") });
              setPending(false);
              if (r.error) return setError(authErrorMessage(r.error));
              await auditSecurityEventAction("auth.2fa_disabled");
              router.refresh();
            }}
          >
            {error ? <FormMessage>{error}</FormMessage> : null}
            <Field label="Confirmez avec votre mot de passe" htmlFor="pw-dis">
              <PasswordInput id="pw-dis" name="password" required autoComplete="current-password" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="danger" disabled={pending}>
                Désactiver
              </Button>
              <Button variant="ghost" onClick={() => setStep("idle")}>
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setStep("disable")} disabled={required}>
            {required ? "Obligatoire pour votre rôle" : "Désactiver"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {required ? <FormMessage tone="info">Votre rôle donne accès à des données d&apos;apprenants : la double authentification est obligatoire avant d&apos;ouvrir Harmonie Studio.</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}
      {step === "idle" ? (
        <div className="space-y-2">
          <p className="text-[15px] text-ink-2">Protégez votre compte avec une application d&apos;authentification (Microsoft Authenticator, Google Authenticator, Aegis, 1Password…).</p>
          <Button onClick={() => setStep("password")}>Activer la double authentification</Button>
        </div>
      ) : null}
      {step === "password" ? (
        <form
          className="space-y-3"
          action={async (f) => {
            setPending(true);
            setError(null);
            const r = await authClient.twoFactor.enable({ password: String(f.get("password") ?? ""), issuer: "Harmonie IT Academy" });
            setPending(false);
            if (r.error || !r.data || !("totpURI" in r.data)) return setError(authErrorMessage(r.error));
            setUri(r.data.totpURI);
            setCodes(r.data.backupCodes);
            setStep("scan");
          }}
        >
          <Field label="Mot de passe actuel" htmlFor="pw-2fa">
            <PasswordInput id="pw-2fa" name="password" required autoComplete="current-password" />
          </Field>
          <Button type="submit" disabled={pending}>
            Continuer
          </Button>
        </form>
      ) : null}
      {step === "scan" && uri ? (
        <form
          className="space-y-4"
          action={async (f) => {
            setPending(true);
            setError(null);
            const r = await authClient.twoFactor.verifyTotp({ code: String(f.get("code") ?? "").replace(/\s/g, "") });
            setPending(false);
            if (r.error) return setError(authErrorMessage(r.error));
            await auditSecurityEventAction("auth.2fa_enabled");
            setStep("codes");
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {svg ? <div className="w-[180px] shrink-0 rounded-md bg-white p-1" aria-label="QR code à scanner" role="img" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
            <div className="space-y-2 text-sm text-ink-2">
              <p>Scannez ce code avec votre application, puis saisissez le code à six chiffres affiché.</p>
              <details>
                <summary className="cursor-pointer text-muted">Impossible de scanner ?</summary>
                <p className="mt-1 break-all font-mono text-xs">{new URL(uri).searchParams.get("secret")}</p>
              </details>
            </div>
          </div>
          <Field label="Code de vérification" htmlFor="totp">
            <Input id="totp" name="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={8} className="max-w-[160px]" />
          </Field>
          <Button type="submit" disabled={pending}>
            Vérifier et activer
          </Button>
        </form>
      ) : null}
      {step === "codes" ? (
        <div className="space-y-3">
          <p className="font-medium text-ok">Double authentification activée.</p>
          <p className="text-sm text-ink-2">Conservez ces codes de secours en lieu sûr : chacun permet une connexion si vous perdez votre téléphone. Ils ne seront plus affichés.</p>
          <ul className="grid grid-cols-2 gap-1.5 rounded-[var(--radius-control)] bg-mist p-3 font-mono text-sm sm:grid-cols-5">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Button
            variant="secondary"
            onClick={() => {
              setStep("idle");
              router.refresh();
            }}
          >
            J&apos;ai noté mes codes
          </Button>
        </div>
      ) : null}
    </div>
  );
}
