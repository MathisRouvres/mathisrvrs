# MonoVomy — Spécifications des mécaniques retenues

Sélection validée à partir de [piment-catalogue.md](./piment-catalogue.md).
Chaque mécanique est décrite au niveau **implémentable** : règle exacte, cas limites,
état moteur, intentions réseau, fichiers touchés, garde-fous.

## Conventions communes à tout le document

- **Gorgée** = unité de base × multiplicateur de difficulté (`DIFFICULTY_MULTIPLIER` :
  facile ×1, inter ×2, difficile ×3, hardcore ×4). Les chiffres de ce document sont
  des **valeurs de base**, avant multiplicateur.
- **Cul sec** = finir son verre. Compté 4 gorgées pour tout calcul de plafond.
- **Mode soft** : chaque mécanique sanctionnante fournit son équivalent via `engine/soft.ts`.
  Un joueur en soft n'est jamais exclu d'une mécanique, il exécute le mini-gage équivalent.
- **Rétrocompatibilité** : tout nouveau champ de `GameState` / `PlayerState` est **optionnel**.
  Les snapshots Phase 8 doivent se restaurer sans migration (`net/session.ts`).
- **Autorité** : l'hôte applique, le client propose. Toute nouvelle action passe par une
  `Intent` dans `net/protocol.ts`, avec `intentId` + `sequence` (idempotence déjà en place).
- **Déterminisme** : tout aléa passe par `createGameRng(seed, rngState)` et met à jour
  `state.rngState`. Jamais `Math.random()`.

---

# 1. Économie de l'alcool

## 1.1 — Crédit du Bar

**Résumé.** Emprunter du cash tout de suite, rembourser plus cher, ou payer au foie.

**Règle**
- Disponible à tout moment de ton tour, depuis le panneau d'actions.
- Tu reçois **500 €** immédiatement. Tu dois **700 €** à la banque.
- Échéance : **5 tours individuels** (compteur `turnStep`, déjà présent dans l'état).
- Tu peux rembourser à tout moment, partiellement ou en totalité.
- À l'échéance, solde non remboursé → **12 gorgées de base** (écrêtées au plafond de 8, le
  reliquat tombe au tour suivant), dette effacée.
- **Un seul crédit actif à la fois.** Nouveau crédit interdit tant que l'ancien court.

**Cas limites**
- Faillite avec crédit en cours : la dette meurt avec la faillite, la sanction gorgées reste due.
- Fin de partie avant l'échéance : la dette est convertie en **−700 € au patrimoine final**
  pour le classement (pas de sanction gorgées).
- Déconnexion à l'échéance : l'hôte applique quand même, la sanction s'affiche au retour.

**Implémentation**
- `PlayerState.loan?: { principal: number; due: number; dueAtTurnStep: number }`
- `Intent`: `{ type: 'loanTake' }`, `{ type: 'loanRepay'; amount: number }`
- Échéance vérifiée dans `endTurn` (engine/turn.ts), au moment où `turnStep` s'incrémente.
- Fichiers : `engine/types.ts`, `engine/turn.ts`, `engine/constants.ts`, `net/protocol.ts`,
  `net/hostReducer.ts`, UI `MvActionBar.jsx` + badge dette dans `MvPlayerBar.jsx`.

**Soft & garde-fous.** Sanction convertie en mini-gages (1 pour deux gorgées, plafonné à 2 gages).
Le taux (700/500) doit rester dissuasif sans être un piège : afficher l'échéance en permanence,
avec compte à rebours en tours.

**Coût.** E+ — ~120 lignes moteur + UI.

---

## 1.2 — Salaire Indexé ⚠️

**Résumé.** Le passage Départ paie selon ce que tu bois.

**Règle**
- Passage Départ : **100 € + 50 € par gorgée bues supplémentaires**.
- **Plafond dur : 400 €** (soit 6 gorgées valorisées). Au-delà, plus rien.
- Possible à chaque passage Départ.
- Désactivé par défaut, activable en lobby, **jamais disponible en `facile`**.

**Cas limites**
- Joueur en mode soft : il touche le **plafond réduit forfaitaire de 200 €** (le salaire actuel),
  pour ne pas être pénalisé par son abstention.

**Implémentation**
- `PlayerState.sipsSinceStart?: number`, incrémenté partout où une sanction est appliquée.
- Lecture dans `resolveMovement` (engine/turn.ts, calcul de `salary`).
- `GameConfig.indexedSalary?: boolean`.

**Soft & garde-fous.** C'est **la mécanique la plus incitative du projet**. Trois verrous :
plafond 400 €, demi-valeur des gorgées volontaires, indisponible en `facile`. Le rappel
d'hydratation (`engine/moderation.ts`) doit se déclencher plus tôt quand elle est active.

**Coût.** E+ — ~60 lignes, mais **elle doit passer une revue de modération** avant d'être activée.

---

## 1.3 — Rachat de Dette

**Résumé.** Quelqu'un paie pour toi, tu le rembourses en gorgées, quand il l'exige.

**Règle**
- Déclenché quand un joueur ne peut pas payer (loyer, taxe) — là où le moteur appelle
  aujourd'hui `applyBankruptcy`.
- N'importe quel autre joueur peut proposer de couvrir le montant. Fenêtre : **15 secondes**.
- Si plusieurs volontaires : le **premier** message reçu par l'hôte gagne (idempotence déjà gérée).
- Le débiteur devient redevable de **1 gorgée par 25 € avancés**.
- Le créancier déclenche la dette **quand il veut**, par tranches de son choix, jusqu'à épuisement.
- Le débiteur ne peut pas refuser : accepter le rachat, c'est accepter la dette. Il peut refuser
  le rachat lui-même et tomber en faillite normalement.

