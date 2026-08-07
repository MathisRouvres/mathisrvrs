# MonoVomy — architecture

## Principe

Module **auto-contenu** sous `src/features/monovomy/`, isolé du portfolio et de `career`.
Activé par le feature flag `VITE_MONOVOMY_ENABLED`, route `/monovomy` (gate dans `App.jsx`).

## Arborescence

```
src/features/monovomy/
  index.js                 API publique du module (composants)
  MonovomyApp.jsx          Écran Étape 0 (chantier)
  MonovomyShell.jsx        Shell dédié (thème néon, hors design system portfolio)
  styles/
    monovomy-theme.css     Tokens néon (voir charte graphique)
  engine/                  Logique de jeu — pur TS, déterministe
    constants.ts           Niveaux, multiplicateurs, économie de base
    types.ts               GameConfig, PlayerState, GameState
    rules.ts               Calcul des gorgées (palier / carte × multiplicateur)
    index.ts               Barrel
  content/                 Données de jeu — data-driven, validées par Zod
    version.ts             Version du pack de contenu
    schema.ts              Schémas Zod (case, thème, carte action)
    board.soiree.ts        Alias déprécié → maps/classicSquare
    maps/                  Registre des plateaux (multi-map)
      types.ts             BoardMapDefinition, économie, géométrie visuelle
      navigation.ts        Déplacement générique sur `path` (toute taille)
      classicSquare.ts     Plateau Classique — 40 cases
      infinityParty.ts     Infinity Party — 56 cases en 8
      validate.ts          Validateur (`npm run mv:validate-content`)
      registry.ts          Registre + repli `classic_square`
      visual.ts            Accès aux positions visuelles
      maps.test.ts         Validation des maps + navigation
    cards.ts               Échantillon de cartes action
    index.ts               Barrel
    catalog.test.ts        Validation du contenu (Vitest)

docs/monovomy/             Documentation
```

## Maps (plateaux)

Le moteur est **agnostique de la forme du plateau**. Une map sépare strictement :

- **le chemin logique** — `path: string[]`, ordre cyclique des cases. Seule source
  de vérité du déplacement (dés, passage par le Départ, prison, distances) ;
- **la géométrie visuelle** — `visual.positions`, coordonnées normalisées `0..100`,
  rotation, `layer` (chevauchements) et `segment`. Lue par le rendu uniquement.

Aucune règle ne doit dépendre d'un index numérique écrit en dur ni de l'ordre du DOM.
Toute la navigation passe par `content/maps/navigation.ts` :
`boardSize`, `advance`, `logicalDistance`, `tilesBetween`, `findNextTileOfKind`,
`startIndex`, `jailIndexOf`, `goToJailIndexOf`, `startingCashOf`, `salaryOnPassStart`.

Chaque map porte son **économie** (`startingCash`, `salaryOnPassStart`, multiplicateurs
optionnels) : modifier une map n'affecte jamais l'autre.

Repli unique : `DEFAULT_BOARD_MAP_ID = 'classic_square'`. Une partie **sans** `mapId`
retombe dessus ; un `mapId` **présent mais inconnu** échoue bruyamment
(`resolveBoardMapId` renvoie `null`, `getBoardMap` lève) — jamais de bascule silencieuse.

### Plateaux disponibles

| Map | Cases | Groupes | Joueurs | Capital | Salaire | Forme |
|---|---|---|---|---|---|---|
| `classic_square` | 40 | 8 | 3–8 | 1500 | 200 | anneau carré 11×11 |
| `infinity_party` | 56 | 11 | 4–8 | 1800 | 280 | lemniscate (8 horizontal) |

Infinity Party : 36 propriétés, 4 transports, 2 services, 6 cartes, 3 taxes.
Le salaire suit la longueur du parcours (200/40 = 280/56 par case), donc la
circulation d'argent reste comparable malgré 40 % de cases en plus.

Le 8 est **visuel** : le chemin reste un cycle unique. Il traverse deux fois le
centre, sur deux cases logiquement distinctes — `inf_pont_haut` (index 14,
`layer` 2) et `inf_pont_bas` (index 42, `layer` 0) — écartées verticalement pour
rester deux zones tactiles séparées. Aucune bifurcation, aucune téléportation.

Les positions sont calculées une fois au chargement depuis une lemniscate de
Gerono échantillonnée à pas d'arc constant (déterministe, sans `Math.random`),
avec une rotation par case orientée vers le cœur de sa boucle.

### Rendu

`components/board3d/boardGeometry.ts` convertit les positions normalisées de la
map en coordonnées monde three.js, une fois par map (mémoïsé). Il expose
`posOf`, `rotOf`, `elevationOf`, `tileTopY`, `textureAngleOf`, `groupIndicesOf`
et l'emprise (`extent`) du plateau.

