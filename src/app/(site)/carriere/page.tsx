import { PageIntro } from "@/components/marketing/page-intro";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Harmonie Career", description: "Analyse d'offre d'emploi, relecture de CV, plan de préparation, simulations d'entretien corrigées, passeport de compétences vérifiable." };

const BLOCKS = [
  { title: "Analyse d'offre d'emploi", text: "Collez une annonce. Vous voyez les compétences demandées, celles que vous avez déjà prouvées sur la plateforme, celles que nous ne couvrons pas encore (nous le disons), et un plan jour par jour jusqu'à la date de votre entretien." },
  { title: "Relecture de CV", text: "Collez votre CV : clarté des rubriques, faits chiffrés, informations personnelles que vous n'avez pas à donner, compétences prouvées qui manquent, affirmations à préparer avant l'entretien, écart avec l'offre visée. Le texte n'est pas enregistré." },
  { title: "Simulations d'entretien", text: "Technique, RH ou mixte, 15 à 45 minutes, en français ou en anglais, avec des questions sectorielles (industrie, logistique, retail et luxe, santé). Chaque réponse est confrontée à une grille explicite, à une réponse modèle et à ce que le recruteur cherche réellement." },
  { title: "Portfolio d'interventions", text: "Les incidents que vous résolvez dans les laboratoires produisent un compte rendu : démarche, tests, cause, note de clôture. Vous choisissez ceux qui rejoignent votre portfolio." },
  { title: "Passeport de compétences", text: "Une page publique, désactivée par défaut, que vous pouvez joindre à un CV : niveaux issus de preuves, nombre de preuves, attestations vérifiables par code. Vous pouvez changer le lien ou la retirer à tout moment." },
];

export default function CareerPublic() {
  return (
    <>
      <PageIntro title="Arriver en entretien avec des preuves.">
        Harmonie Career transforme votre travail sur la plateforme en arguments concrets, et vous entraîne sur les questions qui comptent pour le poste visé.
      </PageIntro>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <ul className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {BLOCKS.map((b) => (
            <li key={b.title}>
              <p className="text-lg font-semibold tracking-tight">{b.title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{b.text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12 rounded-[var(--radius-panel)] border border-line bg-surface p-6">
          <p className="font-medium">Ce que nous ne promettons pas</p>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">
            Aucune grille automatique ne remplace un recruteur, et aucune plateforme ne peut garantir une embauche. Nous ne publions pas de taux d&apos;insertion tant que nous ne les avons
            pas mesurés sur de vrais apprenants.
          </p>
        </div>
        <ButtonLink href="/inscription?suite=/campus/carriere" className="mt-8">
          Analyser une première offre gratuitement
        </ButtonLink>
      </section>
    </>
  );
}
