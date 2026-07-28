# MonoVomy — roadmap

| Étape | Objectif | Statut |
|---|---|---|
| **0. Cadrage** | Design + base technique | ✅ En place |
| **1. Prototype local** | Valider le fun (hot-seat) | ✅ En place |
| **2. Temps réel** | Multijoueur | ✅ En place |
| **3. Contenu & équilibrage** | Rythme juste | ✅ En place |
| **4. Polish & responsabilité** | Qualité + sérieux | ✅ En place |
| **5. Boucle de partie complète** | Timer, ordre, prison, machine à états | ✅ En place |
| **6. Négociation & échanges** | Trades temps réel, canal parallèle | ✅ En place |
| **7. Directeur d’ambiance** | Intensité, règles temporaires, soft varié | ✅ En place |
| **8. Robustesse online** | Snapshots, reconnexion, migration d’hôte | ✅ En place |
| **9. Distribution** | Mise en ligne (PWA) | À faire |

## Étape 8 — livré (robustesse du multijoueur online)

Cœur **pur et testable** dans `net/session.ts` (aucun réseau requis pour les tests) :

- **Snapshots versionnés** (`Snapshot`) : état moteur complet + seed + `rngState`
  (compteur PRNG) + journal des intentions + versions protocole/contenu +
  timestamps + hôte + époque. Restaurables **sans divergence**.
- **Idempotence** : chaque intention porte `intentId/playerId/gameId/sequence/
  createdAt` ; l’hôte dédoublonne (intentId vu + séquence monotone). Un message
  reçu N fois n’est appliqué qu’une fois.
- **Migration d’hôte** : `electHost` déterministe (plus petit siège connecté) +
  `hostEpoch` monotone. Toute commande d’une époque antérieure est rejetée →
  **jamais deux hôtes simultanés**. La partie n’est pas annulée.
- **Reconnexion** : `resync` → l’hôte renvoie le snapshot ; le client restaure
  identité + mode soft + phase. UI : « Reconnexion… / Synchronisation… / Partie
  retrouvée / Déconnexion temporaire ». Un déconnecté conserve son patrimoine,
  n’est pas éliminé, et le timer auto-résout son tour (Phase 5).
- **Validation** : le client n’est jamais source de vérité — refus de lancer
  hors tour, achat sans fonds, action pour autrui (`spoofed_player`), protocole
  incompatible, snapshot ancien (ordre inversé géré par époque+version).
- **Persistance** (`net/snapshotStore.ts` + `docs/monovomy/supabase-schema.sql`) :
  tables `mv_rooms/mv_players/mv_snapshots/mv_event_log` + **RLS**, jamais de clé
  privée côté client. Recharger la page propose « Reprendre la partie ».
- **Tests** (`net/robustness.test.ts`, 16) : messages dupliqués/retardés/inversés,
  déconnexion pendant achat, reconnexion pendant carte, perte d’hôte, deux
  candidats, snapshot ancien, versions incompatibles, **déterminisme après
  reconnexion**.

## Étape 7 — livré (directeur d’ambiance & montée en intensité)

- **Intensité autoritative** (`engine/ambiance.ts`) : `partyIntensity`
  (warmup → party → chaos → finale) **stockée dans l’état**, recalculée par
  l’hôte (`computeIntensity`) puis diffusée — jamais une horloge locale non
  synchronisée. Score = temps + tours + écart de patrimoine + cartes jouées +
  difficulté. **Cliquet** : l’intensité monte, ne redescend pas.
- **Règles temporaires** (`content/rules.ts`, Zod) : `id/name/description/
  duration/scope/stackingPolicy/softVariant`, durées tour/table/minutes,
  cumul replace/stack/ignore, activation via carte RÈGLE (`ruleId`), expiration
  au tick. Affichées en permanence dans le **HUD**.
- **Tirage biaisé** : les cartes portent une `intensity` minimale ; le deck est
  pondéré par le niveau courant (cartes du niveau, finale, rattrapage favorisées).
- **Mode soft varié** (`engine/soft.ts`) : 6 catégories (mini-défi, action
  sociale, mime, vérité légère, pénalité symbolique, contrainte), **PRNG
  déterministe**, anti-répétition. Bouton **« Passer en soft » à tout moment**
  (retour alcool avec confirmation).
- **Modération** (`engine/moderation.ts`) : rappels hydratation / série de
  sanctions / passage Chaos / avant finale, jamais bloquants.
- **Contenu ajouté** : cartes de montée d’ambiance, rattrapage, collectives,
  finale, + 8 règles temporaires, variantes soft systématiques.
