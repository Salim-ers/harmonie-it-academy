import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 transition focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/25 disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-11 pr-8", className)} {...props} />;
}

export function Field({ label, hint, error, htmlFor, children }: { label: string; hint?: ReactNode; error?: string | null; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormMessage({ tone = "danger", children }: { tone?: "danger" | "ok" | "info"; children: ReactNode }) {
  const cls = { danger: "border-danger/30 bg-danger-wash text-danger", ok: "border-ok/30 bg-ok-wash text-ok", info: "border-signal/25 bg-signal-wash text-signal-ink" }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-[var(--radius-control)] border px-3 py-2.5 text-sm", cls)}>
      {children}
    </div>
  );
}
