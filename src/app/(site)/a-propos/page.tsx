import { PageIntro, Prose } from "@/components/marketing/page-intro";

export const metadata = { title: "À propos" };

export default function AboutPage() {
  return (
    <>
      <PageIntro title="À propos">Harmonie IT Academy est une plateforme de formation aux métiers de l&apos;informatique, conçue et exploitée par Harmonie Solutions.</PageIntro>
      <Prose>
        <h2>Pourquoi cette plateforme</h2>
        <p>
          Beaucoup de formations apprennent à réciter des définitions. Un technicien, lui, est jugé sur sa façon de raisonner face à un incident, de parler à un utilisateur pressé et
          de documenter ce qu&apos;il a fait. Harmonie IT Academy est construite autour de cette réalité : chaque notion est reliée à une situation de terrain, pratiquée dans un
          laboratoire et vérifiée par une évaluation explicite.
        </p>
        <h2>Nos engagements</h2>
        <ul>
          <li>Des contenus originaux, vérifiés et datés, appuyés sur les documentations officielles des éditeurs et des organismes de normalisation.</li>
          <li>Aucune statistique inventée : nous publierons des chiffres de réussite lorsque nous les aurons mesurés.</li>
          <li>Aucune reconnaissance officielle affichée sans l&apos;avoir obtenue. Nos attestations sont internes.</li>
          <li>Vos résultats restent privés, sauf si vous décidez de les partager.</li>
        </ul>
        <h2>Marques citées</h2>
        <p>Les noms de produits et de marques (Microsoft, Cisco, GLPI, Zebra…) sont cités à titre informatif. Ils appartiennent à leurs propriétaires et aucun partenariat n&apos;est sous-entendu.</p>
      </Prose>
    </>
  );
}
