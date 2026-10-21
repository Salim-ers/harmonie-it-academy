import { ChevronDown } from "lucide-react";

export type Faq = { q: string; a: string };

export const HOME_FAQ: Faq[] = [
  { q: "Je n'ai aucune connaissance en informatique. Est-ce pour moi ?", a: "Oui. Le parcours Support N1 part de zéro : chaque leçon indique ses prérequis, commence par une définition simple et une analogie, et un positionnement initial vous indique par où commencer." },
  { q: "Les attestations sont-elles des diplômes ?", a: "Non. Ce sont des attestations internes délivrées par Harmonie IT Academy, vérifiables en ligne par un recruteur. Elles ne sont ni des diplômes d'État, ni des titres RNCP, ni des certifications d'éditeurs." },
  { q: "Les formations sont-elles finançables par le CPF ?", a: "Pas à ce jour. Harmonie IT Academy n'est pas encore certifiée Qualiopi et ses parcours ne sont pas référencés au CPF. Nous l'indiquerons clairement le jour où ce sera le cas." },
  { q: "Les laboratoires utilisent-ils de vraies machines ?", a: "Les laboratoires actuels sont des simulateurs déterministes : chaque test renvoie un résultat cohérent avec la vraie cause de l'incident, sans risque. Des laboratoires sur machines virtuelles isolées sont prévus dans une étape ultérieure." },
  { q: "Que deviennent mes résultats ?", a: "Ils restent privés. Personne ne les voit, sauf vous, les formateurs des formations que vous suivez et, si vous êtes inscrit par votre employeur, l'administrateur de votre entreprise lorsque le partage est activé. Vous pouvez exporter ou supprimer vos données à tout moment." },
  { q: "Puis-je résilier à tout moment ?", a: "Oui, depuis votre espace Facturation. L'accès payant reste ouvert jusqu'à la fin de la période déjà réglée, et votre progression est conservée." },
];

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f) => (
        <details key={f.q} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="max-w-2xl pb-5 text-[15px] leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
