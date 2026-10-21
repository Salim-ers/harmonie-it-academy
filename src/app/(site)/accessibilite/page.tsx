import { PageIntro, Prose } from "@/components/marketing/page-intro";

export const metadata = { title: "Accessibilité" };

export default function Page() {
  return (
    <>
      <PageIntro title="Accessibilité" />
      <Prose>
        <p>Harmonie IT Academy vise la conformité au niveau AA des WCAG 2.2. Aucun audit externe n&apos;a encore été réalisé : la conformité n&apos;est donc pas déclarée.</p>
        <h2>Ce qui est en place</h2>
        <ul>
          <li>Navigation complète au clavier, lien d&apos;évitement, focus visible.</li>
          <li>Thèmes clair et sombre, contrastes conçus pour le niveau AA.</li>
          <li>Animations réduites lorsque votre système le demande.</li>
          <li>Schémas interactifs doublés d&apos;une description textuelle lue par les lecteurs d&apos;écran.</li>
          <li>Questions de quiz utilisables sans glisser-déposer.</li>
        </ul>
        <h2>Limites connues</h2>
        <ul>
          <li>Certains schémas imposent un défilement horizontal sur les petits écrans.</li>
          <li>Les sorties de console longues peuvent être difficiles à parcourir avec un lecteur d&apos;écran.</li>
        </ul>
        <h2>Signaler un problème</h2>
        <p>Ouvrez une demande « Besoin d&apos;adaptation ou d&apos;accessibilité » depuis l&apos;espace support, ou écrivez-nous via la page Contact.</p>
      </Prose>
    </>
  );
}
