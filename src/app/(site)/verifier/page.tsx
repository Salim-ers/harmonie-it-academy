import { redirect } from "next/navigation";
import { PageIntro } from "@/components/marketing/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export const metadata = { title: "Vérifier une attestation" };

async function go(form: FormData) {
  "use server";
  const code = String(form.get("code") ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20);
  redirect(`/verifier/${code || "invalide"}`);
}

export default function VerifyPage() {
  return (
    <>
      <PageIntro title="Vérifier une attestation">Saisissez le code figurant sur l&apos;attestation pour confirmer qu&apos;elle a bien été délivrée par Harmonie IT Academy.</PageIntro>
      <section className="mx-auto max-w-xl px-4 py-14 sm:px-6">
        <form action={go} className="flex gap-2">
          <label htmlFor="code" className="sr-only">
            Code de vérification
          </label>
          <Input id="code" name="code" placeholder="ABCDE-FGHJK" required className="font-mono uppercase" />
          <Button type="submit">Vérifier</Button>
        </form>
      </section>
    </>
  );
}
