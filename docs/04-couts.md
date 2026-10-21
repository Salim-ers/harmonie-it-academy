# Coûts d'exploitation — estimation par palier

Tarifs relevés sur les pages officielles le **21 octobre 2026**, hors taxes, en dollars quand le fournisseur facture en dollars. Ce sont des **hypothèses de consommation**, pas des devis : à revérifier avant chaque décision.

## Tarifs de référence

| Service | Usage chez Harmonie | Tarif officiel relevé |
|---|---|---|
| Vercel Pro | Hébergement de l'application (obligatoire : l'offre Hobby est réservée à un usage non commercial) | 20 $/mois par siège, 20 $ de crédit d'usage inclus ; au-delà : 0,60 $ par million d'invocations, Active CPU à partir de 0,128 $/h ([source](https://docs.vercel.com/docs/plans/pro-plan), [usages](https://vercel.com/docs/limits/fair-use-guidelines)) |
| Neon | PostgreSQL | Free : 100 CU-heures/projet, 0,5–1 Go ; Launch : 0,106 $/CU-heure, 0,35 $/Go-mois ; Scale : 0,222 $/CU-heure ; pas de minimum mensuel ([source](https://neon.com/pricing)) |
| Resend | E-mails transactionnels | Free : 3 000/mois, 100/jour ; Pro : 20 $/mois pour 50 000 ; Scale : à partir de 90 $/mois ([source](https://www.resend.com/pricing.md)) |
| Cloudflare R2 | Fichiers (livrables, médias) | 0,015 $/Go-mois, sortie gratuite ; gratuit jusqu'à 10 Go, 1 M d'opérations A, 10 M d'opérations B par mois ([source](https://developers.cloudflare.com/r2/pricing)) |
| Stripe | Paiement et abonnements | Cartes EEE standard : 1,5 % + 0,25 € ; premium : 2,8 % + 0,25 € ; Stripe Billing : 0,7 % du volume ([source](https://stripe.com/fr/pricing)) |

**Coût Stripe par abonné** (carte EEE standard) : Academy 19,90 € → environ 0,69 € (3,5 %) ; Academy Pro 39,90 € → environ 1,13 € (2,8 %).

## Estimation mensuelle par palier

| Palier | Hypothèses | Fixe | Variable | Total indicatif |
|---|---|---|---|---|
| 0 à 50 élèves | 1 siège Vercel ; Neon Free ou Launch avec mise en veille ; < 100 e-mails/jour | Vercel 20 $ | Neon 0–12 $, Resend 0 $, R2 0 $ | **20 à 35 $** + Stripe |
| 50 à 500 | ~300 à 700 CU-heures Neon ; inscriptions > 100/jour certains jours | Vercel 20 $, Resend Pro 20 $ | Neon 32–75 $, dépassement Vercel 0–30 $ | **75 à 150 $** + Stripe |
| 500 à 2 000 | Base active en continu (1 à 2 CU) ; 2 à 5 Go | Vercel 20–40 $ (1–2 sièges), Resend 20–35 $ | Neon 80–160 $, Vercel 20–100 $, R2 0–5 $ | **150 à 340 $** + Stripe |
| Plus de 2 000 | Neon Scale 2 à 4 CU ; trafic soutenu | Vercel 40–60 $, Resend Scale 90 $ | Neon 330–650 $, Vercel 100–300 $ | **550 à 1 100 $** + Stripe + IA |

Non inclus : nom de domaine, comptable, assurance, prestations juridiques, monitoring payant éventuel (non chiffré ici faute de choix arrêté), certification Qualiopi (audit facturé par un organisme certificateur).

## Leviers de maîtrise

- La notation des réponses libres (exercices, entretiens, notes de clôture) est **déterministe** : aucun coût d'IA par apprenant.
- Le catalogue public est mis en cache (Cache Components) : la base n'est sollicitée qu'à la publication.
- Neon met la base en veille quand elle est inutilisée ; les branches servent aux environnements de test sans coût de calcul permanent.
- Le tuteur IA, s'il est activé, doit être plafonné par abonnement (table `ai_usage`) ; aucun GPU permanent n'est nécessaire.
- Laboratoires sur machines virtuelles (phase ultérieure) : instances éphémères avec arrêt automatique, facturées à la minute, sur une infrastructure distincte de Vercel.
