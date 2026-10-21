# Harmonie IT Academy

Plateforme de formation aux métiers de l'informatique, par Harmonie Solutions. **Apprendre. Pratiquer. Maîtriser.**

Application Next.js 16 multi-utilisateurs, PostgreSQL (Neon), Stripe, déployable sur Vercel.

## Ce qui fonctionne aujourd'hui

- **Harmonie Campus** : tableau de bord réel, 26 leçons du parcours Technicien support N1 avec schémas interactifs, quiz corrigés côté serveur, exercices à indices graduels, reprise de lecture, progression et temps d'étude enregistrés.
- **Harmonie Labs** : 8 incidents simulés à moteur déterministe (actions, indices, diagnostic étayé, résolution, validation, note de clôture notée, débrief complet).
- **Évaluations** : positionnement initial, 8 exercices, examen blanc, examen final protégé (minuteur serveur, 3 tentatives) et attestation interne vérifiable.
- **Harmonie Career** : analyse d'offre d'emploi avec plan de préparation daté, relecture de CV croisée avec les preuves (texte jamais enregistré), simulateur d'entretien noté par grille (FR/EN, sectoriel), passeport de compétences public sur consentement, portfolio d'incidents.
- **Compétences** : carte calculée à partir de preuves pondérées, méthode affichée.
- **Comptes** : inscription, vérification d'e-mail, connexion, réinitialisation, double authentification, sessions, export RGPD, suppression.
- **Abonnements** : Stripe Checkout, portail client, webhooks signés et idempotents, droits d'accès synchronisés.
- **Harmonie Studio** : analytics agrégées, éditeur de leçons versionné avec circuit Brouillon → Révision technique → Validation pédagogique → Publication, utilisateurs et rôles, support, organisations B2B, indicateurs qualité (préparation Qualiopi), réglages et offres, journal d'audit.
- **Harmonie Business** : espace administrateur d'entreprise limité à ses salariés.

## Démarrer en local

```bash
cp .env.example .env.local   # renseigner DATABASE_URL et BETTER_AUTH_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm test` | Tests unitaires et d'intégration (PostgreSQL local `harmonie_test` ou `TEST_DATABASE_URL`) |
| `npm run typecheck` | Types des routes puis TypeScript strict |
| `npm run content:validate` | Validation des contenus et vérifications croisées |
| `npm run db:generate` | Nouvelle migration après modification du schéma |
| `npm run audit:archive -- fichier.zip` | Audit sécurisé d'une archive de ressources |

## Documentation

- [Phase 0 : inventaire et audit](docs/00-phase0-audit.md)
- [Architecture](docs/01-architecture.md)
- [Plus-value pour les candidats](docs/02-plus-value-candidats.md)
- [Sécurité et confidentialité](docs/03-securite.md)
- [Coûts d'exploitation](docs/04-couts.md)
- [Déploiement Vercel / Neon / Stripe](docs/05-deploiement.md)
- [Pédagogie et contenus](docs/06-pedagogie-et-contenus.md)
- [État du projet](docs/ETAT_DU_PROJET.md)
