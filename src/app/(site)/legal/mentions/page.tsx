import { LegalNotice, PageIntro, Prose } from "@/components/marketing/page-intro";

export const metadata = { title: "Mentions légales" };

export default function Page() {
  return (
    <>
      <PageIntro title="Mentions légales" />
      <Prose>
        <LegalNotice />
        <h2>Éditeur</h2>
        <p>Harmonie Solutions, [forme juridique et capital à compléter], immatriculée au RCS de [ville] sous le numéro [à compléter], siège social [adresse à compléter]. Directeur de la publication : [nom à compléter]. Contact : via la page Contact.</p>
        <h2>Hébergement</h2>
        <p>Application hébergée par Vercel Inc. (États-Unis) ; base de données hébergée par Neon (région à préciser, de préférence dans l&apos;Union européenne) ; paiements traités par Stripe. Les coordonnées complètes des hébergeurs sont à reporter ici.</p>
        <h2>Propriété intellectuelle</h2>
        <p>Les contenus pédagogiques, schémas et simulations sont la propriété de Harmonie Solutions. Les marques citées appartiennent à leurs propriétaires respectifs et sont mentionnées à titre informatif.</p>
        <h2>Organisme de formation</h2>
        <p>Numéro de déclaration d&apos;activité : [à compléter le cas échéant]. Harmonie IT Academy n&apos;est pas certifiée Qualiopi à ce jour.</p>
      </Prose>
    </>
  );
}
