import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { SignInForm } from "@/components/auth/sign-in-form";
import { features } from "@/lib/env";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

async function Form({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  await connection();
  const { suite } = await searchParams;
  return <SignInForm next={suite ?? null} oauth={{ google: features.google(), microsoft: features.microsoft() }} />;
}

export default function Page(props: PageProps<"/connexion">) {
  return (
    <Suspense>
      <Form searchParams={props.searchParams as Promise<{ suite?: string }>} />
    </Suspense>
  );
}
