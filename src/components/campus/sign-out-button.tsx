"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/");
        router.refresh();
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-ink-2 hover:bg-mist hover:text-ink"
      aria-label="Se déconnecter"
      title="Se déconnecter"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
