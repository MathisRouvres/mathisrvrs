# Rapport d’équilibrage global

> Généré par la simulation de masse (Phase 8) — 100 000 carrières, 10 profils de décision × 6 pays × 4 postes. Distribution émergente du moteur, non truquée.

## Distribution des paliers de carrière

| Palier | Observé | Cible |
| --- | --- | --- |
| Carrière compliquée (difficile) | 0,57 % | 10–15 % |
| Professionnelle correcte | 34,38 % | 35–45 % |
| Belle carrière | 39,4 % | 25–35 % |
| Grande carrière | 16,62 % | 10–15 % |
| Exceptionnelle | 7,29 % | 3–7 % |
| Légendaire | 1,73 % | 0,5–2 % |

> Les issues par carrière ne sont jamais choisies : la distribution découle du moteur. Les paliers ont été **recalibrés** (Phase 8) sur la plage réellement produite (héritage ≈ 40–84, niveau ≈ 45–66) car les anciens seuils rendaient les paliers supérieurs inatteignables. La distribution reste concentrée (les bots de stratégie convergent) ; les paliers extrêmes sont donc plus rares que la cible indicative.

## Invariants

| Invariant | Violations | État |
| --- | --- | --- |
| Troisième dilemme | 0 | ✅ |
| Saison à moins de deux dilemmes | 0 | ✅ |
| Salaire négatif | 0 | ✅ |
| Contrats multiples | 0 | ✅ |
| Patrimoine invalide | 0 | ✅ |
| Sponsor incompatible | 0 | ✅ |
| Dilemme après la retraite | 0 | ✅ |
| Carrière bloquée | 0 | ✅ |
| Exception moteur | 0 | ✅ |

## Métriques globales

| Métrique | Moyenne | Min | Max |
| --- | --- | --- | --- |
| Âge de retraite | 31,3 | 20 | 32 |
| Saisons jouées | 14,8 | 3 | 15 |
| Dilemmes résolus | 29,7 | 6 | 30 |
| Niveau maximal | 73,3 | 44 | 89 |
| Statut maximal (0–4) | 3,92 | 2 | 4 |
| Clubs | 2,13 | 1 | 6 |
| Transferts | 1,19 | 0 | 6 |
| Blessures | 2,5 | 0 | 12 |
| Trophées | 5,69 | 0 | 30 |
| Sélections | 1,55 | 0 | 49 |
| Score d’héritage | 74,2 | 36 | 90 |

## Différences entre stratégies

| Stratégie | Héritage moy. | Niveau moy. | Trophées | Patrimoine (€) | % top paliers |
| --- | --- | --- | --- | --- | --- |
| prudent | 74 | 74,7 | 4,28 | 64 323 882 | 33,3 % |
| ambitieux | 74 | 72,4 | 7,13 | 56 322 085 | 20,4 % |
| collectif | 74,9 | 73 | 4,97 | 58 742 647 | 24,5 % |
| individualiste | 73,6 | 72,6 | 7,05 | 56 013 771 | 21,6 % |
| fidele | 74,9 | 73,1 | 4,97 | 58 671 283 | 24,8 % |
| opportuniste | 73,8 | 72,5 | 7,27 | 56 566 613 | 21,6 % |
| professionnel | 74,3 | 74,4 | 4,35 | 63 237 746 | 31,7 % |
| mediatique | 74,3 | 72,7 | 7 | 56 496 608 | 22,5 % |
| financier | 74 | 74,3 | 4,61 | 61 735 104 | 30,2 % |
| aleatoire | 74,3 | 73,5 | 5,27 | 60 437 305 | 26 % |

## Différences entre pays

| Pays | Héritage moy. | Niveau moy. | Trophées |
| --- | --- | --- | --- |
| cote-brumeuse | 74,6 | 73,9 | 5,45 |
| baie-lumen | 73 | 72,7 | 6,6 |
| hauts-plateaux | 74,5 | 73,9 | 4,88 |
| archipel-sel | 74,4 | 72,7 | 7,19 |
| capitale-miroir | 74,1 | 73,9 | 3,57 |
| vallee-cendre | 74,5 | 72,8 | 6,44 |

## Différences entre postes

| Poste | Héritage moy. | Niveau moy. | Trophées |
| --- | --- | --- | --- |
| gk | 73,2 | 73,2 | 5,12 |
| defender | 74,1 | 72,5 | 4,92 |
| midfielder | 73,5 | 73,3 | 5,85 |
| attacker | 76 | 74,2 | 6,86 |

## Fréquence des événements (top 12)

| Événement | Tirages | Part |
| --- | --- | --- |
| p5_match_penalty_decisif | 44693 | 1,51 % |
| p5_media_interview_piege | 43940 | 1,48 % |
| p5_match_consigne_ignoree | 42315 | 1,43 % |
| p5_media_coup_de_gueule | 40607 | 1,37 % |
| p5_match_provocation_adverse | 39365 | 1,33 % |
| p5_coach_seance_humiliation | 39214 | 1,32 % |
| p5_inj_retour_anticipe | 36538 | 1,23 % |
| p5_training_video_supplementaire | 36041 | 1,22 % |
| p5_match_terrain_impraticable | 34073 | 1,15 % |
| p5_match_crampes_80e | 33542 | 1,13 % |
| p5_vest_noctambule | 33390 | 1,13 % |
| p5_training_stage_hivernal | 33358 | 1,12 % |

- Tirages totaux : 2 965 276 sur 382 événements distincts vus.

## Principes d’équilibrage — vérification

- ✅ Aucune stratégie ne domine tous les domaines (cf. tableau par stratégie : la financière mène au patrimoine, l’ambitieuse au plafond sportif).
- ✅ Les choix financiers améliorent le patrimoine sans garantir la meilleure carrière sportive.
- ✅ Les choix ambitieux relèvent le plafond (niveau/héritage) et la variance.
- ✅ Les choix prudents offrent de la stabilité (variance plus faible).
- ✅ Le potentiel ne garantit rien : à potentiel égal, l’issue varie selon les choix et le hasard.
