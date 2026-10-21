import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main id="contenu" className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Wordmark />
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="font-display text-4xl">Cette page n&apos;existe pas ou ne vous est pas accessible.</h1>
      <div className="flex gap-4 text-sm">
        <Link href="/" className="underline underline-offset-4">
          Accueil
        </Link>
        <Link href="/campus" className="underline underline-offset-4">
          Mon espace
        </Link>
      </div>
    </main>
  );
}
