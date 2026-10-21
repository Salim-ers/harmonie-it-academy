# Sécurité et confidentialité

Approche : sécurité par conception, alignée sur les chapitres de l'**OWASP ASVS** applicables. Les mesures marquées « testé » sont couvertes par la suite automatisée (`npm test`).

## Authentification (ASVS V2, V3)

- Better Auth, sessions stockées en base, cookie `hia.session_token` **HttpOnly**, `Secure` en production, `SameSite=Lax` (testé : cookie HttpOnly présent).
- Vérification d'e-mail obligatoire avant toute session (testé), lien valable 24 h.
- Mot de passe : 12 caractères minimum, 128 maximum, hachage scrypt par la bibliothèque ; réinitialisation par lien à usage unique valable 30 min, **révocation de toutes les sessions** après réinitialisation.
- Double authentification TOTP + codes de secours ; **obligatoire pour accéder au Studio** (rôles formateur, mentor, responsable pédagogique, super-admin) et vérifiée dans chaque politique d'accès sensible.
- Limitation de débit persistante (table `rate_limit`, fonctionne sur plusieurs instances) : 5 connexions/min, 5 inscriptions/10 min, 3 demandes de réinitialisation/10 min, 5 codes TOTP/min (testé : 429 après tentatives répétées).
- Compte suspendu : création de session refusée quelle que soit la méthode (testé), sessions existantes supprimées.
- Le rôle ne peut pas être fourni à l'inscription (champ `input: false`, testé).
- Pas d'énumération des comptes à l'inscription ni à la réinitialisation (réponses identiques).
- Gestion des sessions par l'utilisateur : liste, déconnexion d'un appareil ou de tous les autres.

## Autorisation (ASVS V4)

- Politiques pures dans `src/server/authz/policies.ts`, refus par défaut, testées unitairement (8 cas) et en intégration.
- **IDOR** : chaque lecture d'une tentative, d'un laboratoire, d'une analyse d'offre, d'un entretien ou d'un ticket vérifie le propriétaire ; une ressource d'autrui répond « introuvable » sans confirmer son existence (testé).
- Formateurs limités aux formations qui leur sont affectées (`course_staff`) ; séparation des tâches : on ne relit pas son propre contenu ; la publication est réservée au responsable pédagogique (testé).
- Administrateur d'entreprise : uniquement les membres de son organisation, et seulement si le partage des résultats est activé (testé).
- Super-admin : ne peut pas changer son propre rôle ; un changement de rôle invalide les sessions de la personne.
- Accès payant dérivé de `entitlements`, écrit uniquement par le serveur (webhooks Stripe vérifiés, organisation, attribution manuelle tracée) ; jamais d'après une redirection de succès (testé : création, retard de paiement, résiliation, idempotence).

## Entrées, sorties et injections (ASVS V5)

- Toutes les Server Actions et routes valident leurs entrées avec Zod (longueurs maximales comprises).
- Requêtes SQL via Drizzle (paramétrées) ; les rares requêtes brutes utilisent le gabarit `sql` paramétré.
- Rendu React (échappement automatique) ; la mise en forme des leçons est un sous-ensemble sûr (gras, italique, code) sans HTML ; le JSON-LD est échappé ; les extraits de recherche sont rendus comme texte.
- Redirections : uniquement vers des chemins internes (`/…`, pas `//`).
- Formulaires publics : champ piège anti-robots et limitation par IP.

## CSRF

Les Server Actions de Next.js vérifient l'origine de la requête ; Better Auth vérifie l'origine (`trustedOrigins`) sur ses routes ; cookies `SameSite=Lax`.

## En-têtes (ASVS V14)

CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action` limité), HSTS (2 ans, preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`. `X-Powered-By` désactivé.

**Limite connue** : `script-src` autorise `'unsafe-inline'` (scripts d'hydratation et anti-flash de thème). Le passage aux nonces exigerait un rendu dynamique de toutes les pages ; à arbitrer avant l'ouverture commerciale.

## Erreurs et journalisation (ASVS V7)

- Les actions ne renvoient que des messages sûrs ; les erreurs inattendues sont journalisées côté serveur avec une référence courte communiquée à l'utilisateur.
- Journal d'audit (`audit_logs`) : changements de rôle, suspensions, accès accordés, publications et relectures, consultations de résultats individuels par l'équipe, exports, réinitialisations de mot de passe, activation/désactivation de la MFA, événements de facturation.

## Données et confidentialité (RGPD)

- Minimisation : les analytics du Studio sont agrégées ; l'export qualité est pseudonymisé (identifiant interne, pas d'e-mail).
- Export complet des données par l'utilisateur (JSON, articles 15 et 20) et suppression du compte (cascade).
- Consentements horodatés et versionnés (`consent_records`) : conditions d'utilisation, passeport public.
- Passeport public désactivé par défaut, non indexé, lien régénérable, sans e-mail (testé).
- Besoins d'adaptation : visibles uniquement par l'apprenant et le responsable pédagogique.
- Boîte d'envoi de développement jamais écrite en production ; stockage local de fichiers interdit sur Vercel.
- Cookies strictement nécessaires uniquement.

## Secrets

Uniquement par variables d'environnement (`.env.example` sans valeur réelle), validées au démarrage (`src/lib/env.ts`, longueur minimale du secret d'authentification). `.env*` est exclu du dépôt. Aucun secret côté navigateur (aucune variable `NEXT_PUBLIC_` sensible).

## Fichiers fournis par l'utilisateur (archives de projets)

`scripts/audit-archive.py` inventorie une archive **sans l'extraire ni exécuter quoi que ce soit** : contrôle des chemins (traversée, chemins absolus, liens), des tailles et du taux de compression (bombes ZIP), des archives imbriquées, et repérage des secrets probables (mots de passe, clés, jetons, clés privées, adresses e-mail et IP). Le rapport ne recopie jamais un secret : il indique le fichier, la ligne et le type.

## Dépendances

`npm audit --omit=dev` : seul drizzle-kit (outil de migration, non embarqué dans l'application) remonte une alerte modérée via esbuild pour son serveur de développement. À surveiller à chaque montée de version ; activer Dependabot ou Renovate sur le dépôt.

## Reste à faire avant la production

- Sauvegardes : activer la restauration à un instant donné de Neon et **tester une restauration** sur une branche, au moins une fois par trimestre.
- Alertes : brancher un outil de suivi d'erreurs et des alertes sur les événements d'audit sensibles (changement de rôle super-admin, export massif).
- Analyse antivirus des fichiers téléversés lorsque le dépôt de livrables sera ouvert.
- Test d'intrusion externe avant l'ouverture commerciale.
