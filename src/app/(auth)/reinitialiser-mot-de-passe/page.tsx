import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-forms";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

async function Form({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  return <ResetPasswordForm token={sp.token ?? null} invalid={Boolean(sp.error)} />;
}

export default function Page(props: PageProps<"/reinitialiser-mot-de-passe">) {
  return (
    <Suspense>
      <Form searchParams={props.searchParams as Promise<{ token?: string; error?: string }>} />
    </Suspense>
  );
}
