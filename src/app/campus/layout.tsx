import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand/logo";
import { CampusNav } from "@/components/campus/sidebar";
import { MobileCampusNav } from "@/components/campus/mobile-campus-nav";
import { UserMenu } from "@/components/campus/user-menu";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { SearchBox } from "@/components/campus/search-box";

export const metadata = { title: { default: "Harmonie Campus", template: "%s — Harmonie Campus" }, robots: { index: false } };

export default function CampusLayout({ children }: LayoutProps<"/campus">) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="relative flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <MobileCampusNav />
            <Link href="/campus" aria-label="Tableau de bord">
              <Wordmark name="Harmonie Campus" />
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <SearchBox />
            <ThemeToggle />
            <Suspense fallback={<span className="h-9 w-24" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-line px-3 py-5 lg:block">
          <CampusNav />
        </aside>
        <main id="contenu" className="min-w-0 flex-1 px-4 py-7 sm:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
