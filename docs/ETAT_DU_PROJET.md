# État du projet

Mis à jour le 21 octobre 2026. Ce fichier dit ce qui est fait, ce qui est vérifié, ce qui reste à faire. Il est tenu à jour à chaque session de travail ; rien n'y est marqué « fait » sans avoir été exécuté.

## Vérifications passées sur cette version

| Vérification | Résultat |
|---|---|
| `npm run typecheck` (TypeScript strict, types de routes) | OK |
| `npx eslint src scripts tests` | OK, aucune erreur |
| `npm test` : tests unitaires et d'intégration sur un vrai PostgreSQL | 93 / 93 |
| `npm run test:e2e` (Playwright, serveur de production local) | 3 / 3 |
| `npm run content:validate --strict` | OK : 26 leçons, 220 questions, 8 incidents, 8 exercices, 45 questions d'entretien |
| `next build` (Cache Components activé) | OK |
| Parcours réel dans Chromium (serveur de production local) | Inscription → e-mail → vérification → tableau de bord → 26 leçons et leurs schémas → laboratoire → analyse d'offre → relecture de CV → livrables → Studio, **0 erreur console** |

Ce que les tests d'intégration couvrent, entre autres : notation serveur des quiz, déverrouillage d'une leçon seulement après réussite du quiz, accès par offre, ordre des indices, protection contre l'accès aux données d'un autre utilisateur (tentatives, laboratoires, offres, entretiens), laboratoire complet avec confirmation des actions dangereuses, examen protégé (minuteur serveur, 3 tentatives, réponses jamais renvoyées), attestation vérifiable, webhooks Stripe signés et idempotents, circuit éditorial avec séparation des rôles, périmètre d'un formateur, isolation entre organisations clientes, analyse d'offre, quota d'entretiens, passeport public sans e-mail, recherche plein texte insensible aux accents, limitation de débit, inscription / vérification / connexion Better Auth (cookie HttpOnly, injection de rôle refusée, compte suspendu bloqué, 429).

## Fait (phase 1)

- **Socle** : Next.js 16 (App Router, Cache Components), TypeScript strict, Tailwind 4, PostgreSQL via Drizzle (68 tables, 4 migrations), Better Auth (e-mail + mot de passe, vérification, réinitialisation, double authentification TOTP, sessions révocables), autorisations centralisées (`src/server/authz/policies.ts`), journal d'audit, limitation de débit en base, en-têtes de sécurité.
- **Site public** : accueil avec incident jouable, formations, écoles, laboratoires, Career, méthode, tarifs, entreprises, à propos, contact, FAQ, glossaire FR/EN, vérification d'attestation, passeport public, pages légales (à compléter, voir plus bas), accessibilité, plan du site.
- **Campus** : tableau de bord réel, formations, leçons (17 types de blocs, reprise de lecture, temps d'étude), quiz et exercices notés côté serveur, positionnement, examen blanc, examen final, attestations, carte de compétences fondée sur des preuves, laboratoires, Career (analyse d'offre, relecture de CV jamais enregistrée, entretiens, passeport, portfolio), livrables relus par un mentor (offre Pro, plafond mensuel), appréciation de fin de formation, nouveautés sur le tableau de bord, recherche, abonnement, support, compte (2FA, sessions, export RGPD, suppression).
- **Studio** : vue d'ensemble agrégée, file des livrables à relire (périmètre par formation), éditeur de leçons versionné, circuit Brouillon → Révision technique → Validation pédagogique → Publication, aperçu, utilisateurs et rôles, fiche apprenant (consultation tracée), support, organisations B2B, Harmonie Quality (indicateurs, appréciations par formation sans identité, export pseudonymisé), réglages et offres, journal d'audit.
- **Business** : tableau de bord d'entreprise limité aux salariés qui ont accepté le partage.
- **Paiement** : Stripe Checkout et portail client ; les droits ne s'ouvrent **qu'à la réception du webhook vérifié**, jamais sur la page de retour.
- **Contenus** : voir `06-pedagogie-et-contenus.md`.
- **Documentation** : audit phase 0, architecture, plus-value candidats, sécurité, coûts vérifiés, déploiement, pédagogie.

