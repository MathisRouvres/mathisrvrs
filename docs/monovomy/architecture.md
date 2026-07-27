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
    board.soiree.ts        Thème « Soirée » (40 cases)
    cards.ts               Échantillon de cartes action
    index.ts               Barrel
    catalog.test.ts        Validation du contenu (Vitest)

docs/monovomy/             Documentation
```

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
