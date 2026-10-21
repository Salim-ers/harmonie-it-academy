import { PageIntro } from "@/components/marketing/page-intro";

export const metadata = { title: "Méthode pédagogique", description: "Comment Harmonie IT Academy conçoit, vérifie et évalue ses leçons et ses laboratoires." };

const STRUCTURE = [
  "Titre, niveau, prérequis, objectifs mesurables et durée",
  "Une situation de terrain pour ouvrir la leçon",
  "Une définition simple, puis une explication progressive",
  "Une analogie compréhensible sans aucune connaissance préalable",
  "Un schéma interactif, pas à pas",
  "Un exemple concret dans une entreprise fictive mais réaliste",
  "Une démonstration étape par étape",
  "Des commandes réelles, expliquées option par option, avec le résultat attendu lu ligne par ligne",
  "Les erreurs fréquentes et ce qu'il faut faire à la place",
  "Les risques et précautions",
  "Un quiz corrigé et justifié",
  "Un exercice pratique avec trois indices graduels et une correction commentée",
  "Les questions d'entretien associées, avec une réponse modèle",
  "Un résumé, un glossaire français/anglais et des références officielles datées",
];

export default function MethodPage() {
  return (
    <>
      <PageIntro title="La méthode Harmonie">Comprendre d&apos;abord, pratiquer ensuite, prouver enfin. Voici précisément comment nous construisons et évaluons ce que vous apprenez.</PageIntro>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">La structure de chaque leçon</h2>
          <ol className="mt-6 space-y-3">
            {STRUCTURE.map((s, i) => (
              <li key={s} className="flex gap-4 text-[15px]">
                <span className="w-6 shrink-0 text-right tabular-nums text-muted">{i + 1}</span>
                <span className="text-ink-2">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Relecture avant publication</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Chaque leçon suit le circuit brouillon, révision technique, validation pédagogique, publication. La personne qui relit n&apos;est jamais celle qui a écrit. Chaque
              version est conservée et datée ; vos tentatives passées restent liées à la version des questions que vous avez réellement vues.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Comment un laboratoire est noté</h2>
            <ul className="mt-3 space-y-1.5 text-[15px] text-ink-2">
              <li>Diagnostic : 30 points, dégressifs selon le nombre de tentatives, et refusé s&apos;il n&apos;est pas étayé par vos tests</li>
              <li>Résolution : 20 points</li>
              <li>Méthode, c&apos;est-à-dire les vérifications décisives réalisées : 15 points</li>
              <li>Test de validation après correction : 10 points</li>
              <li>Sécurité, sans action dangereuse : 10 points</li>
              <li>Respect du SLA : 5 points</li>
              <li>Note de clôture : 10 points</li>
              <li>Chaque indice consulté retire 3 points</li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Des compétences mesurées</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Votre carte de compétences agrège des preuves pondérées : un quiz compte moins qu&apos;un laboratoire, qui compte moins qu&apos;un examen. Tant qu&apos;il y a trop peu de
              preuves, le niveau est affiché « à confirmer ». Une nouvelle tentative remplace l&apos;ancienne : le niveau reflète ce que vous savez aujourd&apos;hui.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Une gamification qui respecte votre temps</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Des points et des badges récompensent un travail réel, une seule fois par objet. Pas de série à préserver, pas de compte à rebours, pas de classement public sans votre
              accord.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
