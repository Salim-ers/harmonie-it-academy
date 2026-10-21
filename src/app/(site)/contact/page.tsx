import { PageIntro } from "@/components/marketing/page-intro";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <PageIntro title="Contact">Une question sur les formations, une demande presse ou partenariat. Les apprenants inscrits obtiennent une réponse plus rapide depuis « Aide et support » dans leur espace.</PageIntro>
      <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <ContactForm kind="contact" />
      </section>
    </>
  );
}
