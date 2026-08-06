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
