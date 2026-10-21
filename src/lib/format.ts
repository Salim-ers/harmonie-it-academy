export function formatPrice(cents: number | null, interval: "month" | "year" | "custom") {
  if (interval === "custom" || cents === null) return "Sur devis";
  if (cents === 0) return "Gratuit";
  const v = (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v} €${interval === "month" ? " / mois" : " / an"}`;
}

export function formatDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", ...opts });
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export const LEVEL_LABELS: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" };
export const SECTOR_LABELS: Record<string, string> = {
  bureau: "Bureautique",
  logistique: "Logistique",
  industrie: "Industrie",
  "retail-luxe": "Retail et luxe",
  sante: "Santé",
  hotellerie: "Hôtellerie",
  banque: "Banque",
  education: "Éducation",
};