Points clés :

- **échelle automatique** — le pas monde d'une case vaut 1, quelle que soit la
  map : l'échelle vient de la médiane des écarts déclarés. Le plateau carré
  retombe exactement sur son ancien placement (`col - 6` / `row - 6`), ce que
  verrouille `boardGeometry.test.ts` ;
- **orientation** — `visual.tileOrientation` vaut `fixed` (carré : cases alignées,
  rendu historique) ou `path` (8 : chaque case pivote selon la trajectoire) ;
- **pont** — la case `upper_bridge` est surélevée par une rampe en cosinus sur
  ±2 cases ; les pions montent et redescendent en suivant `tileTopY` ;
- **cadrage** — socle, cadre néon, halo, ombres et distances caméra sont dérivés
  de `extent`, donc le 8 (deux fois plus large) est cadré sans réglage manuel.

Le plateau 2D (`MvBoard`) lit les mêmes positions en pourcentages : aucune grille
CSS, et le contenu des cases est contre-pivoté pour rester lisible.

### Choix de la map et synchronisation

L'hôte est seul décideur. Le lobby porte des `RoomSettings { mapId }` et trois
intentions validées par `net/lobbyReducer.ts` (pur, testé) :
`select_map`, `update_room_settings`, `start_game`.

Refus explicites : `not_host`, `unknown_map`, `game_started`, `unsupported_player_count`.
Les intentions reçues du réseau passent d'abord par `parseLobbyIntent` (Zod).

Au lancement, `createGame` fige `mapId` / `mapVersion` dans le `GameState` ; ils ne
changent plus. Le snapshot les recopie, et `restoreSnapshot` refuse
`unknown_map` / `incompatible_map` plutôt que de basculer sur un autre plateau.
`applyStampedIntent` rejette (`map_mismatch`) toute intention résolue sur une map
différente de celle du snapshot.

### Équilibrage et validation

| Commande | Effet |
|---|---|
| `npm run mv:validate-content` | rapport de validation, une section par map |
| `npm run mv:sim` | simulation de masse **comparée** entre toutes les maps |
| `npm run mv:sim:classic` / `mv:sim:infinity` | une seule map (`MV_SIM_MAP=…`) |
| `npm run mv:sim:order` | étude d'équité de l'ordre de jeu |

Mesures par map : tours, passages par Départ, taux d'achat, loyers (nombre et
montant moyen), monopoles, invendus, trésorerie finale, faillites, gorgées et
taux de victoire du premier joueur.

Les parties MonoVomy sont bornées par le **timer**, pas par un nombre de tours :
la comparaison porte donc sur le rythme *par tour*, pas sur la durée brute. Deux
garde-fous : les loyers par tour d'Infinity Party ne descendent pas sous 85 % de
ceux du plateau carré (pas de temps morts), et le revenu par tour reste dans une
fourchette de 0,85 à 1,3 (le salaire suit la longueur du parcours).

### Ajouter une nouvelle map

1. déclarer son identifiant dans `BOARD_MAP_IDS` (`maps/types.ts`) ;
2. créer `maps/<nom>.ts` : cases, `path`, `tiles`, cases spéciales (`startTileId`,
   `jailTileId`, `goToJailTileId`) ;
3. définir son économie et ses groupes de propriétés ;
4. définir ses positions visuelles (`visual.positions`) et sa miniature ;
5. l'enregistrer dans `maps/registry.ts` ;
6. lancer les validations (`npm run typecheck`, `npx vitest run src/features/monovomy`) ;
7. lancer les simulations d'équilibrage (`npm run mv:sim`) ;
8. ajouter ses tests (chemin cyclique, cases spéciales, positions visuelles).

## Conventions réutilisées du repo

- **TypeScript strict** (`noUncheckedIndexedAccess`, `isolatedModules`), sans point-virgule, quotes simples.
- **Zod** pour la validation de tout le contenu (comme `game-content` / dilemmas).
- **Déterminisme** : le moteur (Étape 1) réutilisera le PRNG Mulberry32 seedé de
  `src/game-engine/random` — aucun `Math.random()` métier.
- **Feature flag + route gate** : même pattern que `CAREER_GAME_ENABLED`.
- **Tests** : Vitest, un fichier `*.test.ts` par catalogue.

## À venir (Étape 1+)

- `engine/` : state-machine de tour, résolution des cases, économie, faillite.
- `engine/rng.ts` : wrapper autour de `@game-engine/random` (dé, mélange des decks).
- Backend temps réel (Colyseus ou Supabase) — décision Étape 2.
