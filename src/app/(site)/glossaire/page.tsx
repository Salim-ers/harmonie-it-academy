import Link from "next/link";
import { getGlossary } from "@/server/services/catalog";
import { PageIntro } from "@/components/marketing/page-intro";

export const metadata = { title: "Glossaire français / anglais", description: "Les termes du support informatique, en français et en anglais, avec la leçon où ils sont expliqués." };

export default async function GlossaryPage() {
  const terms = await getGlossary();
  const letters = [...new Set(terms.map((t) => t.termFr[0].toUpperCase()))];
  return (
    <>
      <PageIntro title="Glossaire">{terms.length} termes du support informatique, avec leur équivalent anglais, utiles en entretien comme au quotidien.</PageIntro>
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <nav aria-label="Lettres" className="mb-8 flex flex-wrap gap-1">
          {letters.map((l) => (
            <a key={l} href={`#lettre-${l}`} className="rounded-md px-2 py-1 text-sm text-ink-2 hover:bg-mist">
              {l}
            </a>
          ))}
        </nav>
        <dl className="divide-y divide-line border-y border-line">
          {terms.map((t, i) => (
            <div key={t.slug} id={t.slug} className="grid scroll-mt-24 gap-1 py-4 sm:grid-cols-[240px_1fr] sm:gap-8">
              {i === 0 || terms[i - 1].termFr[0].toUpperCase() !== t.termFr[0].toUpperCase() ? <span id={`lettre-${t.termFr[0].toUpperCase()}`} className="sr-only" /> : null}
              <dt>
                <span className="font-medium text-ink">{t.termFr}</span>
                <span className="block text-sm italic text-muted" lang="en">
                  {t.termEn}
                </span>
              </dt>
              <dd className="text-[15px] leading-relaxed text-ink-2">
                {t.definition}
                {t.lessonSlug ? (
                  <Link href={`/campus/cours/${t.lessonSlug}`} className="ml-2 text-sm text-signal-ink hover:underline">
                    Voir la leçon
                  </Link>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
