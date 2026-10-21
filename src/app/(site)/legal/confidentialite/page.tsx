import { LegalNotice, PageIntro, Prose } from "@/components/marketing/page-intro";

export const metadata = { title: "Politique de confidentialité" };

export default function Page() {
  return (
    <>
      <PageIntro title="Politique de confidentialité">Ce que nous collectons, pourquoi, combien de temps, et comment exercer vos droits.</PageIntro>
      <Prose>
        <LegalNotice />
        <h2>Responsable de traitement</h2>
        <p>Harmonie Solutions, éditeur de Harmonie IT Academy. Contact pour les données personnelles : [adresse dédiée à compléter].</p>
        <h2>Données traitées et finalités</h2>
        <ul>
          <li>Compte : nom, adresse e-mail, mot de passe (stocké sous forme d&apos;empreinte), facteurs d&apos;authentification. Base légale : exécution du contrat.</li>
          <li>Apprentissage : progression, temps passé, réponses, résultats, laboratoires, entretiens simulés, analyses d&apos;offres d&apos;emploi que vous collez. Base légale : exécution du contrat.</li>
          <li>Besoins d&apos;adaptation que vous déclarez : uniquement pour adapter votre parcours, accessibles à l&apos;équipe pédagogique. Base légale : votre consentement explicite.</li>
          <li>Facturation : identifiants client et d&apos;abonnement Stripe, factures. Les données de carte bancaire sont traitées par Stripe et ne transitent pas par nos serveurs. Base légale : contrat et obligations légales.</li>
          <li>Sécurité : adresses IP, appareils et journaux d&apos;accès, limitation des tentatives. Base légale : intérêt légitime (sécurité du service).</li>
          <li>Passeport public et attestations : affichés seulement si vous activez le passeport, ou lorsqu&apos;un tiers saisit le code d&apos;une attestation que vous lui avez transmis (le nom du titulaire est alors affiché).</li>
        </ul>
        <h2>Qui voit vos résultats</h2>
        <p>Vous ; les formateurs et mentors affectés aux formations que vous suivez ; le responsable pédagogique ; si vous êtes inscrit par votre employeur et que le partage est activé, l&apos;administrateur de votre entreprise. Personne d&apos;autre.</p>
        <h2>Sous-traitants</h2>
        <p>Vercel (hébergement applicatif), Neon (base de données), Stripe (paiement), Resend (e-mails transactionnels), Cloudflare R2 ou équivalent (fichiers), fournisseur d&apos;IA si le tuteur est activé. Certains sont établis hors de l&apos;Union européenne : les transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou un mécanisme équivalent, à documenter.</p>
        <h2>Durées de conservation</h2>
        <p>Compte et données d&apos;apprentissage : pendant la durée d&apos;utilisation, puis suppression trois ans après la dernière activité (durée configurable). Factures : dix ans (obligation comptable). Journaux de sécurité : douze mois.</p>
        <h2>Vos droits</h2>
        <p>Accès, rectification, effacement, portabilité, limitation, opposition. Depuis « Compte et sécurité », vous téléchargez vos données et supprimez votre compte sans justification. Vous pouvez saisir la CNIL.</p>
        <h2>Cookies</h2>
        <p>Uniquement des cookies strictement nécessaires (session, sécurité). Aucun traceur publicitaire ni outil de mesure d&apos;audience tiers n&apos;est utilisé à ce jour.</p>
      </Prose>
    </>
  );
}
