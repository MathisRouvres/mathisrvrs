# Roadmap — Mode Carrière

## Vision par phases

| Phase | Objectif | Livrable clé |
|-------|----------|--------------|
| **0** | Audit + intégration douce | Docs + flag + `/carriere` « en construction » |
| **1** | Fondations techniques | `game-engine` déterministe (seed, PRNG, clamp stats), types, Vitest |
| **2** | Boucle minimale jouable | Création joueur + 1 saison Express + 1 dilemme data-driven + épilogue stub |
| **3** | Systèmes cœur | Stats, effets différés, flags cachés, journal de saison |
| **4** | Contenu & modes | Catalogue événements ; Standard + Immersion ; calendrier |
| **4 bis** | Pivot carrière narrative express | Création pays + poste uniquement ; 2 dilemmes / saison ; bilan auto ; save v4 + migration |
| **5** | Moteur de dilemmes express | 60+ dilemmes originaux ; emplacements sport/carrière ; garde-fous narratifs ; validateur éditorial ; atelier dev |
| **6** | Simulation automatique de saison | Résultats joueur par poste ; saison du club (classement, coupe, promotion/relégation) ; transferts auto narrés ; bilan 10 s |
| **7** | Profondeur narrative sans clics | Mémoire des choix ; 5 personnages récurrents + rival simulé ; 12 chaînes 3-6 événements ; 184 dilemmes ; échos du passé ; save v5 |
| **8** | Interface de jeu ultra-rapide | Parcours linéaire mobile ; HUD minimal ; choix inline sans confirmation ; bilan visuel ; animations courtes ; a11y ; test E2E |
| **9** | Retraite, héritage et fin de carrière | Déclenchements multiples ; dilemmes de fin pondérés (31+) ; bilan final complet ; score d’héritage 8 dimensions ; archétypes ; carte de partage ; rejouer |
| **5** | UX carrière | Écrans mobile-first, a11y, reduced-motion, sauvegarde locale |
| **6** | Économie & relations | Contrats, agent, sponsors, famille/social (profondeur) |
| **7** | Fin de carrière | Archétypes de réussite, scoring trajectoire, rejouabilité |
| **8** | Autorité serveur (option) | Auth + saves ranked + anti-triche basique |
| **9** | Polish & QA | Playwright parcours, équilibrage, perf mobile |

Les phases 8–9 dépendent d’un besoin produit explicite (classements publics).

---

## Phase 0 (actuelle) — critères de done

- [x] Audit dépôt documenté  
- [x] Game design / architecture / data-model / roadmap  
- [x] `CAREER_GAME_ENABLED` + route `/carriere`  
- [x] Page temporaire propre  
- [x] Aucun moteur de jeu  
- [x] Build portfolio intact  

---

## Phase 1 — fondations (actuelle)

- [x] Modules `game-engine` / `game-content` / `features/career`
- [x] PRNG seedé + tests de déterminisme
- [x] Persistance hybride locale + migrations + autosave
- [x] Mode invité + file de rattachement compte
- [x] UI create / save / resume / delete
- [x] Contenu narratif riche (phase suivante) — **partiel** : origines + événements d’ouverture

---

## Phase 2 — création joueur (actuelle)

- [x] Onboarding immersif (identité, postes, choix fondateurs)
- [x] Stats visibles + ressources + traits cachés
- [x] Carte récap + étoiles de potentiel (sans valeur exacte)
- [x] Génération rapide
- [x] Tests profils jouables + bornes

---

## Phase 3 — boucle principale (actuelle)

- [x] Machine à états (création → retraite)
- [x] Structure de saison Standard (5 chapitres)
- [x] `simulateSeason` pure + bilans + timeline
- [x] Courbes de progression par poste
- [x] Tests scénarios (normale, banc, blessure, exceptionnelle, âgé, potentiel, seed)

---

## Phase 4 bis — pivot express (actuelle)

- [x] Création un seul écran : pays + poste + « Commencer ma carrière » (aucun champ de nom)
- [x] Identité, rôle précis, club, stats, traits cachés générés depuis la seed
- [x] Boucle stricte : 2 dilemmes / saison → simulation auto → bilan → saison suivante
- [x] Invariant testé : `total = saisons_terminées × 2 + dilemmes_saison_courante`
- [x] Moteur pur : `createCareer` / `getNextDilemma` / `resolveDilemmaChoice` / `simulateSeason` / `completeSeason` / `getCareerSummary` / `isCareerFinished`
- [x] Save schema v4 + migration v1→v4 ; sauvegardes non migrables classées legacy (lecture seule, aucun effacement)
- [x] ~12 dilemmes de test (sport, coach, blessure, transfert, coéquipier, médias, sélection, argent, agent, famille, retraite, secours)
- [x] Reprise automatique de la carrière active au rechargement

