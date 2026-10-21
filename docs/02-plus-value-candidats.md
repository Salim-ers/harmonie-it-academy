# Ce qui fait la différence pour les candidats

> Demande d'origine : « apporter une vraie aide et une plus-value aux candidats par rapport aux autres organismes de formation ».

## Le constat

Les grandes plateformes proposent déjà des cours, des projets et parfois un mentorat (OpenClassrooms, par exemple, propose un parcours diplômant de technicien informatique avec mentor). Les recruteurs du support IT, eux, cherchent surtout trois choses : **une méthode de diagnostic**, **une communication claire avec l'utilisateur** et **des preuves concrètes** de ce que le candidat sait faire. Un certificat de participation n'apporte rien de tout cela.

Harmonie se positionne donc sur ce qui manque entre « j'ai suivi un cours » et « je suis prêt pour ce poste ».

## Les huit leviers, et leur état

| # | Levier | Ce que le candidat y gagne | État |
|---|---|---|---|
| 1 | **Incidents simulés réalistes** (Harmonie Labs) | S'entraîner à raisonner : chaque test répond selon la vraie cause, les gestes dangereux sont expliqués, le diagnostic n'est accepté que s'il est prouvé par les tests | **Livré** : 8 scénarios (bureau, logistique, retail et luxe), moteur déterministe testé |
| 2 | **Portfolio d'interventions** | Montrer en entretien des tickets traités, documentés, notés : démarche, tests, cause, note de clôture | **Livré** : chaque laboratoire clôturé produit un compte rendu, imprimable et publiable dans le portfolio |
| 3 | **Compétences mesurées par des preuves** | Une carte de compétences honnête (nombre de preuves visible, « à confirmer » si insuffisant), que l'on peut défendre | **Livré** : méthode de pondération documentée et affichée à l'apprenant |
| 4 | **Passeport de compétences vérifiable** | Un lien à joindre au CV, contrôlé par le candidat (désactivé par défaut, lien régénérable), et des attestations vérifiables par code | **Livré** : `/passeport/[code]`, `/verifier/[code]`, consentement tracé |
| 5 | **Analyse d'offre d'emploi** | Coller une annonce et voir : ce qu'elle exige, ce que l'on a déjà prouvé, ce que la plateforme ne couvre pas encore (dit honnêtement), un plan jour par jour jusqu'à la date de l'entretien | **Livré** : moteur déterministe (aucun coût d'IA), 27 familles de compétences FR/EN |
| 6 | **Simulateur d'entretien corrigé** | Questions techniques, mises en situation et RH, en français ou en anglais, sectorielles ; chaque réponse est confrontée à une grille explicite, une réponse modèle et ce que le recruteur cherche réellement | **Livré** : 45 questions (support N1 et support industriel), quota gratuit mensuel, illimité en Pro |
| 7 | **Relecture de CV croisée avec les preuves** | Savoir ce qui manque au CV (rubriques, faits chiffrés), ce qu'il contient de trop (date de naissance, situation familiale : rien n'oblige à les donner), les compétences **prouvées** à ajouter, celles **affirmées** à préparer avant l'entretien, l'écart avec l'offre visée, et une rubrique « Projets » rédigée uniquement à partir des preuves | **Livré** : `/campus/carriere/cv`, moteur déterministe testé, **le texte du CV n'est jamais enregistré** (test qui parcourt toutes les colonnes de la base) |
| 8 | **Préparation au travail réel** | Questions d'entretien et glossaire FR/EN dans chaque leçon, rédaction de tickets notée, gestion d'un utilisateur mécontent notée | **Livré** dans les 26 leçons et 8 exercices |

## Principes d'honnêteté (ce qui crée la confiance)

- Aucune statistique d'insertion ou de réussite tant qu'elle n'est pas mesurée.
- Les grilles automatiques disent ce qu'elles font (repérer des notions) et ce qu'elles ne font pas (juger le style ou remplacer un recruteur).
- Les contenus non couverts (Linux, Intune, IT/OT détaillé) sont signalés comme tels dans l'analyse d'offre, avec une piste officielle.
- Les attestations sont internes : jamais présentées comme diplôme d'État, titre RNCP ou certification d'éditeur.

## Prochaines étapes à forte valeur

1. **Relecture humaine** des livrables et des réponses d'entretien par un mentor (les tables `assignments`/`submissions` existent ; l'interface reste à construire).
2. **Entretien vocal** facultatif avec transcription, sur consentement et avec plafond de coût.
3. **Générateur de CV complet** (mise en page exportable) à partir du passeport ; la rubrique « Projets » générée par la relecture en est la première brique.
4. **Parcours N2** et premiers modules sectoriels (industrie, logistique), qui élargissent l'analyse d'offre.
5. **Mesure de l'insertion** : questionnaire à 3 et 6 mois, pour publier un jour des chiffres réels.
