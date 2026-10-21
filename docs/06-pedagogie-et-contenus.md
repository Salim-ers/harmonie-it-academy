# Pédagogie et production de contenu

## Format d'une leçon

Une leçon est un document structuré (`src/content/schema.ts`) : une fiche (titre, résumé, niveau, prérequis, objectifs mesurables, durée, compétences travaillées, leçon suivante) et une suite de **blocs typés** : titre, paragraphe, encadré (définition, analogie, à savoir, astuce, attention, danger, sur le terrain), liste, commande (avec explication, sortie attendue et lecture guidée ligne par ligne), code, tableau, schéma interactif, démonstration pas à pas, erreurs fréquentes, risques, quiz, exercice (trois indices graduels, correction commentée, grille facultative), questions d'entretien, glossaire FR/EN, résumé, références datées.

La validation refuse une leçon à laquelle il manque une section de la charte (définition, analogie, schéma, démonstration, commande ou outil, erreurs fréquentes, risques, quiz, exercice, entretien, résumé, références).

## Contenus livrés (phase 1)

| Formation | Leçons |
|---|---|
| Le métier du support et l'ITSM | Rôles N0 à N3 ; cycle de vie d'un ticket ; communication et rédaction ; méthode de diagnostic ; ITIL 4 ; GLPI |
| Le poste de travail | Anatomie d'un ordinateur ; BIOS, UEFI et démarrage ; imprimantes en entreprise ; comptes et profils Windows ; gestionnaire des tâches, services et journaux ; PowerShell ; disques et stockage |
| Le réseau pour le support | Adresse IP ; CIDR et sous-réseaux ; DHCP ; DNS ; OSI et TCP/IP ; TCP, UDP et ports ; ARP et switch ; commandes de diagnostic ; Wi-Fi d'entreprise ; VLAN |
| Identités et infrastructure | Active Directory ; Microsoft 365 et Entra ID ; virtualisation |

- **26 leçons** (environ 90 000 mots, structure complète), **220 questions** corrigées et justifiées (dont 50 réservées aux examens), **8 exercices** pratiques, **8 incidents simulés**, **45 questions d'entretien**, positionnement initial, examen blanc (20 questions), examen final (40 questions, sans recouvrement avec l'examen blanc).
- Les références de chaque leçon ont été chargées et vérifiées le 21/10/2026 ; celles qui ne se chargeaient pas ont été écartées.

## Points à faire relire par un formateur

Les sorties de commandes Windows ont été écrites de façon réaliste mais **n'ont pas été capturées sur un poste français** : libellés exacts de `ipconfig`, `net user`, `whoami /groups`, `gpresult`, `route print`, `msinfo32`, `chkdsk`, `netsh wlan`, messages de `nslookup` et de `Test-NetConnection`. Les leçons le signalent quand le libellé varie selon la version. À vérifier également : libellés de GLPI selon la version, correspondance de vocabulaire ServiceNow / Jira Service Management, mention d'ITIL version 5 dans la leçon ITIL. Ces relectures sont exactement l'objet de l'étape « révision technique » du Studio.

## Circuit éditorial

**Brouillon → Révision technique → Validation pédagogique → Publication.** L'auteur ne peut pas relire sa propre version ; la publication est réservée au responsable pédagogique ; chaque étape est tracée avec commentaire. Les contenus importés du dépôt sont publiés directement (première version) ; toute modification ultérieure passe par le circuit.

## Ajouter du contenu

- **Dans le Studio** (recommandé pour les formateurs) : créer une nouvelle version, éditer les blocs (formulaires pour les blocs de texte, JSON validé pour les blocs complexes), soumettre.
- **Dans le dépôt** (pour les nouveaux modules) : ajouter les fichiers JSON dans `src/content/lessons`, `questions`, `scenarios` ou `interview`, référencer la leçon dans `src/content/catalog.ts`, lancer `npm run content:validate`, puis `npm run db:seed`.

## Notation (explicite et affichée)

- Questions fermées : exactes ; choix multiples et associations avec crédit partiel.
- Textes libres : grille de notions avec synonymes, formulations à risque pénalisantes (les formulations niées comme « ne jamais redémarrer » ne pénalisent pas), longueur minimale, structure Situation/Action/Résultat pour les questions comportementales. La grille dit ce qu'elle ne fait pas : juger le style.
- Laboratoires : barème sur 100 (diagnostic 30, résolution 20, méthode 15, validation 10, sécurité 10, SLA 5, note de clôture 10, −3 par indice).
- Compétences : moyenne pondérée des preuves (quiz 1, entretien 1, exercice 1,5, laboratoire 2, examen 3) ; « à confirmer » sous un poids total de 3.
