# Persistance Mode Carrière (Phase 1)

## Modèle hybride

Chaque carrière est un `CareerSavePackage` :

1. **Snapshot** (`snapshot` + `playerProfile`) — état courant validé (équivalent `career_runs` + `player_profiles`).
2. **Journal append-only** — `events`, `decisions`, `seasons` (équivalents `career_events`, `career_decisions`, `career_seasons`).

Stockage actuel : **localStorage** clé `mathisrvrs.career.v1` (invité).  
Les classements mondiaux exigeront plus tard une autorité serveur.

## Entités

| Concept | Emplacement local |
|---------|-------------------|
| career_runs | `packages[id].snapshot` + index `runs[]` |
| player_profiles | `packages[id].playerProfile` |
| career_events | `journal.events` |
| career_decisions | `journal.decisions` (immuables) |
| career_seasons | `journal.seasons` |
| user_achievements | `achievements[]` |
| user_unlocks | `unlocks[]` |

## Règles

- Décision écrite → jamais modifiée silencieusement.
- Résolution d’événement : état avant / après + verrou anti double-résolution.
- `schemaVersion` + `migrateCareerSave()`.
- Écritures multi-champs via `withTransaction` (file d’attente + write atomique).
- Autosave debounce + flush `beforeunload`.
- Statuts `finished` / `abandoned` → lecture seule.

## Mode invité

- `ownerId: null` à la création.
- `queueAccountLink(careerId)` prépare le rattachement compte.
- `attachOwner(careerId, ownerId)` API prête (auth future).
