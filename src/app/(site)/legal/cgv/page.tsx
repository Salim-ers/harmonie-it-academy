import { LegalNotice, PageIntro, Prose } from "@/components/marketing/page-intro";

export const metadata = { title: "Conditions d'utilisation et de vente" };

export default function Page() {
  return (
    <>
      <PageIntro title="Conditions d'utilisation et de vente" />
      <Prose>
        <LegalNotice />
        <h2>Objet</h2>
        <p>Accès à la plateforme de formation en ligne Harmonie IT Academy, selon l&apos;offre choisie : Découverte (gratuite), Academy, Academy Pro, Business.</p>
        <h2>Compte</h2>
        <p>Le compte est personnel. Vous êtes responsable de la confidentialité de vos identifiants. Le partage de compte est interdit.</p>
        <h2>Abonnements</h2>
        <p>Abonnements mensuels sans engagement, renouvelés automatiquement, payables par carte via Stripe. Résiliation à tout moment depuis l&apos;espace Abonnement : l&apos;accès reste ouvert jusqu&apos;à la fin de la période réglée. Les prix affichés sont TTC.</p>
        <h2>Droit de rétractation</h2>
        <p>Pour un consommateur, le délai légal de quatorze jours s&apos;applique. En accédant immédiatement aux contenus numériques, vous pouvez y renoncer expressément ; ce point est à préciser dans le parcours de paiement avant ouverture commerciale.</p>
        <h2>Attestations</h2>
        <p>Les attestations délivrées sont des attestations internes Harmonie IT Academy. Elles ne constituent ni un diplôme d&apos;État, ni un titre inscrit au RNCP, ni une certification d&apos;éditeur.</p>
        <h2>Usage des laboratoires</h2>
        <p>Les laboratoires sont des simulations. Les techniques présentées, notamment en cybersécurité, ne doivent jamais être appliquées à des systèmes sans autorisation écrite de leur propriétaire.</p>
        <h2>Réclamations et médiation</h2>
        <p>Toute réclamation peut être adressée via l&apos;espace support (catégorie « Réclamation »). Coordonnées du médiateur de la consommation : [à compléter].</p>
      </Prose>
    </>
  );
}