---

## Phase 5 — moteur de dilemmes express (actuelle)

- [x] 87 dilemmes actifs (60 cœur + 16 postes + 10 chaînes + secours), tous validés
- [x] Emplacements annuels : slot 1 sportif / slot 2 carrière, boost ×4, repli garanti (total = 2)
- [x] Garde-fous contextuels : pas de répétition, pas de transfert post-signature, pas de sélection si blessé grave, pas de retraite jeune sans crise, pas de finale sans compétition
- [x] Résolution : variations visibles affichées (Niveau +2, Santé -5…), conséquences cachées signalées génériquement, jamais révélées
- [x] Validateur éditorial : titre ≤55, texte 35–90 mots, choix ≤65, faux choix, valeurs hors limites, boucles, cooldowns, conditions impossibles
- [x] Atelier dev `/carriere/dev/events` : presets d’état, éligibilité + garde-fous, test des choix, deltas visibles, inspection effets cachés, rapport de validation
- [x] Répartition : 12 sport, 8 coach, 8 vestiaire, 8 contrats/transferts, 6 blessures, 6 médias, 4 sélection, 4 argent, 4 fin de carrière, 16 postes, 4 chaînes, 8 rares, 9 liés aux choix passés, 38 avec conséquences retardées
- [x] Simulation sportive complète → Phase 6

---

## Phase 6 — simulation automatique de saison (actuelle)

- [x] Résultats joueur par poste : gardien jugé sur arrêts décisifs + clean sheets, défenseur sans dépendre des buts, milieu sur l’influence, attaquant porté par les buts
- [x] Facteurs : niveau, poste, rôle, potentiel, âge, forme, santé, mental, discipline, professionnalisme, confiance coach, niveau du club, concurrence au poste, championnat du pays, blessures, flags des dilemmes, variance seedée
- [x] Saison du club : classement /16, parcours de coupe, qualification continentale, trophées, promotion/relégation (division 2 suivie en état), changement d’entraîneur
- [x] Pays : `leagueLevel` + club phare par pays (pool de transferts) ; départ toujours en club formateur
- [x] Transferts automatiques narrés dans le bilan : fin de contrat, prêt imposé, relégation, libéré, faillite fictive, concrétisation d’un dilemme de transfert accepté — jamais d’écran mercato
- [x] Bilan compact ≤ 10 s : événement clé, classement, chiffres du poste, Δ niveau, Δ réputation, trophées, phrase narrative, bouton unique « Saison suivante »
- [x] Courbes par poste (gardien tardif, ailier précoce) + anti-dérives : plafond doux vers le potentiel, saisons variées, pas de 100 facile
- [x] 20 tests Phase 6 : 4 postes, exceptionnelle, moyenne, blanche, blessure longue, relégation, trophée, fin de contrat, prêt, jeune, vétéran, reproductibilité, enchaînement auto, pas de 3ᵉ dilemme

---

## Phase 7 — profondeur narrative sans clics (actuelle)

- [x] Mémoire des choix : flags horodatés (`flagSeason:`), dettes narratives, conséquences programmées, événements conditionnés aux choix passés, fins de carrière modifiables
- [x] 5 personnages récurrents générés depuis la seed (coach, coéquipier, rival, agent, journaliste) — identité, personnalité, relation, mémoire, objectifs ; jetons `{coach}`… interpolés à l’affichage
- [x] Rival : même âge, même poste, carrière simulée en parallèle chaque saison (niveau, clubs, trophées, réputation, relation) ; jalons dans le bilan ; comparaison en fin de carrière
- [x] 12 chaînes narratives de 3 à 6 événements étalées sur plusieurs saisons (blessure chronique, guerre froide coach, amitié, agent malhonnête, promesse au club, rivalité internationale, retour au club formateur, crise médiatique, reconversion, sélection, perte de niveau, retraite) — via la file prioritaire, jamais un 3ᵉ dilemme
- [x] Échos du passé : mention courte « {years} saisons plus tôt… » quand un ancien choix ressurgit — sans dévoiler la suite
- [x] Catalogue : 184 dilemmes actifs (29 rares, 25 postes, 15 âge, 16 personnages, 6 pays, 11 fins, 58 avec échos, 97 à conséquences retardées) — validateur 0 erreur
- [x] Équilibrage testé : 9 profils de décision viables, chaque stance a des gains ET des coûts ; héritage valorisant fidélité/vestiaire/public — carrière mémorable sans trophée
- [x] Save v5 + migration v4→v5 (personnages générés rétroactivement depuis la seed)
- [x] Aucun écran de gestion ajouté — toujours 2 dilemmes/saison

---

## Phase 8 — interface de jeu ultra-rapide (actuelle)

