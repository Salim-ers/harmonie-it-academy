import { PageIntro } from "@/components/marketing/page-intro";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata = { title: "Entreprises", description: "Former vos équipes support avec Harmonie Business : comptes salariés, affectation de formations, suivi des résultats." };

export default function BusinessPage() {
  return (
    <>
      <PageIntro title="Harmonie Business">
        Pour les services informatiques, centres de services et entreprises qui forment des techniciens : affectez des parcours, suivez la progression et les résultats, avec l&apos;accord
        de chaque salarié.
      </PageIntro>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div className="space-y-8">
          {[
            ["Comptes et groupes", "Invitez vos salariés, organisez-les en cohortes, affectez une formation avec une date cible."],
            ["Tableau de bord des résultats", "Progression, évaluations, laboratoires et compétences de vos équipes, uniquement pour les salariés rattachés à votre organisation et qui ont accepté le partage."],
            ["Mise en situation réelle", "Les incidents simulés couvrent le bureau, la logistique, l'industrie, le retail et la santé. Des scénarios propres à votre environnement peuvent être étudiés."],
            ["Facturation entreprise", "Facture unique, nombre de places ajustable. Les tarifs sont établis sur devis."],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="text-lg font-semibold tracking-tight">{t}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
          <p className="text-sm text-muted">
            Harmonie IT Academy n&apos;est pas, à ce jour, certifiée Qualiopi : ses formations ne sont donc pas finançables par les fonds publics ou mutualisés. Nous préparons la
            plateforme à ces exigences (traçabilité, positionnement, évaluations, satisfaction, réclamations).
          </p>
        </div>
        <div id="contact" className="rounded-[var(--radius-panel)] border border-line bg-surface p-6">
          <p className="mb-4 font-medium">Demander un devis</p>
          <ContactForm kind="business" />
        </div>
      </section>
    </>
  );
}
