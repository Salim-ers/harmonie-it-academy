import { PageIntro } from "@/components/marketing/page-intro";
import { FaqList, HOME_FAQ, type Faq } from "@/components/marketing/faq";

export const metadata = { title: "Questions fréquentes" };

const MORE: Faq[] = [
  { q: "Combien de temps faut-il pour terminer le parcours N1 ?", a: "Il compte environ une vingtaine d'heures de leçons, auxquelles s'ajoutent les quiz, les exercices et les laboratoires. À raison de trois heures par semaine, comptez deux à trois mois ; vous avancez à votre rythme." },
  { q: "Faut-il installer des logiciels ?", a: "Non. Tout se fait dans le navigateur. Les commandes présentées peuvent être essayées sur votre propre poste Windows si vous le souhaitez." },
  { q: "Les corrections automatiques sont-elles fiables ?", a: "Les questions fermées sont corrigées exactement. Les réponses rédigées sont évaluées par une grille qui repère les notions attendues et les formulations à risque ; elle ne juge pas votre style. Vous pouvez contester une correction depuis l'espace support." },
  { q: "Proposez-vous un assistant IA ?", a: "Un tuteur facultatif, appuyé sur les leçons publiées, est prévu. Il sera désactivé pendant les examens et ne donnera jamais directement les réponses d'une évaluation." },
  { q: "Que se passe-t-il si je rencontre une difficulté liée à un handicap ?", a: "Indiquez vos besoins dans votre compte ou ouvrez une demande « Besoin d'adaptation » : temps majoré, format adapté, accompagnement. Ces informations restent confidentielles." },
];

export default function FaqPage() {
  return (
    <>
      <PageIntro title="Questions fréquentes" />
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <FaqList items={[...HOME_FAQ, ...MORE]} />
      </section>
    </>
  );
}
