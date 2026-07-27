# Modèle de données — Mode Carrière

Statut : **Phase 1 implémentée en local** (pas de BDD serveur — `LocalCareerStore` + schéma Zod).

---

## Principes

- Entités fictives uniquement (licence-ready plus tard).  
- Stats bornées (`min` / `max` / `default`).  
- État de carrière sérialisable + `seed` pour déterminisme.  
- Contenu narratif référencé par `id`, pas inline UI.  
- Distinction **Career local** vs **Career ranked** (serveur) quand l’auth existera.

---

## Entités principales

### PlayerProfile (création)

| Champ | Type | Notes |
|-------|------|--------|
| id | string | uuid / nanoid |
| displayName | string | |
| birthSeasonOffset | number | âge dérivé |
| preferredPositions | string[] | codes fictifs |
| personalityTraits | string[] | tags |
| hometownRegion | string | fiction |

### CareerState (runtime)

| Champ | Type | Notes |
|-------|------|--------|
| seed | string \| number | source PRNG |
| mode | `express` \| `standard` \| `immersion` | |
| seasonIndex | number | 0..N |
| chapterId | string \| null | |
| phase | enum | création, playing, retired… |
| clubId | string \| null | |
| contract | Contract \| null | |
| agentId | string \| null | |
| stats | `Record<StatId, number>` | clampées |
| flags | `Record<string, boolean \| number>` | systèmes cachés |
| inventoryEffects | TimedEffect[] | effets différés |
| narrativeLog | LogEntry[] | journal |
| finances | Finances | |
| relationships | Relationships | |
| rngCursor | number | avancement PRNG (optionnel si état RNG stocké) |

### Club / Competition / Nation (catalogues)

Catalogues versionnés, IDs stables, logos génériques ou formes géométriques — **pas de marques réelles**.

### Contract

Salaire, durée restante, clauses (libération, salaire variable), satisfaction relative.

### Dilemma / EventDefinition (contenu)

| Champ | Rôle |
|-------|------|
| id | stable |
| tags | filtrage |
| weight | tirage pondéré |
| eligibility | conditions sur CareerState |
| prompt | texte / i18n key |
| choices[] | effets immédiats + différés + flags |
| exclusivityGroup | éviter doublons |

### TimedEffect

`triggerSeason`, `triggerChapter`, `payload` (modifs stats/flags), `sourceEventId`.

### Finances

`cash`, `weeklyWage`, `investments[]`, `reputationCredit`.

### Relationships

Scores bornés : coach, teammates aggregate, family, friends, partner, media, fans, sponsors.

---

## Bornes (contrat d’équilibrage)

Exemple de politique (valeurs exactes à figer en phase moteur) :

- Stats sportives : **1–99** ou **0–100** (un seul standard).  
- Relations : **0–100**.  
- Stress / fatigue : **0–100**, seuils d’événements à 70/85/95.  
- Cash : entier ≥ 0 (faillite = flag / événements, pas de négatif silencieux sauf dette modélisée).

Toute écriture passe par des helpers `clampStat` / `applyDelta`.

---

## Persistance prévue

### Local (non classé)

```ts
SaveSlot = {
  version: number
  savedAt: string // ISO
  career: CareerState
  checksum?: string // anti-corruption légère, pas anti-triche
}
```

Stockage : `localStorage` puis `IndexedDB` si taille log.

### Ranked (futur serveur)

- `careers` : état canonique, `user_id`, `seed`, `mode`, `score_axes`, `finished_at`  
- `career_decisions` : append-only des choix (rejeu / audit)  
- `leaderboard_snapshots`  

Migrations versionnées (Supabase SQL ou équivalent) — **pas avant** qu’un backend existe.

---

## Schémas & validation

Quand le moteur TS arrivera :

- Zod (ou équivalent) pour `CareerState`, `EventDefinition`, payloads API.  
- Rejet des états impossibles à la charge (stats hors bornes, mode inconnu).

---

## Phase 0

Aucun schéma implémenté, aucune table, aucun save.  
Ce document oriente Phase 1+ (moteur + contenu).
