"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { CampusNav } from "./sidebar";

export function MobileCampusNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="campus-nav-mobile"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-ink-2 hover:bg-mist"
        aria-label={open ? "Fermer la navigation" : "Ouvrir la navigation"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open ? (
        <div id="campus-nav-mobile" className="absolute inset-x-0 top-full z-30 border-b border-line bg-paper p-3 shadow-[var(--shadow-lift)]">
          <CampusNav onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