## À faire avant l'ouverture commerciale

Décisions qui reviennent à Harmonie Solutions :

1. **Nom affiché** : le logo dit « Harmony Solutions », le cahier des charges « Harmonie Solutions ». Réglable dans le Studio ; « Harmonie » par défaut.
2. **Prix** : 19,90 € et 39,90 € par mois sont des valeurs de départ, modifiables dans le Studio. Créer les produits Stripe correspondants.
3. **Mentions légales, CGV, politique de confidentialité** : les pages sont structurées mais contiennent des champs à compléter (raison sociale, SIREN, adresse, directeur de publication, hébergeur, médiateur de la consommation, DPO éventuel). À faire relire par un juriste.
4. **Qualiopi, CPF, RNCP** : rien de tout cela n'est affiché comme acquis. Les indicateurs du Studio préparent un audit, ils ne le remplacent pas.
5. **Archives de référence** (`OC 123.zip`, `Atlas_IT_Site_Complet_Vercel.zip`, guide PDF) : non reçues ; procédure d'audit prête (`npm run audit:archive`).

Travaux techniques :

- **Relecture technique des contenus** par un technicien sur un poste Windows en français : libellés exacts des sorties de commandes (`ipconfig`, `net user`, `whoami /groups`, `gpresult`, `netsh wlan`, `Get-ComputerInfo`…), libellés GLPI selon la version, correspondances ServiceNow / Jira Service Management, mention d'ITIL version 5 dans la leçon ITIL. C'est l'objet de l'étape « révision technique » du Studio.
- **Stockage de fichiers** : le pilote local fonctionne ; le pilote S3 / Cloudflare R2 (dépôt de livrables, pièces jointes de support) n'est pas encore écrit. Le dépôt de fichiers par les apprenants n'est donc pas ouvert.
- **Tuteur IA** : non implémenté. Les variables `ANTHROPIC_API_KEY` et la table `ai_usage` (plafonds par offre) sont prêtes ; aucune fonction ne prétend l'utiliser.
- **Questionnaire à froid** (3 et 6 mois après la formation, insertion professionnelle) : à construire ; l'appréciation de fin de formation, elle, est en place.
- **Connexion Google / Microsoft** : variables prévues, non activée.
- **CSP** : `script-src 'unsafe-inline'` est encore nécessaire (script anti-flash du thème et hydratation). Passage à un nonce par requête prévu.
- **E-mails** : gabarits sobres ; brancher Resend et vérifier le domaine (SPF, DKIM, DMARC).
- **CI** : les tests de bout en bout existent (`npm run test:e2e`, Playwright) mais aucun pipeline n'est encore configuré pour les lancer à chaque modification.

## Phases suivantes

- **Phase 2** : niveaux N2 et N3 du support, parcours sectoriels (industrie, logistique, retail et luxe, santé) avec entreprises fictives, tuteur IA plafonné, pièces jointes aux livrables (R2), générateur de CV complet.
- **Phase 3** : école Infrastructure et Sécurité (Windows Server, Linux, réseau Cisco, pare-feu, supervision, sécurité défensive), laboratoires sur machines virtuelles isolées et éphémères hors de Vercel (jamais de commande d'apprenant exécutée sur l'infrastructure de production), préparation aux certifications d'éditeurs (présentée comme préparation, jamais comme certification).

## Schémas

Les 26 schémas interactifs référencés par les leçons sont écrits (`src/components/diagrams/`) : pas à pas avec lecture automatique, sélecteurs (couches, ports, partitions, préfixes), calculs IPv4 réels, boutons hors de la zone `role="img"` pour rester accessibles au clavier et aux lecteurs d'écran, thèmes clair et sombre. Chacun est chargé à la demande dans la leçon qui l'utilise. Valeurs à faire confirmer en révision technique : identifiants d'événements Windows cités (7000, 7009, Kernel-Power 41, 6008), sortie `whoami` d'un compte Entra ID, taille de la partition de récupération, adresses de l'intranet fictif (10.20.5.20 retenue pour les commandes réseau), mention « surtout des réservations » pour le VLAN 30.