- **Tests** (`engine/phase8.test.ts`) : intensité (warmup→finale, déterminisme,
  cliquet), éligibilité cartes, règles (activation/cumul/expiration), soft
  (déterminisme/variété/anti-répétition), rappels, validation contenu.

### Non-régression Phase 5–7
Le tirage pondéré consomme le PRNG différemment ; le rapport d’équité d’ordre
(`mv:sim:order`, 3000 parties) reste sous le seuil serré. Déterminisme complet
du rejeu préservé (test Phase 5 vert).

## Étape 6 — livré (négociation & échanges)

- **Canal parallèle non bloquant** (`engine/trade.ts`) : les offres vivent dans
  `state.trades` et **n’altèrent jamais la machine à états du tour**. Une offre
  expire au bout de **20 s** (`TRADE_TTL_MS`) — la partie n’est jamais bloquée.
  Pur et sérialisable ; le temps entre par un `now` injecté (déterministe).
- **Structure** `TradeOffer { id, senderId, receiverId, offeredAssets,
  requestedAssets, status, createdAt, expiresAt }` · statuts `pending/accepted/
  declined/countered/expired/cancelled`. Actifs : **cash, propriétés, jetons de
  cuve et cartes du Marché Noir**. **Jamais de gorgées.**
- **Validation à l’acceptation** : les deux joueurs possèdent encore leurs actifs
  (cash, propriétés, cartes), sont actifs, l’offre n’est pas expirée. **Transfert
  atomique** tout-ou-rien. Idempotent : rejeu réseau ⇒ pas de double transfert.
- **Contre-propositions** (`counterOffer`) : l'offre reçue est renvoyée inversée
  et déjà pré-remplie. Les « réactions rapides » ont été **supprimées** (Phase 12) —
  cinq boutons de chat pour rien, au détriment de la lisibilité.
- **Estimation d’équilibre** informative (`estimateTrade` → avantageux / équilibré /
  risqué) qui **ne décide jamais** à la place du joueur.
