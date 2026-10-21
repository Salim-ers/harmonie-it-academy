import { PageIntro, Prose } from "@/components/marketing/page-intro";

export const metadata = { title: "Cookies" };

export default function Page() {
  return (
    <>
      <PageIntro title="Cookies" />
      <Prose>
        <p>Harmonie IT Academy n&apos;utilise que des cookies strictement nécessaires au fonctionnement du service, exemptés de consentement :</p>
        <ul>
          <li>cookie de session (connexion à votre compte), sécurisé et inaccessible au JavaScript ;</li>
          <li>cookie de confiance de l&apos;appareil si vous l&apos;activez lors de la double authentification ;</li>
          <li>préférence de thème clair ou sombre, stockée localement dans votre navigateur.</li>
        </ul>
        <p>Aucun cookie publicitaire, aucun traceur tiers. Si un outil de mesure d&apos;audience était ajouté, un bandeau de consentement le précéderait.</p>
      </Prose>
    </>
  );
}
