# Rapport de simulation finale (Phase 15)

> Généré par la simulation de masse (Phase 8) — 100 000 carrières, 10 profils de décision × 6 pays × 4 postes. Distribution émergente du moteur, non truquée.

## Synthèse

- **100 000 carrières** simulées (10 stratégies × 6 pays × 4 postes, potentiels et clubs variés par graine).
- Invariants : **tous respectés (0 violation)**.
- Déterminisme : même graine + mêmes décisions = même carrière (aucun `Math.random` dans le moteur — test dédié).

## Distribution des paliers (§6)

| Palier | Observé | Cible |
| --- | --- | --- |
| Carrière compliquée (difficile) | 0,57 % | 10–15 % |
| Professionnelle correcte | 34,38 % | 35–45 % |
| Belle carrière | 39,4 % | 25–35 % |
| Grande carrière | 16,62 % | 10–15 % |
| Exceptionnelle | 7,29 % | 3–7 % |
| Légendaire | 1,73 % | 0,5–2 % |

## Dépassements de niveau

- > 65 : **96,4 %** (contre 0 % avant Phase 13)
- > 75 : 32,9 % · > 85 : 0,11 % · > 90 : 0 % · > 93 : 0 %

## Invariants (§7)

| Invariant | Violations |
| --- | --- |
| Deux dilemmes par saison (3e dilemme) | 0 ✅ |
| Récompense ajoutant un choix (post-retraite) | 0 ✅ |
| Trophée appliqué deux fois | 0 ✅ |
| Récompense appliquée deux fois | 0 ✅ |
| Record appliqué deux fois | 0 ✅ |
| Récompense sans compétition | 0 ✅ |
| Récompense incohérente avec le poste | 0 ✅ |
| Trophée incohérent avec le classement | 0 ✅ |
| Saison simulée deux fois | 0 ✅ |
| Carrière bloquée | 0 ✅ |
| Exception moteur | 0 ✅ |

## Problèmes corrigés

- **Plateau de niveau ~65** (Phase 13) : niveau pondéré au poste + accumulation fractionnaire + plafond souple. Dépassement de 65 passé de 0 % à 96,4 %.
- **Boule de neige (§5)** : l’impact des récompenses est borné (réputation/valeur plafonnées, aucun bonus de niveau) — une récompense aide la carrière sans garantir les suivantes.

## Risques encore ouverts

- Les bots de stratégie convergent : la distribution émergente est plus concentrée que les cibles indicatives (paliers extrêmes plus rares). Ce n’est pas un truquage — un joueur humain optimisant peut viser les hauts paliers.
- Équilibre par poste des récompenses : part des attaquants 14,66 % des victoires (surveillé, cf. rapport individuel).
