import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, ClipboardList, FileSearch, FileText, MessagesSquare } from "lucide-react";
import { IncidentConsole } from "@/components/marketing/incident-console";
import { PassportCard } from "@/components/career/passport-card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { getCatalog, getPlans, getPublicStats } from "@/server/services/catalog";
import { formatPrice } from "@/lib/format";
import { FaqList, HOME_FAQ } from "@/components/marketing/faq";

export default async function HomePage() {
  const [catalog, stats, plans] = await Promise.all([getCatalog(), getPublicStats(), getPlans()]);
  const supportCourses = catalog.filter((c) => c.school === "support" || c.school === "infrastructure");

  return (
    <>
      {/* Hero : une vraie mise en situation jouable, plutôt qu'une promesse. */}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--line)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] opacity-60" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-20">
          <div>
            <p className="text-sm text-muted">Harmonie IT Academy, par Harmonie Solutions</p>
            <h1 className="mt-5 font-display text-[44px] leading-[1.02] tracking-[-0.01em] text-ink sm:text-6xl lg:text-[68px]">
              Maîtrisez les métiers de l&apos;informatique. En pratiquant vraiment.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2">
              Du support IT à l&apos;administration systèmes, réseaux et cybersécurité. Apprenez les fondamentaux, résolvez des incidents réalistes et
              arrivez en entretien avec des preuves de ce que vous savez faire.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/formations" size="lg">
                Découvrir les parcours
              </ButtonLink>
              <ButtonLink href="/laboratoires" size="lg" variant="secondary">
                Essayer un laboratoire gratuit
              </ButtonLink>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
              <div>
                <dt className="text-sm text-muted">Leçons rédigées</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.lessons}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Incidents simulés</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.scenarios}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Questions corrigées</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.questions}</dd>
              </div>
            </dl>
          </div>
          <IncidentConsole />
        </div>
      </section>

      {/* La plus-value pour le candidat. */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <h2 className="font-display text-4xl leading-tight text-ink sm:text-5xl">Ce que vous pourrez montrer à un recruteur.</h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-ink-2">
              Un certificat de participation ne dit pas grand-chose. Harmonie vous aide à constituer un dossier concret, que vous pouvez partager quand vous le décidez.
            </p>
            <ul className="mt-10 space-y-7">
              {[
                { icon: ClipboardList, title: "Des incidents traités et documentés", text: "Chaque laboratoire se termine par une note de clôture notée et un compte rendu de votre démarche. Vous choisissez ceux qui rejoignent votre portfolio." },
                { icon: FileSearch, title: "Votre offre d'emploi décortiquée", text: "Collez une annonce : vous voyez ce qu'elle exige, ce que vous avez déjà prouvé, et un plan de préparation jour par jour jusqu'à l'entretien." },
                { icon: FileText, title: "Un CV qui dit ce que vous savez prouver", text: "La relecture repère ce qui manque, ce que vous n'avez pas à donner, les compétences prouvées à ajouter et celles à préparer avant l'entretien. Votre CV n'est pas enregistré." },
                { icon: MessagesSquare, title: "Des entretiens simulés, corrigés point par point", text: "Questions techniques, mises en situation et RH, en français ou en anglais. Chaque réponse est comparée à une grille explicite et à une réponse modèle." },
                { icon: BriefcaseBusiness, title: "Des compétences mesurées par des preuves", text: "Vos pourcentages viennent de vos quiz, exercices, laboratoires et examens, avec le nombre de preuves affiché. Rien n'est déclaratif." },
              ].map((f) => (
                <li key={f.title} className="flex gap-4">
                  <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-signal" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-ink">{f.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-muted">{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4 lg:sticky lg:top-24">
            <PassportCard
              sample
              data={{
                displayName: "Inès Martin",
                headline: "En reconversion vers le support IT N1",
                domains: [
                  { label: "Réseau", level: 78, confident: true, evidenceCount: 14 },
                  { label: "Windows", level: 84, confident: true, evidenceCount: 11 },
                  { label: "ITSM", level: 71, confident: true, evidenceCount: 9 },
                  { label: "Diagnostic", level: 76, confident: true, evidenceCount: 8 },
                  { label: "Communication", level: 62, confident: false, evidenceCount: 2 },
                ],
                attestations: [{ title: "Support N1 attesté", code: "EXEMPLE" }],
                incidents: 6,
              }}
            />
            <p className="text-sm text-muted">
              Exemple illustratif. Le passeport est désactivé par défaut ; vous l&apos;activez, le désactivez ou changez son lien quand vous voulez. Un recruteur peut vérifier une
              attestation avec son code, sur{" "}
              <Link href="/verifier" className="text-ink underline underline-offset-4">
                la page de vérification
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Les deux écoles. */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink">Deux écoles, une même exigence&nbsp;: comprendre avant d&apos;exécuter.</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <div className="rounded-[var(--radius-panel)] bg-ink p-7 text-paper sm:p-9">
              <div className="flex items-center justify-between">
                <p className="text-sm text-paper/70">Harmonie Support</p>
                <Badge className="bg-paper/10 text-paper">Disponible</Badge>
              </div>
              <p className="mt-4 font-display text-4xl leading-tight">L&apos;école du support IT, du premier ticket au N3.</p>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-paper/75">
                Le parcours N1 est complet aujourd&apos;hui : métier et ITSM, poste de travail, réseau, identités. Les niveaux N2 et N3 et les spécialisations sectorielles
                (industrie, logistique, retail et luxe, santé) suivent, publiés uniquement lorsqu&apos;ils sont rédigés et relus.
              </p>
              <ul className="mt-7 grid gap-2 sm:grid-cols-2">
                {supportCourses.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/formations/${c.slug}`} className="flex items-center justify-between rounded-[var(--radius-control)] bg-paper/[0.06] px-3 py-2.5 text-sm transition hover:bg-paper/[0.12]">
                      <span>{c.title}</span>
                      <span className="ml-3 shrink-0 tabular-nums text-paper/60">{c.lessonCount} leçons</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-between rounded-[var(--radius-panel)] border border-line p-7 sm:p-9">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted">Harmonie Infrastructure et Security</p>
                  <Badge tone="warn">En préparation</Badge>
                </div>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">Administration systèmes, réseaux et cybersécurité défensive.</p>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">
                  Windows Server, Linux, Cisco et pare-feu, virtualisation, supervision, sécurité défensive en laboratoires isolés. Le programme est publié ; les modules ouvriront
                  progressivement.
                </p>
              </div>
              <Link href="/ecoles/infrastructure" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline">
                Voir le programme <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Le parcours N1, réellement séquentiel. */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink">Le parcours Technicien support N1</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
              Pensé pour quelqu&apos;un qui part de zéro. Chaque étape débloque la pratique correspondante dans les laboratoires, et se termine par un examen qui donne lieu à une
              attestation interne.
            </p>
            <p className="mt-6 text-sm text-muted">
              Le découpage N1, N2, N3 est un modèle pédagogique : chaque entreprise répartit ces responsabilités à sa façon.
            </p>
          </div>
          <ol className="relative space-y-1 border-l border-line pl-8">
            {[...supportCourses.map((c) => ({ title: c.title, text: c.summary, meta: `${c.lessonCount} leçons, environ ${Math.round(c.durationMin / 60)} h` })), { title: "Examen final et préparation à l'entretien", text: "Quarante questions, un examen blanc pour s'entraîner, puis des simulations d'entretien ciblées sur les offres qui vous intéressent.", meta: "Attestation interne vérifiable" }].map((s, i) => (
              <li key={s.title} className="relative pb-7">
                <span className="absolute -left-[45px] flex h-7 w-7 items-center justify-center rounded-full border border-line bg-paper text-xs font-semibold tabular-nums text-ink">{i + 1}</span>
                <p className="font-medium text-ink">{s.title}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{s.text}</p>
                <p className="mt-1.5 text-sm text-ink-2">{s.meta}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Méthode : anatomie d'une leçon. */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-[var(--radius-panel)] border border-line bg-paper p-5">
              <p className="text-sm text-muted">Leçon : DHCP, comment un poste obtient son adresse IP</p>
              <ol className="mt-4 space-y-2.5 text-[15px]">
                {[
                  ["Une situation de terrain", "Lundi, 8 h 40, un collaborateur n'a plus rien."],
                  ["Une définition simple et une analogie", "L'accueil d'un hôtel qui prête une chambre."],
                  ["Un schéma animé, pas à pas", "Les quatre messages Discover, Offer, Request, Acknowledge."],
                  ["Des commandes réelles, lues ligne par ligne", "ipconfig /all, puis l'APIPA en 169.254."],
                  ["Les erreurs fréquentes et les gestes à risque", "Pourquoi ne jamais « dépanner » avec une IP fixe."],
                  ["Un exercice avec trois indices graduels", "Puis une correction commentée et notée."],
                  ["Les questions d'entretien associées", "Avec une réponse modèle à l'oral."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 w-5 shrink-0 text-right text-sm tabular-nums text-muted">{i + 1}</span>
                    <span>
                      <span className="font-medium text-ink">{t}.</span> <span className="text-muted">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="font-display text-4xl leading-tight text-ink sm:text-5xl">La théorie donne les bases. La pratique construit l&apos;expertise.</h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-ink-2">
              Toutes les leçons suivent la même structure, relue techniquement puis pédagogiquement avant publication. Vous savez toujours ce que vous apprenez, pourquoi, et comment
              le vérifier.
            </p>
            <Link href="/methode" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline">
              Découvrir la méthode <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Tarifs. */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">Commencez gratuitement, progressez à votre rythme.</h2>
          <Link href="/tarifs" className="text-sm font-medium text-ink hover:underline">
            Comparer les offres
          </Link>
        </div>
        <div className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div key={p.code} className="flex flex-col bg-surface p-6">
              <p className="font-medium text-ink">{p.name}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{formatPrice(p.priceCents, p.interval)}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">Questions fréquentes</h2>
          <FaqList items={HOME_FAQ} />
        </div>
      </section>
    </>
  );
}
