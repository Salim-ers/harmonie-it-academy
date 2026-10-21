export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-64 animate-pulse rounded-md bg-mist" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-[var(--radius-panel)] bg-mist" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[var(--radius-panel)] bg-mist" />
    </div>
  );
}
