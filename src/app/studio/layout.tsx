import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/logo";
import { StudioNav } from "@/components/studio/studio-nav";
import { UserMenu } from "@/components/campus/user-menu";
import { ThemeToggle } from "@/components/site/theme-toggle";

export const metadata = { title: { default: "Harmonie Studio", template: "%s — Harmonie Studio" }, robots: { index: false } };

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/studio" aria-label="Harmonie Studio">
              <Wordmark name="Harmonie Studio" />
            </Link>
            <Link href="/campus" className="hidden text-sm text-muted hover:text-ink sm:inline">
              Retour au campus
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Suspense fallback={<span className="h-9 w-24" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
        <aside className="border-b border-line px-3 py-3 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r lg:py-5">
          <StudioNav />
        </aside>
        <main id="contenu" className="min-w-0 flex-1 px-4 py-7 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
