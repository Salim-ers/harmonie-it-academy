# Architecture technique

## Choix de la pile (versions installées le 21/10/2026)

| Brique | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 16.4** (App Router, Turbopack, Cache Components) | Rendu serveur, Server Actions, cache granulaire du catalogue public, déploiement natif Vercel |
| UI | React 19.3, Tailwind CSS 4, composants maison accessibles, `motion` 14, `lucide-react` | Design system propre (tokens dans `globals.css`), pas de dépendance à un kit générique |
| Langage | TypeScript strict | Types partagés du schéma au composant |
| Base | **PostgreSQL** (Neon en production, PostgreSQL 16 en local et en test) | Relationnel, JSONB pour les contenus versionnés, recherche plein texte native |
| ORM | **Drizzle ORM 0.45** + drizzle-kit | SQL explicite, migrations versionnées, typage fort, léger en serverless |
| Driver | `postgres` (postgres.js), `prepare: false` | Compatible avec le pooler Neon ; même driver en local et en production |
| Authentification | **Better Auth 1.7** (plugin two-factor, adaptateur Drizzle) | Bibliothèque maintenue (le projet Auth.js l'a rejointe), sessions en base, vérification d'e-mail, réinitialisation, TOTP, OAuth Google/Microsoft, limitation de débit persistante |
| Validation | Zod 4 | Entrées serveur, contenus, réponses d'évaluation |
| Paiement | Stripe 23 (Checkout, Billing, portail, webhooks signés) | Droits d'accès dérivés uniquement des événements Stripe vérifiés |
| E-mail | Resend (production) ; boîte d'envoi locale `dev_outbox` en développement | Aucun envoi réel en local, jamais de « réussite » silencieuse en production |
| Tests | Vitest 5 (unitaires et intégration sur vraie base), Playwright prévu en e2e | Les parcours critiques sont testés contre PostgreSQL, pas contre des simulacres |

## Découpage

```
src/
  app/
    (site)/          pages publiques (accueil, catalogue, écoles, labs, carrière, tarifs, légal, vérification, passeport public)
    (auth)/          connexion, inscription, réinitialisation, bienvenue
    campus/          espace étudiant (Harmonie Campus) : tableau de bord, cours, labs, évaluations, carrière, compétences, attestations, abonnement, support, compte
    studio/          back-office (Harmonie Studio) : analytics, contenus et workflow, utilisateurs, support, organisations, qualité, réglages, audit
    entreprise/      espace administrateur d'entreprise (Harmonie Business)
    api/             auth (Better Auth), webhook Stripe, recherche, export RGPD, export qualité
  components/        UI, leçon, évaluation, labs, carrière, studio, schémas interactifs
  content/           schémas de contenu (Zod), référentiel de compétences, catalogue, contenus sources JSON
  server/
    auth/            configuration Better Auth et couche d'accès aux sessions (DAL)
    authz/           politiques d'autorisation pures et testées
    db/              schéma Drizzle (68 tables) et client
    engines/         moteurs purs : notation, grilles de texte, simulateur d'incidents, analyse d'offre
    services/        logique métier (une fonction = une vérification d'accès + une opération)
    actions/         Server Actions : validation Zod, authentification, appel de service, messages d'erreur sûrs
scripts/             migrations, import du contenu, validation, réinitialisation locale, audit d'archive
drizzle/             migrations SQL versionnées
tests/               unitaires et intégration
```

## Principes

1. **Le serveur décide.** Le proxy (`src/proxy.ts`) ne fait qu'une redirection optimiste ; chaque page et chaque action relit la session en base (`requireUser`, `requireStudio`) et appelle une politique de `authz/policies.ts`. Règle par défaut : refus.
2. **Les bonnes réponses ne quittent pas le serveur.** Quiz, examens et scénarios ont une forme publique (`publicQuestion`, `publicView`) testée pour ne contenir aucune réponse, aucune cause, aucun drapeau de correction. Les indices et corrections d'exercices sont servis à la demande et comptabilisés.
3. **Moteurs purs.** Notation, grilles, simulateur et analyse d'offre sont des fonctions sans I/O : déterministes, rejouables, testées.
4. **Contenu versionné.** Leçons, questions et scénarios sont stockés par version (JSONB). Une tentative pointe vers la version de question réellement vue ; une publication n'efface jamais l'historique. L'import du dépôt est idempotent et ne réécrit jamais une leçon modifiée dans le Studio.
5. **Cache.** Le catalogue public, les leçons publiées, les plans et réglages sont en `use cache` avec étiquettes (`catalog`, `lesson:<slug>`, `plans`, `settings`) invalidées par `updateTag` à la publication. Tout ce qui dépend de la session est rendu à la requête, derrière `Suspense`.
6. **Pas de faux.** Aucune statistique inventée : la page d'accueil affiche les volumes réels de contenu. Aucun module annoncé sans leçon rédigée (vérifié par `scripts/validate-content.ts --strict`).

## Modèle de données (68 tables)

- **Identité** : `user`, `session`, `account`, `verification`, `two_factor`, `rate_limit` (Better Auth) ; rôles `student`, `trainer`, `mentor`, `pedago_lead`, `super_admin`.
- **Multi-tenant** : `organizations`, `organization_members` (`org_admin`/`member`), `cohorts`, `cohort_members`, `organization_assignments`.
- **Catalogue** : `courses`, `course_staff` (périmètre des formateurs), `course_modules`, `lessons`, `lesson_versions`, `editorial_reviews`, `lesson_skills`, `lesson_prerequisites`, `learning_paths`, `path_courses`, `glossary_terms`, `content_sources`, `search_documents` (colonne `tsvector` générée, index GIN, français sans accents).
- **Apprentissage** : `enrollments`, `lesson_progress` (position, temps, état des exercices), `learning_time` (par jour), `lesson_bookmarks`, `satisfaction_surveys`.
- **Évaluation** : `questions`, `question_versions` (les choix sont intégrés à la version), `assessments`, `assessment_questions`, `attempts`, `answers`, `assignments`, `submissions`.
- **Laboratoires** : `scenarios`, `scenario_versions`, `lab_sessions` (état sérialisé, rapport), `scenario_events` (journal ordonné).
- **Compétences** : `skills`, `skill_evidence` (une preuve par source, remplacée à chaque nouvelle tentative).
- **Carrière** : `interview_questions`, `interview_sessions`, `interview_answers`, `job_analyses`, `skill_passports`, `attestations`.
- **Gamification** : `xp_events` (unique par objet), `user_badges`, `user_profiles`.
- **Facturation** : `plans`, `billing_customers`, `subscriptions`, `invoices`, `entitlements` (droits effectifs), `stripe_events` (idempotence).
- **Exploitation** : `support_tickets`, `support_messages`, `notifications`, `media_assets`, `audit_logs`, `consent_records`, `app_settings`, `app_rate_limits`, `ai_usage`, `dev_outbox`.

Écarts assumés avec la liste du cahier des charges : `Choices` est intégré à `question_versions` (versionnement atomique), `Payments` est couvert par `invoices` + Stripe, `Certificates` et `InternalAttestations` sont une seule table `attestations`, `Grades`/`Feedback` sont portés par `answers`, `attempts` et `submissions`.

## Moteur de simulation (Harmonie Labs)

Un scénario définit des actions (interroger, observer, tester, consulter, intervenir, escalader), chacune avec des résultats conditionnés par des drapeaux d'état. Le premier résultat dont les conditions sont remplies est renvoyé : chaque test est cohérent avec la cause réelle **et** avec ce qui a déjà été corrigé. Un diagnostic n'est accepté que si les indices qui le prouvent ont été obtenus. Les actions dangereuses demandent une confirmation explicite et pèsent sur le score de sécurité. Les résolutions peuvent exiger un prérequis de procédure (par exemple la vérification d'identité). Le barème (100 points) est affiché à l'apprenant.

## Évolutions prévues dans l'architecture

- **Laboratoires réels** : un service distinct (hors Vercel) pilotera des VM/conteneurs éphémères isolés (quotas, réseau restreint, arrêt automatique). L'application ne stockera que les sessions et résultats ; aucune commande d'apprenant n'est exécutée sur l'infrastructure applicative.
- **Tuteur IA** : variables `ANTHROPIC_API_KEY`, `AI_TUTOR_MODEL`, table `ai_usage` et consentement `ai_tutor` prévus ; récupération sur les leçons publiées par la recherche plein texte existante ; désactivé pendant un examen protégé ; la plateforme fonctionne sans.
- **Internationalisation** : contenus et interface en français, champs `lang` sur les questions d'entretien, `locale` sur le profil.
