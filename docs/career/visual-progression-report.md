# Rapport de valorisation visuelle (Phase 14)

> Généré par la simulation de masse (Phase 8) — 100 000 carrières, 10 profils de décision × 6 pays × 4 postes. Distribution émergente du moteur, non truquée.

## Données de progression exposées au bilan

- **Niveau avant → après** + delta (animé, lisible sans couleur).
- **Palier de carrière** (10 paliers : centre → légende) : précédent, actuel, prochain, avancement, trajectoire.
- **Compétences modifiées** uniquement, triées par ampleur, avec cause (temps de jeu, saison exceptionnelle, retour de blessure, nouveau rôle, déclin physique).
- **Statut / réputation / salaire** avant → après.
- **Palmarès** de la saison.
- **Distinctions** différenciées : nomination ≠ podium ≠ victoire ≠ victoire majeure ≠ mondiale.
- **Records** badgés par rareté.
- **Cartes de timeline** synthétiques (âge, club, niveau, rang, trophées, distinctions, records, fait marquant).

## Contraintes respectées

- Toute la dérivation vit dans le moteur (`core/progression.ts`) — **aucune logique métier dans les composants** (test de garde de source).
- Animations courtes, non bloquantes, `prefers-reduced-motion` respecté (valeur finale directe), bouton « Saison suivante » jamais bloqué.
- Compréhensible sans couleur (flèches ▲/▼ + signes).

> Les métriques de progression (pic, seuils, âge du pic) sont mesurées dans `progression-balance-report.md`. La valorisation est purement visuelle : elle n’altère aucune valeur du moteur.
