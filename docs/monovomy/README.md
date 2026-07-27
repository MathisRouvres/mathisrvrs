# MonoVomy — projet interne

**Le Monopoly à boire.** Jeu de soirée multijoueur temps réel, chacun depuis son téléphone.

Ce dossier documente le jeu MonoVomy, développé comme **module isolé** du portfolio
(`src/features/monovomy/`), derrière le flag `VITE_MONOVOMY_ENABLED`. Zéro impact sur
le portfolio et sur le mode `career`.

## Documents

- [game-design.md](./game-design.md) — game design complet (GDD).
- [architecture.md](./architecture.md) — structure technique du module.
- [roadmap.md](./roadmap.md) — étapes de développement.

## Statut

**Étapes 0 à 3 — en place.** Cadrage, prototype hot-seat, **multijoueur temps réel**
(Supabase), et **contenu complet + faillite + équilibrage par simulation**. Voir la roadmap.

## Lancer en local

```bash
VITE_MONOVOMY_ENABLED=true npm run dev
# puis ouvrir /monovomy
```
