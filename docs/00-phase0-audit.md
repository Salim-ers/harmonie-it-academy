# Phase 0 — Inventaire et audit des ressources fournies

Date : 21 octobre 2026.

## Inventaire

| Fichier annoncé dans le cahier des charges | Reçu | Traitement |
|---|---|---|
| Méga-prompt (cahier des charges) | Oui | Source des exigences de ce dépôt |
| Logo Harmonie Solutions (PNG 1254×1254, monogramme doré sur marine) | Oui | Intégré : `public/brand/harmonie-solutions-logo.png` (pied de page), monogramme vectoriel redessiné (`components/brand/logo.tsx`), doré réservé aux réussites et attestations |
| `OC 123.zip` (projets de formation) | **Non** | Audit reporté |
| `Atlas_IT_Site_Complet_Vercel.zip` (première version ATLAS IT) | **Non** | Audit reporté ; plateforme construite sur une base neuve |
| `Guide_Complet_Entretien_Chanel_Support_IT_Industriel_Salim.pdf` | **Non** | Audit reporté |

**Point à trancher** : le logo indique « HARMONY SOLUTIONS » alors que le cahier des charges écrit « Harmonie Solutions ». Le nom affiché est réglable dans Harmonie Studio (Réglages) ; « Harmonie » est utilisé par défaut.

## Procédure prévue à réception des archives

1. Déposer chaque archive dans un dossier vide, hors du dépôt Git.
2. Lancer l'audit **sans extraction ni exécution** :
   ```bash
   npm run audit:archive -- "OC 123.zip" > audit-oc123.md
   ```
   Le script repère la traversée de chemin, les liens, les bombes ZIP, les archives imbriquées, les scripts et exécutables, ainsi que les secrets probables (mots de passe, clés, jetons, chaînes de connexion, e-mails, IP) sans jamais en afficher la valeur.
3. Contrôle visuel des captures d'écran (noms, IP, mots de passe) : le script les liste mais ne peut pas les lire.
4. Tableau de réutilisation : pour chaque projet, thème couvert, exercice original qu'il peut inspirer, éléments exclus (données personnelles, supports protégés d'un autre organisme).
5. Pour ATLAS IT : inventaire des fonctionnalités (fiches, recherche, quiz, simulations, progression, parcours) et correspondance avec les modules existants ici ; reprise de la matière pédagogique uniquement, jamais du code ou des données sans revue.

## Décisions prises sans attendre

- Contenus 100 % originaux, entreprises fictives (Groupe Valmont, Nordelis Logistique, Maison Aubrac).
- Aucune infrastructure ni logiciel interne d'une entreprise réelle (notamment dans le parcours luxe et retail).
- Le guide « Chanel » ne sera utilisé, s'il est fourni, que pour ses thèmes généraux (support IT industriel) ; aucune information confidentielle ne sera reprise.