**Cas limites**
- Créancier éliminé : ses créances sont **annulées** (pas d'héritage).
- Fin de partie : les gorgées non réclamées tombent à la vidange du pot (§ 6.6 de ce document).
- Débiteur en soft : mini-gages, même barème.

**Implémentation**
- `GameState.debts?: Array<{ id: string; debtorId: string; creditorId: string; sipsLeft: number }>`
- `Intent`: `{ type: 'debtCover'; debtorId: string }`, `{ type: 'debtClaim'; debtId: string; sips: number }`
- Le canal est **parallèle**, comme `engine/trade.ts` : il ne bloque jamais la machine à états.

**Coût.** E+ — ~150 lignes. Réutilise le pattern trade (TTL, offres, réactions).

---

## 1.4 — Caution en Gorgées

**Résumé.** Sortir de cuve sans argent.

**Règle**
- La sortie de prison coûte aujourd'hui `JAIL_BAIL = 50 €`. On ajoute l'option **3 gorgées**.
- Choix libre du joueur, à tout moment de son tour en prison, sans condition de solde.
- Cumulable avec les règles existantes : jeton « sortie de cuve », double aux dés.

**Cas limites**
- Joueur à 0 € : c'est précisément le cas d'usage. Plus jamais de blocage en cuve.
- Joueur en soft : 3 mini-gages.

**Implémentation**
- `JailAction` (net/protocol.ts) passe de `'bail' | 'double' | 'card'` à
  `'bail' | 'bailSips' | 'double' | 'card'`.
- `SpaceOutcome` `jail_out` : le champ `via` accepte `'bail_sips'`.
- Fichiers : `engine/jail.ts`, `net/protocol.ts`, `MvActionBar.jsx`.

**Coût.** D+ — ~30 lignes. La plus rentable du lot économique.

---

## 1.5 — Le Pourboire

**Résumé.** Acheter quelqu'un pour qu'il boive à ta place.

**Règle**
- Quand une sanction en gorgées te vise, tu proposes un montant **libre** à un joueur précis.
- Fenêtre de réponse : **20 secondes** (`TRADE_TTL_MS`, déjà défini).
- Il accepte → l'argent est transféré, **la sanction lui est transférée intégralement**.
- Il refuse ou ne répond pas → tu bois, l'argent reste chez toi.
- **Une seule proposition par sanction.** Pas d'enchère à la ronde, sinon le tour s'éternise.
- Interdit sur les sanctions collectives (tournée générale) : chacun assume la sienne.

**Cas limites**
- Cible en mode soft : elle peut accepter, elle exécute le mini-gage équivalent.
- Cible qui atteint le plafond de 8 gorgées/tour : elle **ne peut pas** accepter, le jeu bloque.
- Proposition alors que la partie se termine : annulée au buzzer.

**Implémentation**
- `GameState.tips?: Array<{ id: string; fromId: string; toId: string; amount: number; sips: number; expiresAt: number }>`
- `Intent`: `{ type: 'tipOffer'; toId: string; amount: number }`, `{ type: 'tipRespond'; tipId: string; accept: boolean }`
- Même moteur d'expiration que les trades (`now` injecté, déterministe).

**Coût.** E+ — ~120 lignes.

---

# 2. Le Marché Noir et les cartes — ✅ IMPLÉMENTÉ

Livré et testé. La spécification détaillée a quitté ce document : elle est
remplacée par la documentation de ce qui tourne réellement dans le code —
[marche-noir.md](./marche-noir.md).

Résumé de ce qui a changé par rapport à la spécification d'origine :

- les **jetons** sont devenus des **cartes** (une seule notion d'objet dans le jeu) ;
- chaque carte est payable **en argent OU en gorgées** (taux : 1 gorgée = 50 €) ;
- l'inventaire est plafonné à **3 cartes** par joueur ;
- le Marché Noir est une **case à part entière** du plateau (`kind: 'market'`),
  avec sa phase de repos `awaiting_market` et son propre panneau ;
- le stock (3 cartes) est **re-tiré à chaque visite et après chaque achat**.

# 3. Cartes

## 3.1 — Objectifs Secrets

**Règle**
- Chaque joueur tire **un objectif caché** au lancement, dans un deck dédié.
- Révélé et évalué **à la fin de la partie**.
- Réussi : **+500 €** au patrimoine final **et tu distribues 5 gorgées**.
- Raté : **tu bois 5 gorgées** (écrêtées au plafond, reliquat abandonné).
- Objectifs calibrés pour être atteignables sans être triviaux :
  - « Posséder 3 gares » · « Ne jamais aller en cuve » · « Faire boire 20 gorgées »
  - « Finir avec plus de propriétés que d'argent (en milliers) » · « Compléter un monopole
    avant le passage en `chaos` » · « Ne jamais payer plus de 200 € de loyer en une fois »
  - « Terminer avec exactement un hôtel » · « Avoir bu moins que tout le monde »
- L'objectif est **vérifiable par le moteur**, jamais par arbitrage humain.

**Implémentation**
- `content/objectives.ts` : `{ id, text, check: 'gares3' | 'noJail' | ... }` — le `check` est un
  **identifiant**, résolu par une table de fonctions dans `engine/objectives.ts` (le contenu reste
  data, la logique reste code).
- `PlayerState.objectiveId?: string`, tiré au setup (`engine/setup.ts`, PRNG seedé).
- Évaluation dans `engine/scoring.ts` (fichier déjà existant).

**Coût.** E+ — ~180 lignes, dont la table de vérificateurs.

---

## 3.2 — Malédiction Attachée

**Règle**
- Une carte Malédiction se **colle au joueur** au lieu de se résoudre immédiatement.
- Elle reste active jusqu'à ce qu'il **gagne un duel** contre un joueur de son choix — elle passe
  alors sur le perdant.
- Un duel de délivrance par tour maximum. Duel perdu → la malédiction reste, +1 gorgée.
- **Une seule malédiction par joueur.** Une nouvelle carte Malédiction tirée par un joueur déjà
  maudit part au joueur suivant dans l'ordre de jeu.
- Exemples : « tu bois 1 gorgée à chaque double de la table » · « tu paies 50 € à chaque fois
  qu'un joueur passe Départ » · « tu bois quand quelqu'un dit ton prénom ».
- Elle disparaît à la **fin de la partie** et compte **−300 €** au classement final si tu la portes
  encore : la refiler est un objectif réel.

**Implémentation**
- `PlayerState.curseId?: string`, `content/cards.ts` gagne `family: 'malediction'`.
- Le hook d'évaluation tourne dans `endTurn` (déclencheurs par événement).
- `Intent`: `{ type: 'curseDuel'; targetId: string }`.

**Coût.** E+ — ~140 lignes.

---

## 3.3 — Carte aux Enchères

**Règle**
- La carte est tirée **face cachée** et mise aux enchères avant lecture.
- Enchère ouverte à **tous les joueurs**, y compris celui qui a atterri sur la case.
- Durée : **20 secondes**, incrément minimum 50 € (`engine/auction.ts` fournit déjà tout).
- Le gagnant paie, **prend la carte et l'applique**, quoi qu'elle contienne.
- Si personne ne mise : la carte revient au joueur qui a atterri, appliquée normalement.
- **1 carte sur 4** part aux enchères (tirage seedé), pas toutes : la surprise doit rester rare.

**Cas limites**
- Le gagnant tire « tu vas en cuve » : il y va. C'est le sel de la mécanique.
- Le gagnant tire un jeton alors que son inventaire est plein : la carte est perdue, l'argent aussi.

**Implémentation**
- Réutilise `AuctionState` en ajoutant un champ `subject: { kind: 'space'; id } | { kind: 'card'; id }`.
- Phase `awaiting_auction` déjà existante : aucun nouvel état de repos.

**Coût.** E+ — ~90 lignes (la plus économique des cartes, l'enchère existe déjà).

---

## 3.4 — Vote de Table

**Règle**
- La carte propose **3 sanctions**. La table vote, le joueur visé **ne vote pas**.
- Durée du vote : **15 secondes**. Égalité → la sanction la plus douce l'emporte
  (arbitrage neutre, pas de tie-break par le hasard).
- Les abstentions ne comptent pas. Si personne ne vote : sanction la plus douce.
- Le vote est **public** une fois clos : on voit qui a voté quoi. La rancune est un moteur de jeu.
- Exemple de triplet : « cul sec » / « donne une propriété au plus pauvre » / « 3 tours sans parler ».

**Implémentation**
- `GameState.vote?: { cardId: string; targetId: string; options: string[]; ballots: Record<string, number>; endsAt: number }`
- Nouvelle phase de repos `awaiting_vote` (le tour attend le dépouillement).
- `Intent`: `{ type: 'voteCast'; option: number }`.

**Coût.** E+ — ~130 lignes.

---

## 3.5 — La Prime (nouveau — « récompense pour celui qui attaque un joueur ciblé »)

**Résumé.** Un joueur est mis à prix. Le frapper rapporte. Le leader ne dort plus.

**Règle**
- **Mise à prix automatique** : à chaque montée d'intensité, le joueur en tête au patrimoine
  reçoit une **Prime de 300 €** sur sa tête. Elle est publique, affichée au HUD.
- **Mise à prix volontaire** : n'importe quel joueur peut ajouter de l'argent sur la tête d'un autre,
  minimum 100 €, à tout moment. Le pot cumule.
- **Encaisser la prime** — trois façons, chacune paie **la totalité du pot** :
  1. Lui faire payer un loyer supérieur à 200 € ;
  2. Gagner un duel contre lui (carte duel, collision, malédiction) ;
  3. Lui faire boire 4 gorgées ou plus en une seule action.
- Une fois encaissée, la prime tombe à zéro et **ne peut pas être remise sur le même joueur
  avant un tour de table complet** (anti-acharnement).
- La cible **voit** sa prime et peut la **racheter** : payer le pot à la banque pour l'annuler.
  Prix du rachat : **le pot + 50 %**. Il faut vraiment vouloir la paix.

**Pourquoi.** C'est le correctif anti-runaway le plus direct du catalogue : dans le Monopoly,
quand quelqu'un décroche, plus personne n'a de raison mécanique de l'attaquer en priorité.
Là, la table a un intérêt chiffré à taper le leader — sans coalition à négocier, sans discours.

**Cas limites**
- Deux joueurs remplissent une condition sur le même tour : le premier reçu par l'hôte encaisse.
- Cible éliminée : la prime est reversée à parts égales à ceux qui l'avaient financée.
- Prime volontaire sur soi-même : interdit (sinon exploit de blanchiment).

**Implémentation**
- `GameState.bounties?: Record<string, { pot: number; contributors: Record<string, number>; lockedUntilTurnStep: number }>`
- Vérification des conditions dans `resolveLanding` (loyer) et dans les résolutions de duel.
- Attribution automatique par l'hôte, jamais réclamée par un client.
- `Intent`: `{ type: 'bountyAdd'; targetId: string; amount: number }`, `{ type: 'bountyBuyout' }`.

**Coût.** E+ — ~180 lignes. **Impact fort, à mettre en lot prioritaire.**

---

# 4. Dés

## 4.1 — Doubles = Tournée

**Règle**
- Option de lobby. Faire un double **ne fait plus rejouer** : toute la table boit **1 gorgée**.
- Le triple double n'existe plus (plus de série) : la règle prison par triple double est
  remplacée par § 4.3.
- Effet de bord voulu : les tours raccourcissent, plus de joueur qui enchaîne 4 lancers.

**Implémentation**
- `GameConfig.doublesMode?: 'replay' | 'round'` — défaut `'replay'` (comportement actuel).
- Modification isolée dans `takeTurn` (engine/turn.ts) : ne pas poser `rollAgain`.
- **Attention** : le rapport d'équité d'ordre (`mv:sim:order`) doit être **rejoué** ; supprimer
  le rejoue change l'avantage du premier joueur.

**Coût.** D+ — ~25 lignes moteur, mais **une simulation d'équilibrage à relancer**.

---

## 4.2 — Dé Maudit

**Règle**
- Le dé des gorgées (piment.md § 1.1) est optionnel en `warmup` et `party`.
- Au passage en **`chaos`**, il devient **obligatoire pour tous**, sans possibilité de désactivation.
- Annoncé par un événement plein écran au moment de la bascule.
- En `finale`, la face « cul sec » du dé est remplacée par « cul sec + tournée ».

**Implémentation**
- Lecture de `state.partyIntensity` dans `rollDice` (engine/rng.ts) — ou plutôt dans l'appelant,
  pour garder `rng.ts` pur.
- Aucun nouveau champ d'état : dérivé de l'intensité, déjà autoritative.

**Coût.** E+ — ~40 lignes, dépend du dé des gorgées.

---

## 4.3 — Triple Double = Tournée Générale

**Règle**
- Le 3ᵉ double consécutif t'envoie en cuve (**comportement actuel conservé**) **et** fait boire
  **2 gorgées à toute la table**, toi compris.
- Compatible avec § 4.1 : si `doublesMode = 'round'`, cette règle est sans objet.

**Implémentation**
- `engine/turn.ts`, branche « 3e double consécutif » déjà présente : ajouter les gorgées à
  l'outcome (`{ kind: 'go_jail' }` gagne un champ `tableSips?: number`).

**Coût.** D — ~10 lignes. Le meilleur rapport effet/effort de tout le document.

---

# 5. Mini-jeux

Socle commun : nouvelle phase `awaiting_minigame`, l'hôte fait autorité sur l'ordre d'arrivée
(les intentions portent déjà `createdAt` et une séquence monotone). Un joueur déconnecté est
**exclu du mini-jeu sans sanction**, jamais bloquant. Timeout global : **60 secondes**, après
quoi le mini-jeu s'annule sans effet.

## 5.1 — Chrono Bière

**Règle**
- Déclenché **une fois par partie**, au passage en `chaos`, ou par carte dédiée.
- Tous les joueurs finissent leur verre et valident sur leur téléphone.
- Le **premier** choisit sa récompense : **500 €**, ou **une propriété libre au choix**, ou
  **un jeton d'immunité**.
- Le **dernier** exécute un gage tiré du deck `defi`.
- Ceux qui ne valident pas dans les 60 s sont considérés comme non-participants : ni récompense,
  ni sanction.
- **Aucun joueur en mode soft n'est exclu** : il valide quand il a fini son soft, à égalité de règles.

**Implémentation**
- `GameState.minigame?: { kind: 'chrono'; startedAt: number; finishers: string[]; endsAt: number }`
- `Intent`: `{ type: 'minigameDone' }`, `{ type: 'minigameReward'; choice: 'cash' | 'property' | 'token'; spaceId?: string }`

**Coût.** E++ — ~200 lignes avec la phase et l'UI plein écran.

## 5.2 — Tap-Race

**Règle**
- « GO » après un délai **aléatoire entre 2 et 6 secondes** (PRNG seedé, identique pour tous).
- Premier à taper : **+200 €**. Faux départ (tap avant le GO) : **2 gorgées** et exclusion de la manche.
- Départage : horodatage d'arrivée chez l'hôte. En cas d'égalité stricte, le plus bas `seat` gagne.
- La latence réseau est acceptée telle quelle : c'est un jeu de soirée, pas un e-sport — mais
  **l'écart de latence doit être affiché** si supérieur à 150 ms, pour la transparence.

**Coût.** E++ — ~120 lignes une fois le socle mini-jeu posé.

## 5.3 — Duel de Loyer

**Règle**
- À l'annonce d'un loyer, le débiteur peut **le jouer** au lieu de le payer.
- Pierre-feuille-ciseaux, **une seule manche**, les deux choisissent en secret, révélation simultanée.
- Débiteur gagne → **loyer annulé** (argent et gorgée).
- Débiteur perd → **loyer doublé** (argent et gorgée).
- Égalité → rejouer, maximum 3 fois, ensuite le loyer est payé normalement.
- **Le propriétaire ne peut pas refuser le duel** : c'est le prix de la propriété.
- Limite : **un duel par tour et par joueur**, sinon plus personne ne paie jamais un loyer.
- Le loyer doublé respecte le plafond de gorgées, mais **pas** de plafond sur l'argent.

**Pourquoi.** C'est la mécanique qui transforme l'acte le plus fréquent et le plus ennuyeux du
Monopoly — payer un loyer — en moment de table. Fréquence élevée, coût faible.

**Implémentation**
- Nouvelle phase `awaiting_duel` (ou un canal parallèle si l'on veut ne pas bloquer le tour).
- `GameState.duel?: { kind: 'rent'; challengerId: string; ownerId: string; amount: number; sips: number; picks: Record<string, 'pierre'|'feuille'|'ciseaux'>; endsAt: number }`
- `Intent`: `{ type: 'duelChallenge' }`, `{ type: 'duelPick'; pick: string }`

**Coût.** E+ — ~160 lignes. **Priorité 1 du document.**

## 5.4 — Le Mur

**Règle**
- Défi collectif : citer **15 boissons différentes en 60 secondes**, à l'oral, un joueur valide
  chaque proposition sur son téléphone (compteur partagé, n'importe qui peut incrémenter).
- Réussi → **personne ne boit** et la banque verse **100 € à chacun**.
- Raté → **tournée générale** (1 gorgée pour tous).
- Une répétition annule un point (arbitrage table).
- Déclenché par carte, maximum deux fois par partie.

**Pourquoi.** Le seul moment purement coopératif du jeu. Après 40 minutes de trahisons, ça
change l'air de la pièce.

**Coût.** E+ — ~110 lignes.

## 5.5 — Roulette de Shots ⚠️

**Règle**
- Le jeu tire **1 joueur sur les 6** (PRNG seedé) : il prend un shot.
- **Verrouillages cumulatifs** : difficulté `hardcore` uniquement + opt-in explicite en lobby +
  confirmation de la table au déclenchement + **une seule fois par partie**.
- Tout joueur en mode soft est retiré du tirage, sans discussion et sans pénalité.
- Un joueur peut se retirer du tirage à tout moment, sans justification, sans sanction —
  et le jeu le propose explicitement dans l'écran de confirmation.

**Position.** C'est la mécanique la plus sensible du catalogue. À implémenter en dernier, ou pas
du tout. Elle n'apporte rien qu'un duel n'apporte déjà, et elle porte tout le risque produit.

**Coût.** E+ — ~80 lignes. Coût technique faible, coût de responsabilité élevé.

---

# 6. Rôles asymétriques

## 6.1 — Socle

- Chaque joueur choisit un rôle **avant le lancement**, dans le lobby.
- **Un rôle unique par table** : premier arrivé, premier servi (le lobby verrouille en direct).
- Un rôle = **un pouvoir, une contrainte, une fréquence**. Jamais un pouvoir sans coût.
- Les pouvoirs à fréquence (« une fois par tour de table ») se rechargent quand `turn` s'incrémente.
- Rôles **désactivables globalement** en lobby : le jeu doit rester jouable sans eux.
- `PlayerSetup.roleId?: string` (le champ existe déjà pour `pawn`, même modèle).
- `content/roles.ts`, data-driven, validé Zod, sur le modèle de `content/rules.ts`.

## 6.2 — Roster complet (10 rôles)

| Rôle | Pouvoir | Contrainte | Fréquence |
|---|---|---|---|
| **Le Barman** | Convertit gorgées ↔ argent à **60 €** au lieu de 50 € | Ne peut jamais refuser une conversion demandée par un autre joueur | Permanent |
| **Le Videur** | Immunise un joueur (ou lui) contre les gorgées jusqu'à son prochain tour | Ne peut pas s'immuniser deux fois de suite | 1× / tour de table |
| **Le Dealer** ⚠️ | Distribue 1 shot à qui il veut | Boit 1 gorgée à chaque shot distribué · `hardcore` uniquement | 1× / tour de table |
| **Le Prêtre** | Absout une sanction, la sienne ou celle d'un autre | Une seule fois dans la partie, irrévocable | 1× / partie |
| **Le Comptable** | Voit le cash exact de tous | Son propre cash est public en permanence | Permanent |
| **L'Ivrogne** ⚠️ | Démarre à **+500 €** | Démarre à **10 d'ivresse** · indisponible en mode soft | Permanent |
| **Le Sobre** | **Immunisé à toutes les gorgées** | **−30 %** sur tous ses revenus (salaire, loyers, primes) | Permanent |
| **Le Voleur** | Vole 1 jeton **ou** 1 gorgée non bue | S'il vole un joueur qui n'a rien, il boit 2 gorgées | 1× / tour de table |
| **Le DJ** | Choisit la règle temporaire activée à chaque montée d'intensité | Ne peut jamais choisir une règle qui l'exempte | À chaque montée |
| **Le Patron** | Touche **10 %** de tout versement à la cagnotte Bar Ouvert | Ne peut jamais encaisser la cagnotte lui-même | Permanent |

## 6.3 — Les trois rôles que tu as retenus, en détail

**Le Dealer** ⚠️
- 1 shot par tour de table, cible libre, annoncé publiquement.
- **Contrepartie obligatoire** : il boit 1 gorgée à chaque shot distribué. Sans ça, c'est un
  rôle sans risque qui casse l'équilibre social de la table.
- `hardcore` uniquement, opt-in en lobby. Un joueur en soft ne peut pas être ciblé.
- Plafond : 4 shots maximum sur toute la partie, quelle que soit la durée.

**Le Sobre**
- Immunisé à **toutes** les gorgées, y compris tournées générales et jetons.
- **−30 %** sur salaire de tour, loyers perçus, primes, gains de mini-jeux.
- Il reste pleinement joueur : il peut distribuer des gorgées, acheter des jetons, attaquer.
- **Intention produit** : ce rôle rend le mode soft *désirable*. Aujourd'hui, le soft est une
  concession ; là, c'est un choix stratégique que quelqu'un prend volontairement. C'est le
  meilleur outil de responsabilité du document, déguisé en mécanique de jeu.

**Le Patron**
- Possède la case Bar Ouvert : **10 %** de tout ce qui entre dans la cagnotte (taxes, cautions,
  amendes) lui est versé immédiatement.
- Il **ne peut pas encaisser la cagnotte** en atterrissant dessus : elle passe au joueur suivant
  qui y atterrit. Sinon le rôle cumule les deux revenus et devient dominant.
- Revenu passif visible de tous → il devient une cible naturelle pour la Prime (§ 3.5).

---

# 7. Mutations de plateau

## 7.1 — Cases qui Brûlent

**Règle**
- Actif **à partir de la `finale`** uniquement.
- À chaque tour de table, **le dernier au classement** choisit une case à brûler.
- Une case brûlée : **aucun effet**. Pas de loyer, pas d'achat, pas de carte, pas de taxe.
  Son propriétaire ne touche plus rien, mais **la garde** (elle compte au patrimoine final).
- Interdits : les 4 coins (Départ, cuve, Bar Ouvert, Au Poste) — sinon le plateau devient injouable.
- Maximum **6 cases brûlées** simultanément.
- Une case brûlée le reste jusqu'à la fin.

**Cas limites**
- Égalité au dernier rang : le choix revient au joueur ayant le moins d'argent liquide.
- Dernier déconnecté : le jeu brûle une case au hasard parmi les plus chères.

**Implémentation**
- `GameState.burned?: string[]`, testé en tête de `resolveLanding` (engine/turn.ts).
- `Intent`: `{ type: 'burnSpace'; spaceId: string }`, validée par l'hôte (l'émetteur doit être dernier).

**Coût.** E++ — ~120 lignes, plus le travail visuel 3D (case éteinte / calcinée).

## 7.2 — Plateau Rotatif

**Règle**
- À chaque montée d'intensité, les **groupes de couleur permutent** leurs emplacements sur le plateau.
- Les **propriétés restent à leurs propriétaires** : c'est la géographie qui change, pas la propriété.
- Les bâtiments suivent leur propriété.
- Les 4 coins, gares et services **ne bougent jamais** (points de repère indispensables).
- Permutation **seedée** : rejouable à l'identique, et annoncée 1 tour à l'avance.

**Cas limites**
- Un joueur sur une case déplacée reste sur **la case**, pas sur la position : il voyage avec elle.
- Les monopoles restent valides (ils dépendent du groupe, pas de la position).

**Implémentation**
- `GameState.spaceOrder?: number[]` — permutation appliquée à la lecture du plateau.
  **Ne jamais muter `soireeBoard`** : c'est une constante de contenu partagée.
- Toutes les lectures passent par un accesseur `spaceAt(state, board, index)`.

**Coût.** E++ — ~150 lignes, plus une passe sur **toutes** les lectures de plateau. Risque de
régression élevé : à faire après une couverture de tests solide.

## 7.3 — Inondation de Punch

**Règle**
- Déclenchée par carte : **4 cases consécutives** (tirées au sort) sont neutralisées **2 minutes**.
- Neutralisé = aucun loyer, aucun achat, aucun effet — même règle que « brûlé », mais temporaire.
- Affichage d'un compte à rebours sur le plateau.
- Ne peut pas toucher les 4 coins.

**Implémentation**
- Réutilise l'infrastructure des règles temporaires (`ActiveRule`, `duration: { kind: 'minutes' }`)
  avec un nouveau `scope: 'spaces'` et une liste de cases.

**Coût.** E+ — ~80 lignes si `burned` (§ 7.1) existe déjà.

## 7.4 — Collision

**Règle**
- Deux pions terminent sur la même case → **duel obligatoire** (pierre-feuille-ciseaux).
- Perdant : **2 gorgées** et **recule de 3 cases** (sans résoudre la case d'arrivée — un recul
  n'est pas un atterrissage, sinon on chaîne les effets à l'infini).
- La case Départ, la cuve et Bar Ouvert sont exemptées (on s'y entasse sans conflit).
- À 3 joueurs ou plus sur la même case : duel en chaîne, du dernier arrivé au premier.

**Implémentation**
- Détection en fin de `resolveMovement`, réutilise le moteur de duel de § 5.3.

**Coût.** E+ — ~70 lignes une fois le duel implémenté.

## 7.5 — Cases Jumelles

**Règle**
- **2 paires** de cases liées sur le plateau, marquées visuellement (même symbole).
- Atterrir sur l'une → téléportation **immédiate** sur l'autre, puis **résolution normale** de
  la case d'arrivée (loyer, achat, carte : tout s'applique).
- Une seule téléportation par tour : pas de rebond si l'arrivée est elle-même une jumelle.
- Ne fait **pas** passer par la case Départ : pas de salaire.
- Les paires sont **fixes** et connues dès le début : c'est de l'information, donc de la stratégie.

**Implémentation**
- `content/schema.ts` : les cases gagnent `twinId?: string`.
- Traitement dans `resolveMovement`, avant `resolveLanding`.

**Coût.** E+ — ~60 lignes.

## 7.6 — Le Chemin Annexe (raccourci contre gorgées) ⭐

**Résumé.** Une bretelle qui contourne une portion du plateau. Le péage se paie au foie.

**Règle**
- **Deux bretelles** sur le plateau, chacune reliant deux cases distantes de **6 cases**
  (proposition : entre la case 5 et la case 11, et entre la case 25 et la case 31 — les deux
  portions les plus chères à traverser).
- Quand ton déplacement te fait **passer par l'entrée** d'une bretelle, le jeu te propose un
  choix, avant de continuer : **route normale** ou **raccourci**.
- Prendre le raccourci : tu arrives directement à la sortie et **tu bois 3 gorgées**.
- Le raccourci **ne fait pas** passer par Départ : pas de salaire, même si la portion sautée
  contient la case Départ.
- **Escalade anti-abus** : deux raccourcis consécutifs pris par le même joueur → le second
  coûte **un cul sec** au lieu de 3 gorgées. Le compteur retombe dès qu'il prend la route normale.
- **Fermeture** : les bretelles sont **fermées en `warmup`**. Elles s'ouvrent au passage en
  `party` et le jeu l'annonce. En `finale`, le péage tombe à **1 gorgée** : tout le monde s'y
  engouffre, la partie accélère.

**Pourquoi.** Le plateau du Monopoly est un anneau parfait : tout le monde parcourt exactement
la même distance. Le chemin annexe est la première mécanique qui donne un **choix de trajet** —
et donc une vraie décision géographique : éviter l'hôtel qui t'attend, ou payer au foie.

**Cas limites**
- Ton déplacement s'arrête **pile** sur l'entrée : le choix est proposé, tu peux prendre la
  bretelle au tour suivant depuis cette position.
- Joueur en soft : 3 mini-gages, mêmes règles d'escalade.
- Déconnexion pendant le choix : le timer de tour tranche pour la **route normale**
  (jamais une sanction par défaut).
- Interaction avec Cases Jumelles (§ 7.5) : si la sortie est une jumelle, la téléportation
  **ne se déclenche pas** — un raccourci ne peut pas en chaîner un autre.

**Implémentation**
- `content/schema.ts` : nouvelle case `{ kind: 'fork', id, name, exitIndex: number, sips: number }`,
  ou un champ `fork?: { exitIndex, sips }` sur une case action existante.
- Nouvelle phase de repos **`awaiting_fork`** (calquée sur `awaiting_purchase` — le moteur attend
  une intention, le timer de tour tranche en cas de silence).
- Nouveau `SpaceOutcome` : `{ kind: 'fork_offer'; name: string; skip: number; sips: number }`.
- `Intent`: `{ type: 'fork'; take: boolean }`.
- `PlayerState.forkStreak?: number` pour l'escalade.
- Le déplacement se fait en deux temps dans `resolveMovement` : avancer jusqu'à l'entrée,
  suspendre, puis reprendre le reliquat de mouvement après le choix. **C'est le vrai coût** :
  aujourd'hui le mouvement est atomique (`position + roll.total`), il faut le rendre interruptible.
- Visuel 3D : la bretelle doit être **physiquement visible** sur le plateau, sinon la mécanique
  n'existe pas pour les joueurs.

**Coût.** E++ — ~220 lignes, dont la refonte du mouvement en deux étapes. C'est la mécanique
la plus structurante du document, et celle qui change le plus la sensation de jeu.

---

# 8. Modes de partie

## 8.1 — Blitz 15 min

- Plateau de **20 cases** (nouveau `BoardTheme`, aucun code moteur : `BOARD_SIZE` doit
  simplement devenir dérivé de `board.spaces.length` au lieu d'être une constante).
- Salaire de tour **×2** (400 €), départ à 1000 €.
- Intensité forcée à **`party`** dès le lancement.
- **Pas d'hypothèque, pas d'enchère** : on coupe tout ce qui ralentit.
- Timer de tour à **20 s** par défaut.
- **Attention** : `BOARD_SIZE = 40` est aujourd'hui une constante utilisée dans les calculs de
  déplacement. C'est le seul vrai travail du mode.

**Coût.** E+ — ~80 lignes + un thème de plateau.

## 8.2 — Équipes 2v2

- Argent **et** gorgées **mutualisés** par équipe.
- Tu peux **boire à la place de ton binôme**, sans limite autre que le plafond par tour.
- Les propriétés comptent **ensemble** pour les monopoles : `groupComplete` teste l'équipe,
  plus le joueur.
- Loyers **gratuits** entre coéquipiers.
- Victoire : patrimoine cumulé de l'équipe.
- Ordre de jeu : alterné strictement (A1, B1, A2, B2) pour éviter les tours d'équipe consécutifs.

**Cas limites.** Un coéquipier en faillite : l'équipe continue, l'autre porte tout.
Un coéquipier déconnecté : son binôme peut jouer ses tours (délégation explicite).

**Coût.** E++ — ~250 lignes. `groupComplete`, `computeRent`, `scoring.ts` et l'ordre de jeu
sont tous touchés.

## 8.3 — Battle Royale

- **Une case devient interdite à chaque tour de table**, tirée au sort parmi les cases libres
  (jamais possédée, jamais un coin).
- Atterrir sur une case interdite : **cul sec + 200 €** à la banque.
- Le plateau se referme : au bout de 20 tours de table, il ne reste qu'un tiers du plateau.
- Fin garantie en **moins de 45 minutes**.

**Implémentation.** Réutilise `GameState.burned` (§ 7.1) avec une sémantique « interdite »
au lieu de « neutralisée ».

**Coût.** E++ — ~130 lignes.

## 8.4 — Coop contre la Banque

- Une **IA** joue un adversaire commun : elle achète **systématiquement** toute propriété libre
  sur laquelle elle atterrit, construit dès qu'elle a un monopole, et ne négocie jamais.
- Elle ne boit pas, ne subit aucun gage.
- Les joueurs **gagnent ensemble** s'ils la ruinent, **perdent ensemble** si elle atteint
  5000 € de patrimoine.
- Les joueurs peuvent s'échanger des propriétés librement, sans restriction.
- L'IA existe déjà partiellement : `net/autoplay.js` résout les tours des déconnectés.
  Il faut une **politique d'achat agressive**, pas une IA sophistiquée.

**Coût.** E++ — ~200 lignes. Mode entièrement différent, mais réutilise l'autoplay existant.

## 8.5 — Roulette de Règles

- **Une règle temporaire aléatoire** s'active à chaque tour de table, sans attendre une carte.
- Tirage seedé dans `content/rules.ts`, en respectant `stackingPolicy`.
- Maximum **3 règles actives** simultanément ; la plus ancienne saute.
- Annonce plein écran à chaque activation.

**Coût.** D — ~40 lignes. Toute l'infrastructure existe (Phase 8). Le meilleur ratio du chapitre.

## 8.6 — Sans Argent ⚠️

- **Aucun cash.** Loyers, achats, taxes, tout se paie en gorgées au taux **100 € = 1 gorgée**.
- Achat d'une propriété à 200 € = 2 gorgées. Le Grand Cru = 4 gorgées.
- Plafond par tour **abaissé à 5 gorgées** dans ce mode (au lieu de 8).
- Durée **limitée à 30 minutes** maximum, non modifiable.
- Opt-in explicite, `facile` interdit, écran d'avertissement.

**Position.** C'est le mode le plus extrême du catalogue. Il fonctionne, il est très pur, et il
est le plus risqué en termes de consommation. À implémenter **après** les plafonds globaux, jamais
avant. Personnellement, je le sortirais en dernier, avec un plafond encore plus bas.

**Coût.** E+ — ~120 lignes (surtout des conversions), mais une revue de responsabilité obligatoire.

## 8.7 — Mode Découverte

- **Zéro alcool.** Toutes les sanctions passent par `engine/soft.ts` : mini-gages uniquement.
- Exactement le même jeu, les mêmes règles, les mêmes chiffres.
- Pas de portail d'âge, pas d'avertissement, jouable partout.

**Pourquoi.** Trois usages réels : tester l'équilibrage à froid, jouer au bureau ou en famille,
et permettre à une table mixte de jouer sans que personne ne se sente à part.

**Coût.** D — ~30 lignes. Le mode soft par joueur existe déjà : il s'agit de le forcer pour tous
et de masquer les mentions d'alcool.

---

# 9. Méta & personnalisation

## 9.1 — Éditeur de Cartes ⚠️

**Règle**
- Le groupe écrit ses propres cartes : texte, famille, gorgées de base, variante soft **obligatoire**.
- Deck partagé par **lien** (le deep-link existe déjà, `pwa/deepLink.js`).
- **Veto de table** : toute carte personnalisée peut être rejetée à la majorité au moment où
  elle sort. Elle est alors retirée du deck pour la partie.
- **Signalement** : un bouton sur chaque carte personnalisée, qui la désactive immédiatement
  pour la table.
- Validation à l'écriture : longueur, `softVariant` obligatoire, filtre de mots interdits.
- Un deck personnalisé est **marqué comme tel** dans l'UI : les joueurs savent que le contenu
  ne vient pas du jeu.

**Position.** C'est du contenu généré par les utilisateurs. Techniquement simple (le schéma Zod
existe), mais ça crée une **responsabilité de modération** réelle dès qu'un lien circule hors du
groupe. À ne pas sortir sans le veto et le signalement.

**Coût.** E+ — ~200 lignes avec l'éditeur et le partage.

## 9.2 — Plateau Perso

- Les 40 cases prennent les noms choisis par le groupe (bars, lieux, blagues internes).
- L'hôte édite, le thème est partagé avec la partie.
- **Coût moteur nul** : `BoardTheme` est déjà entièrement data-driven et validé par Zod.
  Seuls les noms changent, les prix et les groupes restent ceux du plateau d'origine
  (sinon il faut re-équilibrer).
- Sauvegardé dans le profil (§ 9.4) pour être réutilisé chaque soirée.

**Coût.** D — ~100 lignes d'UI, zéro moteur.

## 9.3 — Photos des Joueurs

- Avatar photo à l'entrée dans le lobby (caméra ou galerie).
- Apparaît sur : le pion 3D, la carte de joueur, les propriétés possédées, les annonces de loyer.
- **Traitement local** : redimensionnement côté client, stockage en base64 dans l'état de partie
  — pas d'upload serveur, pas de stockage persistant, pas de question RGPD à traiter.
- Limite stricte de taille (ex. 64×64) pour ne pas gonfler les snapshots réseau.

**Attention.** Les snapshots transitent et sont persistés dans Supabase (`mv_snapshots`).
Si les photos y entrent, ce sont **des données personnelles en base**. Deux options : les garder
hors snapshot (échange direct entre clients, éphémère), ou assumer et documenter la rétention.
**Je recommande le hors-snapshot.**

**Coût.** E+ — ~150 lignes, plus une décision produit sur la rétention.

## 9.4 — Profil Persistant

- Stats cumulées sur toutes les soirées : parties jouées, victoires, gorgées bues, gorgées
  distribuées, titres obtenus, taux de trahison (alliances rompues / alliances signées).
- **Stockage local d'abord** (`localStorage`) : aucun compte, aucune inscription, zéro friction.
- Synchronisation Supabase **optionnelle**, uniquement si le joueur la demande.
- Écran de profil accessible depuis l'accueil, avec l'historique des dernières soirées.
- Les stats alimentent les **succès** et le mode **Revanche**.

**Attention.** Cumuler une consommation d'alcool dans un profil persistant, c'est de la donnée
de santé au sens large. Trois règles : local par défaut, effacement en un clic, et **aucun
classement public** de gorgées bues. Un classement de « qui boit le plus » entre soirées serait
une incitation directe — les titres de fin de partie (§ K4) suffisent, ils restent dans la soirée.

**Coût.** E+ — ~180 lignes.

---

# 10. Ordre d'implémentation conseillé

| Lot | Contenu | Coût cumulé | Pourquoi en premier |
|---|---|---|---|
| **1 — Fondations** | Plafond global de gorgées · Triple double = tournée (4.3) · Caution en gorgées (1.4) · Roulette de règles (8.5) · Mode Découverte (8.7) · Plateau perso (9.2) | Faible (D / D+) | Effet immédiat, aucun risque, et le plafond est le prérequis de tout le reste |
| **2 — Le cœur du piment** | Duel de loyer (5.3) · La Prime (3.5) | Moyen (E+) | Ce sont les mécaniques qui changent le ressenti à chaque tour. Le Marché Noir et les cartes sont déjà livrés (§ 2) |
| **3 — Économie & rôles** | Crédit du bar (1.1) · Pourboire (1.5) · Rachat de dette (1.3) · Rôles (6) · Objectifs secrets (3.1) | Moyen (E+) | Profondeur stratégique, rejouabilité |
| **4 — Structure** | Chemin annexe (7.6) · Mini-jeux (5.1, 5.2, 5.4) · Cases jumelles (7.5) · Collision (7.4) · Blitz (8.1) | Élevé (E++) | Demandent un mouvement interruptible et une phase mini-jeu |
| **5 — Ambition** | Plateau rotatif (7.2) · Cases qui brûlent (7.1) · Équipes (8.2) · Battle Royale (8.3) · Coop vs Banque (8.4) | Très élevé (E++) | Risque de régression : à faire sur une base testée |
| **6 — Méta & sensible** | Profil (9.4) · Éditeur de cartes (9.1) · Photos (9.3) · Salaire indexé (1.2) · Sans argent (8.6) · Roulette de shots (5.5) | Variable | Chacune demande une décision produit ou une revue de responsabilité |

# 11. Décisions à prendre avant de coder

1. **Plafond de gorgées** : je propose 8 gorgées de base par joueur et par tour. À valider —
   tout le reste s'équilibre autour de ce chiffre. **Pas encore implémenté.**
3. **Duel de loyer** : bloque-t-il le tour (phase dédiée) ou tourne-t-il en canal parallèle ?
   Le canal parallèle est plus fluide mais plus complexe.
4. **Photos des joueurs** : dans les snapshots (simple, mais données personnelles en base) ou
   hors snapshot (propre, mais éphémère) ?
5. **Salaire indexé** : on le garde ou on le coupe ? C'est la seule mécanique du document qui
   récompense directement le fait de boire.
