# Phase 13 — Correction & rééquilibrage de la progression

## Cause exacte (diagnostic)

Le plateau du niveau ~65 avait **deux causes cumulées**, plus un plafond de potentiel trop bas :

1. **Niveau = moyenne NON pondérée des 15 stats** (`getVisibleStats`).
   Un spécialiste (ex. buteur fort en finition/tir/placement mais faible en
   défense/passe/tactique) voyait sa moyenne tirée vers le milieu. Même avec des
   stats-clés à ~88, la moyenne des 15 plafonnait mathématiquement vers ~65.
2. **Arrondi de chaque écriture de stat** (`clampStat` = `Math.round`).
   La progression annuelle est fractionnaire (< 1 pt/stat/saison). Arrondir à
   chaque saison détruisait les gains < 0,5 : les stats hors-poste ne bougeaient
   jamais, les stats-clés avançaient par à-coups.
3. **Plafond souple trop bas** : `ceiling = 42 + potentiel × 0,55`.

## Corrections

- **Niveau pondéré par le poste** (`positionOverall`) : stats-clés ×3, secondaires
  ×1,35, reste ×0,45. Unifié entre valeur affichée et valeur stockée
  (`overallFromStats` = `positionOverall`).
- **Accumulation fractionnaire** : `clampStatFloat` (sans arrondi) en croissance ;
  arrondi uniquement à l'affichage. Décimales préservées en sauvegarde.
- **Plafond souple adouci** : `ceiling = 50 + potentiel × 0,49` ; au-delà, rendement
  fortement décroissant (×0,18) mais **jamais bloqué net**.
- **Budget de croissance rehaussé** + **bonus de percée borné** (jeune révélation,
  saison exceptionnelle, changement de poste, retour de blessure, saison historique,
  grande compétition) — multiplicateur ≤ 1,7.
- **`deriveCareerTier` recalibré** sur la nouvelle courbe.

Aucun second moteur créé : correction du moteur existant.

## Comparaison chiffrée avant / après

Pic de niveau sur carrières complètes (décisions par défaut, 40 carrières/poste,
championnat d'élite).

| Poste | avant (max) | avant (>65) | après (avg) | après (max) | après (>65) | après (>75) |
|-------|-------------|-------------|-------------|-------------|-------------|-------------|
| GK    | 64          | 0/40        | 71          | 81          | 37/40       | 8/40        |
| DEF   | 64          | 0/40        | 71          | 81          | 37/40       | 5/40        |
| MID   | 64          | 0/40        | 71          | 80          | 38/40       | 5/40        |
| ATT   | 63          | 0/40        | 70          | 77          | 36/40       | 2/40        |

**Avant** : max 64, **0 %** des carrières dépassent 65 (plafond dur).
**Après** : ~92 % dépassent 65, pics jusqu'à 81 avec des décisions non optimales.

Carrières « au sommet » (fort potentiel 92 + bonne gestion, 25 carrières/poste) :

| Poste | avg | max | >85 | >90 |
|-------|-----|-----|-----|-----|
| GK    | 83  | 91  | 9   | 1   |
| DEF   | 85  | 91  | 14  | 1   |
| MID   | 83  | 93  | 9   | 1   |
| ATT   | 80  | 90  | 4   | 0   |

→ 65 devient un professionnel installé ; 75 accessible ; 85 rare ; 90 exceptionnel ;
93 atteint dans les meilleures conditions. Courbe continue (rendements décroissants),
sans mur à 65/70/75/80/90.
