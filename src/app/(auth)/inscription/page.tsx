import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Créer un compte" };

async function Form({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return <SignUpForm next={suite ?? null} />;
}

export default function Page(props: PageProps<"/inscription">) {
  return (
    <Suspense>
      <Form searchParams={props.searchParams as Promise<{ suite?: string }>} />
    </Suspense>
  );
}
