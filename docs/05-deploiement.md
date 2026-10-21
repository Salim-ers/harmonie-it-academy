# Déploiement : Vercel + Neon + Stripe

## 1. Base de données Neon

1. Créer un projet Neon dans une région européenne (Francfort ou Paris si disponible).
2. Récupérer deux URL : **pooled** (hôte en `-pooler`) pour `DATABASE_URL`, **directe** pour `DATABASE_URL_UNPOOLED` (migrations).
3. L'extension `unaccent` est créée par la première migration (aucune action manuelle).
4. Activer la restauration à un instant donné (PITR) et noter la fenêtre de rétention de l'offre choisie.
5. Recommandé : intégration Neon ↔ Vercel pour qu'**une branche de base soit créée par déploiement Preview** ; la production garde sa base.

## 2. Projet Vercel

1. Importer le dépôt, framework détecté : Next.js. Offre **Pro** obligatoire (usage commercial).
2. Variables d'environnement (voir `.env.example`) en distinguant **Production** et **Preview** :
   - `APP_URL` (URL publique), `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET` (différent par environnement), `RESEND_API_KEY`, `EMAIL_FROM` ;
   - `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` : clés **test** en Preview, **live** en Production uniquement ;
   - `STORAGE_DRIVER=s3` et les variables `S3_*` (Cloudflare R2) dès que le dépôt de fichiers est ouvert ;
   - facultatif : `GOOGLE_*`, `MICROSOFT_*`, `ANTHROPIC_API_KEY`.
3. Le script `vercel-build` applique les migrations, importe le contenu du dépôt (idempotent, sans écraser les leçons modifiées dans le Studio), puis construit l'application.
4. Région des fonctions : choisir la même zone que la base (paramètre du projet Vercel).

## 3. E-mails (Resend)

Vérifier le domaine d'envoi (SPF, DKIM, DMARC). Sans `RESEND_API_KEY`, l'application **refuse** d'envoyer en production plutôt que de prétendre l'avoir fait.

## 4. Stripe

1. Créer deux produits (Academy, Academy Pro) avec un prix mensuel récurrent chacun, en **mode test** d'abord.
2. Dans Harmonie Studio → Réglages et offres, coller l'identifiant `price_…` de chaque offre et vérifier le prix affiché.
3. Créer un endpoint de webhook vers `https://<domaine>/api/stripe/webhook` avec les événements : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `invoice.finalized`. Copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
4. Activer le portail client (résiliation, changement d'offre, moyens de paiement, factures).
5. Test de bout en bout en mode test : carte `4242 4242 4242 4242`, vérifier que l'offre apparaît dans « Abonnement » **après** réception du webhook ; résilier depuis le portail et vérifier la fin des droits à l'échéance.
6. Bascule en production : refaire les produits/prix en mode live, nouvel endpoint de webhook, nouvelles clés en variables Production seulement.

## 5. Premier compte administrateur

**Option automatique** : renseigner `ADMIN_EMAIL` et `ADMIN_PASSWORD` (12 caractères minimum, `ADMIN_NAME` facultatif) dans Vercel puis redéployer. `vercel-build` crée le compte avec l'adresse déjà vérifiée et le rôle `super_admin` (ou promeut le compte s'il existe déjà). Tant que `ADMIN_PASSWORD` est défini, il redevient le mot de passe du compte à chaque déploiement : le retirer des variables une fois connecté. En local : `npm run db:admin`. Activer la double authentification (étape 2 ci-dessous) reste nécessaire pour ouvrir le Studio.

**Option manuelle** :

1. S'inscrire normalement sur le site et confirmer l'adresse.
2. Activer la double authentification dans « Compte et sécurité ».
3. Promouvoir ce compte une seule fois en base (c'est la seule opération manuelle) :
   ```sql
   update "user" set role = 'super_admin' where email = 'vous@votre-domaine.fr';
   ```
4. Se reconnecter : Harmonie Studio est accessible. Les rôles suivants se donnent depuis le Studio.

## 6. Vérifications après chaque déploiement

- `npm run typecheck`, `npm run lint`, `npm test` (la CI doit disposer d'un PostgreSQL de test : `TEST_DATABASE_URL`).
- `npm run content:validate` avant toute modification de contenu dans le dépôt.
- Parcours manuel : inscription → e-mail → leçon gratuite → quiz → laboratoire gratuit → analyse d'offre → passeport.

## Développement local

```bash
cp .env.example .env.local     # puis renseigner DATABASE_URL et BETTER_AUTH_SECRET
npm install
npm run db:migrate && npm run db:seed
npm run dev
```
Les e-mails (vérification, réinitialisation) apparaissent dans la console et dans la table `dev_outbox`.
