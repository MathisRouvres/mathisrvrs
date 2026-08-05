# MonoVomy — Plateau Vivant (catalogue d'idées)

> **Statut : exploration.** Rien de ce document n'est implémenté. C'est un catalogue
> d'idées pour rendre le plateau **mutant** : cases qui changent de nature, de prix,
> de camp, chemins qui s'ouvrent, raccourcis, boucles, plateau qui se déforme au fil
> de la soirée.

Le principe directeur : **le plateau doit raconter la montée d'ambiance**. À `warmup`
c'est un Monopoly sage. À `finale`, le plateau doit être méconnaissable — trous,
raccourcis, cases retournées, une voie rapide au milieu de la table.

---

## 0. Ce que le code permet aujourd'hui (état des lieux)

Avant les idées, les faits — ils décident du coût de chaque proposition.

| Fait | Fichier | Conséquence |
|---|---|---|
| Le plateau est une **constante statique** de 40 cases | [board.soiree.ts](../../src/features/monovomy/content/board.soiree.ts) | Aucune mutation possible sans nouvelle couche |
| Zod impose **exactement 40 cases** (`.length(40)`) | [schema.ts:65](../../src/features/monovomy/content/schema.ts#L65) | Un plateau à taille variable casse la validation |
| Le mouvement tient en **2 lignes**, un seul point de passage | [turn.ts:259-261](../../src/features/monovomy/engine/turn.ts#L259-L261) | 🟢 Excellente nouvelle : tout se greffe ici |
| `resolveLanding` fait un `switch` sur `space.kind` | [turn.ts:158](../../src/features/monovomy/engine/turn.ts#L158) | Nouveaux types de case = nouveaux `case:`, isolés |
| `INDEX_BY_ID` est construit **au chargement du module** | [boardCells.js:26](../../src/features/monovomy/components/board3d/boardCells.js#L26) | 🔴 À rendre dérivé de l'état si les cases bougent |
| La géométrie 3D est un **anneau 11×11 en dur** | [boardCells.js:7-17](../../src/features/monovomy/components/board3d/boardCells.js#L7-L17) | Tout chemin hors-anneau demande de la géométrie neuve |
| L'intensité monte par **cliquet** et est autoritative | [ambiance.ts:69](../../src/features/monovomy/engine/ambiance.ts#L69) | 🟢 Déclencheur idéal, déjà synchronisé |
| Les règles temporaires ont déjà durée + cumul + expiration | [ambiance.ts:113-146](../../src/features/monovomy/engine/ambiance.ts#L113-L146) | 🟢 Modèle à copier pour les mutations de plateau |
| Les champs récents sont **optionnels** (`market?`, `buildings?`) | [types.ts:183-195](../../src/features/monovomy/engine/types.ts#L183-L195) | Convention de rétrocompatibilité snapshot à suivre |

**Contraintes non négociables** (elles éliminent d'office les idées fantaisistes) :

1. **Déterminisme total.** Toute mutation aléatoire passe par le PRNG seedé et fait
   avancer `rngState`. Sinon le rejeu diverge et les tests Phase 5 tombent.
2. **Hôte autoritaire.** Une mutation n'est jamais décidée par un client.
3. **Snapshots rétrocompatibles.** Champs optionnels uniquement, jamais de renommage.
4. **Mobile-first.** Une mutation invisible sur iPhone 15 Plus n'existe pas.
5. **Lisible en 2 secondes.** Un joueur bourré doit comprendre le nouveau plateau
   sans lire de texte.

---

## 1. La colonne vertébrale technique (à faire avant toute idée)

Toutes les idées ci-dessous reposent sur **une seule abstraction**. La poser une fois,
proprement, rend les 50 idées suivantes triviales à ajouter.

### 1.1 `state.boardMutations` — les mutations vivent dans l'état

```ts
/** Mutation active du plateau (Phase 13 — optionnel, snapshots antérieurs valides). */
export interface BoardMutation {
  id: string                 // 'flood_orange', 'shortcut_bar'
  kind: BoardMutationKind    // retag | reprice | link | close | move | swap
  /** Cases visées (spaceId). */
  targets: string[]
  /** Charge utile typée par `kind` (ex. { to: 'depart' } pour un link). */
  payload: Record<string, unknown>
  activatedStep: number
  expiresAtStep: number      // -1 = permanent jusqu'à fin de partie
  expiresAt: number          // 0 = pas d'expiration horaire
  /** Source, pour le journal : 'card' | 'intensity' | 'player' | 'timer'. */
  source: string
}
```

À poser dans [types.ts](../../src/features/monovomy/engine/types.ts) en `boardMutations?: BoardMutation[]`,
exactement comme `activeRules`. Réutiliser la mécanique d'expiration d'`ambiance.ts`
(`activateRule` / `expireRules` / `ruleStepsLeft`) — elle est déjà testée.

### 1.2 `effectiveBoard(state, baseBoard)` — le plateau devient dérivé

Fonction **pure**, mémoïsée sur `(themeId, boardMutations)` :

```ts
export function effectiveBoard(state: GameState, base: BoardTheme): BoardTheme
```

Le moteur ne lit **plus jamais** `soireeBoard` directement : il lit `effectiveBoard(...)`.
Un seul point de vérité, testable isolément, zéro risque de divergence hôte/client.

> ⚠️ Zod `.length(40)` : garder le schéma strict pour le **contenu auteur**, et valider
> le plateau effectif avec `.min(40)` ou un schéma dérivé. Ne pas relâcher le schéma
> de base — c'est lui qui protège le catalogue.

### 1.3 `movementGraph` — le mouvement cesse d'être un modulo

Le vrai déblocage. Remplacer :

```ts
player.position = arrival % BOARD_SIZE
```

par un pas-à-pas sur un graphe :

```ts
/** Avance `n` pas depuis `from`. Renvoie le chemin complet (pour l'animation 3D). */
export function walk(graph: MovementGraph, from: number, n: number): number[]
```

Par défaut le graphe est l'anneau (`next(i) = (i+1) % 40`) → **comportement identique
à aujourd'hui, zéro régression**. Les mutations `link` ajoutent des arêtes. Le
franchissement du Départ devient « le chemin contient l'index 0 », plus « arrival ≥ 40 » —
plus robuste, et ça règle gratuitement le cas des raccourcis qui sautent le Départ.

**Décision de design à trancher** quand une case a plusieurs sorties : choix du joueur
(riche, mais une pause de plus par tour) ou priorité déterministe (fluide). Recommandation :
**priorité déterministe par défaut, choix du joueur seulement sur les cases « embranchement »
explicites**, pour ne pas alourdir chaque tour.

### 1.4 Géométrie 3D dérivée

`cellFor(i)` doit devenir `cellFor(i, layout)` où `layout` sort de l'état. Les cases
hors-anneau (voie centrale, étage, annexe) ont besoin de leurs propres coordonnées.
Le plus économe : garder l'anneau en dur et ne calculer que les **extensions**.

---

## 2. Cases qui changent de nature

*Coût indiqué : S = quelques heures · M = 1–2 jours · L = plus.*

| # | Idée | Ce qui se passe | Déclencheur | Coût |
|---|---|---|---|---|
| 1 | **Rachat de bar** | Une propriété se transforme en Marché Noir pour 3 tours. La case cesse de rapporter à son proprio. | Carte action | S |
| 2 | **Zone sinistrée** | Une case devient `parking` : ni loyer, ni achat, elle ne produit plus rien. Le proprio enrage. | Intensité `chaos` | S |
| 3 | **Taxe surprise** | La case Bar Ouvert (20) devient une taxe le temps d'un tour de table. La case « repos » n'en est plus une. | Carte règle | S |
| 4 | **Gare fantôme** | Une gare cesse de compter dans le décompte des gares — le loyer des 3 autres chute. | Carte | S |
| 5 | **Case piégée** | Un joueur pose secrètement un piège sur une case ; il se déclenche au prochain visiteur, puis disparaît. | Carte Marché Noir | M |
| 6 | **Contamination de groupe** | Une case contamine ses voisines de couleur : tout le groupe passe en `action` pendant 2 tours. | Intensité `finale` | M |
| 7 | **Case bascule** | Une case alterne mécaniquement entre deux natures à chaque tour de table (taxe ↔ bonus). Prévisible, donc jouable. | Permanent | S |
| 8 | **Cuve mobile** | La prison change d'index. Les cartes « Au Poste » envoient ailleurs, les habitudes des joueurs deviennent fausses. | Intensité `chaos` | M |
| 9 | **Départ déplacé** | Le Départ glisse de quelques cases. Le salaire tombe ailleurs, tout le tempo économique se décale. | Finale | L |
| 10 | **Case radioactive** | Une case inflige une gorgée à *tous* ceux qui la traversent, pas seulement à qui s'y arrête. | Carte | M |

**Note technique** : les idées 1–7 ne sont que du `retag` — une entrée dans
`boardMutations`, aucune modification du graphe. Ce sont les moins chères et les plus
rentables. 8–9 déplacent des ancres (`jailIndex()` est déjà une fonction — bonne
nouvelle, elle est déjà indirecte).

---

## 3. Cases qui changent de valeur

| # | Idée | Ce qui se passe | Coût |
|---|---|---|---|
| 11 | **Quartier qui monte** | Un groupe de couleur voit ses loyers ×2 pendant 3 tours de table. Signalé par une pulsation lumineuse du groupe. | S |
| 12 | **Krach** | Le groupe le plus rentable de la table perd 50 % de ses loyers. Rattrapage automatique du dernier. | S |
| 13 | **Soldes** | Toutes les propriétés non achetées passent à −40 % pendant un tour de table. Ruée assurée. | S |
| 14 | **Inflation de fin de soirée** | À `finale`, tous les prix et loyers ×1,5. La partie accélère mécaniquement. | S |
| 15 | **Case aux enchères permanente** | Une case donnée passe systématiquement en enchère, même si le joueur peut se l'offrir. | S |
| 16 | **Loyer indexé sur les gorgées** | Le loyer d'une case dépend du nombre de gorgées bues par le propriétaire. Boire rapporte. | M |
| 17 | **Case syndiquée** | Une case appartient à *deux* joueurs, le loyer se partage. Force la coopération. | M |
| 18 | **Case en grève** | Le proprio ne perçoit rien tant qu'il n'a pas bu / relevé un défi. | S |

---

## 4. Nouveaux chemins et topologie

**Le cœur de la demande.** Toutes ces idées supposent §1.3 (`movementGraph`) livré.

| # | Idée | Ce qui se passe | Coût |
|---|---|---|---|
| 19 | **Le Raccourci du Bar** | Une passerelle s'ouvre entre Bar Ouvert (20) et Départ (0). Traverser le plateau en diagonale. Le salaire est-il payé ? À trancher — proposition : non, c'est le prix de la vitesse. | M |
| 20 | **Le Tunnel des Chiottes** | Liaison courte entre deux cases opposées, à sens unique, utilisable une seule fois par joueur. | M |
| 21 | **La Boucle VIP** | Une petite boucle de 4 cases greffée sur un coin. On y entre sur un double, on en sort au tour suivant. Cases à très gros loyers. | L |
| 22 | **Voie rapide centrale** | Une ligne droite traverse le centre du plateau. 8 cases au lieu de 20, mais chacune est une sanction. Visuellement spectaculaire en 3D. | L |
| 23 | **Embranchement** | Une case propose deux sorties : le joueur choisit. Le seul endroit où l'on demande vraiment un choix de chemin. | M |
| 24 | **Case murée** | Une case est condamnée : impossible de s'y arrêter, on la saute. Le plateau raccourcit de 1. | M |
| 25 | **Sens inverse** | Le sens de circulation s'inverse pour un tour de table. Toute la stratégie de placement s'inverse avec. | S |
| 26 | **Sens inverse individuel** | Un seul joueur recule au lieu d'avancer, pendant 2 tours. Sanction ciblée, très lisible. | S |
| 27 | **Portails jumeaux** | Deux cases sont liées : atterrir sur l'une téléporte à l'autre. Elles changent de position à chaque `intensity`. | M |
| 28 | **L'Étage** | Un second anneau, plus petit, au-dessus du premier. On y monte par l'escalier (case dédiée), les loyers y sont doublés, on en redescend au bout d'un tour. Le plus ambitieux — et le plus mémorable en 3D. | L |
| 29 | **Le Trou Noir** | Une case avale : on y reste jusqu'à faire un double ou payer. C'est une deuxième prison, thématisée. | S |
| 30 | **Chemin qui s'effondre** | Après le passage de N joueurs, un raccourci s'effondre définitivement. Premier arrivé, premier servi. | M |
| 31 | **Pont-levis** | Un raccourci ne s'ouvre qu'aux joueurs qui possèdent une case donnée. Le propriétaire a sa route privée. | M |
| 32 | **Rétrécissement de fin de partie** | À `finale`, des cases se retirent du circuit une par une. Le plateau se resserre, les collisions explosent. | L |
| 33 | **Case élastique** | Une case pousse ou tire le pion de ±3 cases selon la parité du dé. Chaos contrôlé. | S |

---

## 5. Plateau mobile

| # | Idée | Ce qui se passe | Coût |
|---|---|---|---|
| 34 | **Rotation d'un côté** | Un des quatre côtés du plateau pivote : les 9 cases changent d'ordre. Les pions restent en place, le sol bouge sous eux. | L |
| 35 | **Permutation de deux cases** | Deux cases échangent leur position. Simple à coder (`swap`), très déroutant en jeu. | S |
| 36 | **Dérive lente** | À chaque tour de table, une case glisse d'un cran. Au bout d'une heure le plateau n'est plus celui du début. | M |
| 37 | **Coins tournants** | Les quatre coins (Départ / Cuve / Bar Ouvert / Au Poste) tournent d'un quart. Le Départ n'est plus où on croit. | L |
| 38 | **Cases empilées** | Deux cases occupent le même emplacement ; celle qui s'applique dépend de la parité du tour. | M |

---

## 6. Le plateau réagit aux joueurs

Le plus intéressant à long terme : le plateau **se souvient**.

| # | Idée | Ce qui se passe | Coût |
|---|---|---|---|
| 39 | **Cases usées** | Une case visitée 5 fois se dégrade : loyer −25 %, texture craquelée. Le plateau garde la trace du trafic. | M |
| 40 | **Sanctuaire** | Une case où personne n'est allé depuis 10 tours accumule un jackpot, versé au premier arrivant. | S |
| 41 | **Territoire** | Posséder un groupe complet ouvre un raccourci *privé* entre ses cases. La récompense devient spatiale, pas seulement économique. | M |
| 42 | **Case maudite** | La case où un joueur a fait faillite devient maudite pour le reste de la partie. Mémoire narrative. | S |
| 43 | **Construction de chemin** | Un joueur *achète* une passerelle entre deux cases qu'il possède. Il en garde le péage. | L |
| 44 | **Case squattée** | Rester 2 tours sur une case sans la payer et elle devient inaccessible aux autres. | M |
| 45 | **Vote de table** | À chaque montée d'intensité, la table vote (30 s) la prochaine mutation parmi 3. Fait participer les joueurs éliminés. | M |
| 46 | **Sabotage** | Une carte Marché Noir permet de fermer une case adverse pour un tour de table. | S |

---

## 7. Mise en scène 3D

Une mutation qui n'est pas **vue** n'existe pas. Chaque idée ci-dessus a besoin de son
moment de bascule — le plateau existe déjà en 3D ([Scene3D.jsx](../../src/features/monovomy/components/board3d/Scene3D.jsx)),
avec effets, caméra directrice et ambiance par intensité.

| # | Idée visuelle | Rattachée à |
|---|---|---|
| 47 | **Le plateau se fend** — une faille lumineuse s'ouvre, la caméra recule, le nouveau chemin monte du sol | 19–22, 28 |
| 48 | **Case qui se retourne** — flip physique 180°, l'ancienne face disparaît sous le plateau | 1–7 |
| 49 | **Néon qui change de couleur** — un groupe entier vire au rouge pendant une hausse de loyers | 11–14 |
| 50 | **Effondrement** — la case murée tombe dans le vide, poussière comprise | 24, 32 |
| 51 | **Plan large obligatoire** — `CameraDirector` prend la main 2 s à chaque mutation, puis rend le contrôle | toutes |
| 52 | **Vibration + son de bascule** — les haptiques existent déjà ([haptics.js](../../src/features/monovomy/game/haptics.js)) | toutes |
| 53 | **Fantôme du plateau d'avant** — l'ancien tracé reste visible en filaire quelques secondes | 34–38 |

⚠️ **Budget mobile.** Le plateau 3D est déjà la pièce la plus lourde du jeu. Toute
mutation doit réutiliser les géométries existantes (instancing) plutôt qu'en créer.
Vérifier sur iPhone 15 Plus avant de valider un effet — cible connue du projet.

---

## 8. Variantes de plateau entier

| # | Idée | Description |
|---|---|---|
| 54 | **Plateau généré** | Un plateau tiré au sort à partir du seed de partie : mêmes proportions, ordre différent. Rejouabilité infinie, et déjà déterministe par construction. |
| 55 | **Plateau court (20 cases)** | Format 20–30 min. Demande de relâcher le `.length(40)` du schéma. |
| 56 | **Plateau à 3 anneaux** | Chaque anneau = un niveau de prix. On monte en réussissant, on redescend en faillite. |
| 57 | **Plateau saisonnier** | Nouvel An, Halloween, festival. Même moteur, contenu différent — l'architecture `BoardTheme` le permet déjà sans une ligne de moteur. |

---

## 9. Ce que je ferais en premier

Ordre choisi pour maximiser l'effet perçu par rapport au coût, sans mettre en danger
le déterminisme ni les snapshots.

**Lot 1 — Fondations invisibles (aucun changement visible en jeu)**
- `boardMutations` dans l'état + `effectiveBoard()` pur et mémoïsé
- `movementGraph` avec l'anneau par défaut → **test de non-régression : le graphe par
  défaut doit produire exactement les mêmes parties qu'aujourd'hui, même seed**
- `cellFor(i, layout)` paramétré

**Lot 2 — Mutations sans topologie** (idées 1, 2, 11, 12, 25, 35)
Que du `retag` / `reprice` / `swap`. Effet immédiat en jeu, zéro risque sur le mouvement.
C'est ici qu'on valide que « le plateau bouge » est **fun** avant d'investir dans le reste.

**Lot 3 — Premier vrai chemin** (idée 19, le Raccourci du Bar)
Un seul lien, un seul sens, déclenché à `chaos`. C'est la validation grandeur nature du
graphe et de la 3D. Si celui-là marche, tous les autres sont de la déclinaison.

**Lot 4 — Le spectaculaire** (idées 22, 28, 32, 45)
Voie centrale, étage, rétrécissement de finale, vote de table.

### Tests indispensables

- **Non-régression** : même seed + mêmes intentions, plateau non muté ⇒ partie identique
  au bit près (le test de déterminisme Phase 5 doit rester vert sans modification)
- **Déterminisme des mutations** : deux hôtes qui rejouent le même journal obtiennent le
  même plateau muté
- **Snapshot ancien** : une partie sauvegardée avant Phase 13 se restaure et se joue
- **Graphe** : aucun cul-de-sac, toute case reste atteignable depuis toute autre, le
  Départ reste franchissable (sinon plus de salaire → économie morte)
- **Simulation** : rejouer `mv:sim` avec mutations actives pour vérifier que la durée de
  partie et l'équité de siège ne dérapent pas

### Risques identifiés

| Risque | Mitigation |
|---|---|
| Un raccourci qui saute le Départ tue l'économie | Salaire au franchissement calculé sur le **chemin**, pas sur `arrival ≥ 40` |
| Trop de mutations = plateau illisible | Plafond dur : **2 mutations actives max** avant `finale`, 4 ensuite |
| Le joueur ne comprend pas pourquoi il a bougé bizarrement | Le chemin complet est animé case par case, jamais de téléportation muette |
| Divergence hôte/client sur le plateau effectif | `effectiveBoard()` pure et dérivée de l'état seul — jamais de cache local |
| Coût GPU sur mobile | Instancing obligatoire, budget vérifié sur device réel |
| `INDEX_BY_ID` figé au chargement du module | Le rendre dérivé de l'état avant toute idée qui déplace une case |