- **UI mobile** (`components/MvTrade.jsx`) — **refondue en Phase 12**, un écran =
  une décision : `inbox` (offres reçues en grand : Accepter / Contre / Refuser),
  `who` (à qui ? un tap sur un joueur), `compose` (deux paniers, curseur d'argent,
  pastilles d'actifs, verdict en une phrase). Voir `negociation.md`.
- **Tests** (`engine/trade.test.ts`) : accepté, refusé, expiré, contre-proposition,
  actif vendu entre création et acceptation, joueur en faillite, double acceptation,
  rejeu du même message réseau (un seul transfert), conservation (zéro duplication),
  échange de cartes de marché (doublons compris) et plafond d'inventaire.

## Étape 5 — livré (boucle de partie complète)

- **Timer de partie** (`engine/clock.ts`) : timestamps **absolus partagés**
  (`startedAt/endsAt/remainingTime/turnEndsAt/endReason`), durées 30/60/90 min +
  durée libre (dev). Fin **automatique** au timer (`endReason='timer'`), classement
  final calculé. Survit à la reconnexion (endsAt absolu, jamais réinitialisé).
  Le moteur reste **pur** : le temps entre par un paramètre `now` injecté.
- **Ordre équitable** (`engine/order.ts`) : permutation via PRNG seedé +
  **compensation de départ** `+20€/rang` (configurable, désactivable). Sim dédiée
  `engine/sim/orderSim.ts` (`npm run mv:sim:order`) : sur 3000 parties/mode à 4 joueurs,
  l’écart de victoire par position passe de **11,1 % (fixe)** à **7,9 % (aléatoire)**
  et **6,5 % (aléatoire+compensation)**.
- **Prison réelle** (`engine/jail.ts`) : tours décomptés, sortie par **caution /
  double / carte** (`chance_sortie_cuve`, effet `jail_free` data-driven), **libération
  forcée** après 3 tours. Le joueur en cuve garde cash/biens ; mode soft → mini-gage.
- **Timer de tour** : `turnSeconds` 20/30/45/∞ + auto-résolution du joueur inactif
  (`net/autoplay.ts` : auto-lancer / refus d’achat / fin de tour) — personne ne bloque.
  Alerte visuelle sur les 5 dernières secondes.
- **Machine à états** (`engine/stateMachine.ts`) : phases formalisées + table
  `PHASE_INTENTS` + `validatePhaseIntent`. Toute intention hors-phase/hors-tour
  renvoie un **code d’erreur métier clair** (`wrong_phase`, `not_your_turn`,
  `game_over`, `no_jail_card`…) sans muter l’état.
- **Tests** (`engine/phase5.test.ts`, +40 au total) : expiration timer partie/tour,
  reconnexion, prison (caution/double/carte/forcée), fin auto, intentions invalides,
  **déterminisme complet du rejeu** (même seed + mêmes intentions + même horloge).

## Étape 1 — livré

- Moteur déterministe : `setup` (création + deck mélangé), `turn` (dé, déplacement,
  salaire, résolution de case : achat / loyer / taxe / carte / prison), `decideBuy`,
  `endTurn`, `endGame`, `scoring` (patrimoine net + classement).
- Calcul des gorgées : `base × multiplicateur du niveau` (loyer, taxe, carte).
- Mode soft géré par joueur (mini-gage à la place de la gorgée).
- UI jouable en hot-seat : lobby (difficulté, 3–8 joueurs, alcool/soft) → partie
  (dé, table des joueurs, achat/loyer/gorgées) → classement « Roi de MonoVomy ».
- Tests : `engine.test.ts` (déterminisme, dé, capital, cohérence) + `catalog.test.ts`.

## Limites assumées (Étape 1) → à traiter plus tard

- Pas de maisons/hôtels (loyer = loyer de base), pas d’échanges/négociation.
- Prison cosmétique (pas de tours passés).
- Faillite = paiement borné au cash + drapeau `bankrupt` ; les 3 presets complets
  (none / classic / last_hunt) seront implémentés en Étape 3.
- Fin de partie manuelle (bouton) ; le timer 30/60/90 min viendra plus tard.

## Étape 3 — livré

- **Contenu** : catalogue de 55 cartes réparties sur les 5 familles et les 4 niveaux,
  avec variantes soft. Test de couverture (familles, niveaux, unicité, persistance).
- **Faillite** : les 3 presets implémentés dans le moteur —
  `none` (relance à 300€ + grosse pénalité de gorgées), `classic` (élimination +
  libération des propriétés), `last_hunt` (pas d’élimination, sanction en fin de partie).
  Skip des joueurs éliminés + fin de partie au dernier survivant.
- **Équilibrage** : `engine/sim/massSim.ts` + rapport (`npm run mv:sim`). Sur 2000 parties :
  le preset classic se termine à 100 % par élimination, l’intensité de gorgées est
  monotone par niveau (facile → hardcore ≈ ×5), fairness du siège 0 ≈ 37 % (avantage
  premier joueur classique, sous le seuil de 55 %).
- UI : bannière de faillite (éliminé / relance / à sec) + marquage des éliminés au classement.

## Étape 4 — livré (polish & responsabilité)

- **Gate +18** au lancement + **onboarding « Comment jouer »** (première visite),
  mémorisés en localStorage.
- **Modales** Comment jouer / Mentions légales & confidentialité (RGPD) accessibles
  depuis la barre du haut ; **footer modération** permanent.
- **Sons** synthétisés (Web Audio, zéro asset) : lancer, case, gorgée, achat, victoire,
  avec **bouton mute** persistant.
- **Interactions plateau** : **tap sur une case** → détail (prix, loyers, gorgées,
  propriétaire), **zoom / pincer + déplacement** (boutons + gestes), **animation du dé**
  (tumble), pastille de possession sur les cases.
- **Rappels d’hydratation** périodiques + rappel modération partout.

## Plateau visuel — livré (2.5D CSS)

- Plateau incliné en perspective (grille 11×11, `boardLayout` testé), bandes de
  couleur par groupe, centre logo/tour.
- Pions stylisés « maison » (jetons néon à l’initiale) qui **avancent case par case**,
  pion actif animé.
- Carte qui **surgit devant l’écran** à chaque case (flip-in), colorée par famille,
  avec dé, gorgées, faillite et contrôles (acheter/passer/continuer).
- Rendu piloté par l’état synchronisé → marche en local ET en ligne sans toucher moteur/réseau.
- Upgrade possible vers la vraie 3D (React Three Fiber) en ne remplaçant que la couche plateau.

## À affiner plus tard

- Avantage du premier joueur (ordre de départ) — mitigeable via un capital compensatoire
  ou un ordre aléatoire par tour.
- Pacing des gorgées calé sur la durée réelle (30/60/90 min) plutôt qu’au nombre de tours.
- Maisons/hôtels et échanges (montent encore la profondeur économique).

## Prochaine étape (2) — temps réel

Rendre l’état autoritaire côté serveur (Colyseus ou Supabase), rooms + code de partie,
synchro et reconnexion, chat. Le moteur étant déjà pur et déterministe, il se transpose
directement en logique serveur.