- [x] Parcours linéaire mobile : départ → dilemme 1 → dilemme 2 → bilan → saison suivante → retraite, sans navigation parasite
- [x] Écran de départ unique : titre, phrase concept, cartes pays + 4 cartes poste, un bouton, aucun champ texte ni compte
- [x] Écran de dilemme : en-tête (âge/saison/club/poste/progression), « Dilemme 1 sur 2 », choix inline
- [x] Après un choix : autres réponses désactivées, réaction narrative courte, variations visibles, autosave immédiate, bouton « Continuer » — aucune confirmation par choix
- [x] Confirmation à double appui uniquement pour l’irréversible (retraite `wants_retirement`, transfert `transfer_accepted`)
- [x] En-tête minimal (âge, club, niveau, santé, réputation) + panneau `<details>` secondaire pour le reste
- [x] Bilan compact et visuel : matchs, stat adaptée au poste, note, classement, progression, trophée, transfert ; action principale « Saison suivante »
- [x] Animations courtes 280–550 ms (entrée, pop des deltas, trophée, blessure) ; respect de `prefers-reduced-motion`
- [x] Sauvegarde : autosave après chaque choix, indicateur « ✓ Sauvegardé », reprise après fermeture, anti double-clic (garde `busy`), migration v1→v5
- [x] Accessibilité : `aria-pressed`, focus visible, boutons ≥ 44 px, `aria-live`, contrastes, aucune info portée par la seule couleur (libellés + icônes)
- [x] Identité visuelle originale : charte « bulletin de centre de formation », pelouse claire, tension vestiaire/unes sportives (hors design system portfolio)
- [x] Test E2E ([careerFlow.e2e.test.tsx](../../src/features/career/careerFlow.e2e.test.tsx)) : pays → poste → 2 dilemmes → bilan → saison suivante → rechargement → reprise exacte

---

## Phase 9 — retraite, héritage et fin de carrière (actuelle)

- [x] Déclenchements : âge, déclin, blessure, santé, perte de motivation, choix personnel, absence de contrat, décision narrative — toujours appliqués après le 2ᵉ dilemme
- [x] Retraite volontaire = un des deux dilemmes de la saison (career_end pose `wants_retirement`)
- [x] Pondération croissante des dilemmes de fin dès 31 ans (prolongation, perte de vitesse, changement de poste, remplaçant, transmission, retour formateur, dernier contrat, sélection, blessures chroniques, reconversion, retraite)
- [x] Bilan final complet et lisible : identité, pays, poste, âge, saisons, clubs, matchs, buts/passes/clean sheets, sélections, trophées, distinctions, blessures, meilleur niveau, fortune, rivalité, relations, décisions, résumé narratif
- [x] Score d’héritage multi-dimensionnel ([finalReport.ts](../../src/game-engine/core/finalReport.ts)) : réussite sportive, longévité, fidélité, popularité, richesse, résilience, influence vestiaire, carrière internationale — global non dominé par les trophées (2 meilleures dimensions pondérées)
- [x] Archétypes de fin originaux (Légende, Enfant du club, Nomade des ligues, Brassard respecté, Fer de lance national, Revenant, Une permanente, Nabab, Increvable, Roi sans couronne, Talent inachevé, Passeur de flambeau, Professionnel modèle…)
- [x] Carte partageable : identité générée, pays, poste, âge, meilleur club, trophées, héritage, titre — aucune donnée personnelle utilisateur
- [x] Rejouer : « Nouvelle carrière » (retour sélection pays + poste, aucun autre paramètre) + « Rejouer même combinaison, nouvelle seed »
- [x] Records de carrière suivis en état (`peakLevel`, `maxClubTenure`, `nationalCaps`) pour le bilan final

---

## Garde-fous transverses

- Ne pas merger de contenu / marques non licenciés.  
- Ne pas activer ranked sans serveur d’autorité.  
- Ne pas réécrire le portfolio pour « faire de la place » au jeu.  
- Feature flag pour rollback UX instantané (rebuild).  
- Branche feature → PR → `main` (déploiement auto OVH).

---

## Risques roadmap

| Risque | Mitigation |
|--------|------------|
| Scope trop large | Respect strict « une phase à la fois » |
| Bundle portfolio alourdi | Code-split route `/carriere` dès que le jeu grossit |
| TS vs JSX mixte | Confiner TS au moteur ; front jeu en TSX progressif |
| FTP clean-slate | Tout asset requis doit être dans `dist/` |
| Frustration équilibrage | Playtests Express d’abord |

---

## Décision produit ouverte

- Titre commercial définitif (remplacer CarrerManager).  
- Faut-il un alias `/games/carrermanager` ?  
- Classements publics : oui/non et échéance.
