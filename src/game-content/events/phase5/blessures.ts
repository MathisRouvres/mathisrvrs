import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes blessures — emplacement 1.
 * 6 dilemmes : le corps comme capital, la santé contre la gloire.
 */
export const blessureDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p5_inj_douleur_cachee',
    title: 'La douleur dont personne ne sait rien',
    body: 'Depuis trois semaines, une pointe te lance derrière la cuisse à chaque accélération. Rien de bloquant — pour l’instant. En parler au staff médical, c’est des examens, peut-être des semaines de repos, et ta place qui s’envole au pire moment de la saison. Te taire, c’est jouer avec un fil qui peut lâcher n’importe quand. Le kiné t’a regardé bizarrement hier. Il se doute de quelque chose.',
    category: 'injury',
    tags: ['douleur', 'secret'],
    rarity: 'common',
    weight: 14,
    ageMin: 17,
    ageMax: 36,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'cacher',
        label: 'Serrer les dents et ne rien dire',
        stance: 'high_risk',
        riskPreview: 'Place conservée, corps en sursis.',
        immediate: [
          fx.flag('injury_hidden'),
          fx.resource('moral', -2),
          fx.chance(0.3, [fx.resource('sante', -8)]),
        ],
        hidden: [fx.hidden('fragilitePhysique', 3)],
      }),
      choice({
        id: 'parler',
        label: 'Tout dire au staff médical',
        stance: 'prudent',
        riskPreview: 'Corps pris au sérieux, place fragilisée.',
        immediate: [
          fx.resource('sante', 6),
          fx.resource('confianceEntraineur', -4),
          fx.resource('forme', -5),
        ],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_inj_infiltration',
    title: 'Une piqûre et tu joues',
    body: 'Cheville gonflée à trois jours du choc au sommet contre le leader. Verdict du médecin : indisponible… sauf infiltration. Une injection avant le coup d’envoi, la douleur disparaît, tu joues — et tu masques les signaux que ton corps t’envoie. Le staff te laisse le choix, officiellement. Officieusement, tout le club espère que tu diras oui. Ce genre de piqûre se paie parfois des années plus tard.',
    category: 'injury',
    tags: ['infiltration', 'pression'],
    rarity: 'common',
    weight: 12,
    ageMin: 18,
    ageMax: 38,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'infiltrer',
        label: 'Accepter l’infiltration et jouer',
        stance: 'high_risk',
        riskPreview: 'Présent au rendez-vous, facture différée possible.',
        immediate: [
          fx.resource('confianceEntraineur', 6),
          fx.resource('reputationSportive', 4),
          fx.chance(0.35, [fx.resource('sante', -10)]),
        ],
        delayed: [
          fx.delayed(2, [
            fx.chance(0.3, [fx.resource('sante', -8), fx.resource('forme', -5)]),
          ]),
        ],
        hidden: [fx.hidden('fragilitePhysique', 3), fx.hidden('grandsMatchs', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser la piqûre, laisser la cheville guérir',
        stance: 'prudent',
        riskPreview: 'Corps respecté, rendez-vous manqué.',
        immediate: [
          fx.resource('sante', 6),
          fx.resource('confianceEntraineur', -5),
          fx.resource('moral', -4),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_inj_operation_ou_patience',
    title: 'Le bistouri ou la patience',
    body: 'Ton genou te trahit par intermittence depuis des mois. Deux chirurgiens, deux avis. Le premier veut opérer maintenant : quatre mois d’arrêt, un genou refait, une carrière assainie. Le second propose un traitement conservateur : renforcement, gestion de la charge, aucun arrêt — mais aucune garantie que ça tienne. Opérer, c’est disparaître une demi-saison. Attendre, c’est vivre avec une épée au-dessus du genou.',
    category: 'injury',
    tags: ['operation', 'long_terme'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 18,
    ageMax: 35,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'operer',
        label: 'Passer sur le billard maintenant',
        stance: 'prudent',
        riskPreview: 'Demi-saison sacrifiée, genou reconstruit.',
        immediate: [
          fx.resource('forme', -10),
          fx.resource('reputationSportive', -4),
          fx.resource('moral', -4),
        ],
        delayed: [
          fx.delayed(1, [fx.resource('sante', 12), fx.resource('forme', 6)]),
        ],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'conservateur',
        label: 'Tenter le traitement conservateur',
        stance: 'high_risk',
        riskPreview: 'Saison sauvée, genou en sursis.',
        immediate: [
          fx.resource('sante', 3),
          fx.resource('moral', 3),
          fx.chance(0.4, [fx.resource('sante', -10), fx.resource('forme', -6)]),
        ],
        hidden: [fx.hidden('fragilitePhysique', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_inj_retour_anticipe',
    title: 'Le club te veut déjà sur le terrain',
    body: 'Ta rééducation avance bien, mais les médecins réclament encore trois semaines. Le club, englué dans les mauvais résultats, ne l’entend pas ainsi : le coach t’appelle chaque jour, le directeur sportif parle de « moment décisif pour tout le monde ». Revenir maintenant, c’est risquer la rechute sur un corps à peine réparé. Tenir bon, c’est regarder l’équipe couler depuis la tribune.',
    category: 'injury',
    tags: ['reeducation', 'pression_club'],
    rarity: 'common',
    weight: 13,
    ageMin: 16,
    ageMax: 39,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'revenir',
        label: 'Écourter la rééducation et revenir',
        stance: 'loyal',
        riskPreview: 'Équipe soulagée, rechute qui guette.',
        immediate: [
          fx.resource('confianceEntraineur', 7),
          fx.relation('teammates', 5),
          fx.chance(0.4, [fx.resource('sante', -12), fx.resource('forme', -6)]),
        ],
        hidden: [fx.hidden('fragilitePhysique', 3), fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'proteger',
        label: 'Suivre les médecins jusqu’au bout',
        stance: 'prudent',
        riskPreview: 'Corps préservé, club agacé.',
        immediate: [
          fx.resource('sante', 8),
          fx.resource('confianceEntraineur', -6),
          fx.resource('moral', -3),
        ],
        delayed: [fx.delayed(1, [fx.resource('forme', 5)])],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_inj_rechute_verite',
    title: 'Ce que tu as caché te rattrape',
    body: 'En plein sprint, la douleur que tu avais tue explose enfin. Verdict : la lésion s’est aggravée en silence, précisément parce que personne ne la soignait. Les médecins sont graves. Une opération lourde offre une vraie chance de retour, mais un échec pourrait tout arrêter. L’alternative — reconstruire entièrement ton jeu autour de ce corps abîmé — te laisserait sur le terrain, diminué, sans jamais vraiment guérir.',
    category: 'injury',
    tags: ['rechute', 'crise'],
    rarity: 'rare',
    weight: 4,
    ageMin: 20,
    ageMax: 36,
    cooldownSeasons: 5,
    unique: true,
    prerequisites: [{ type: 'hasFlag', key: 'injury_hidden' }],
    choices: [
      choice({
        id: 'operation',
        label: 'Tenter l’opération de la dernière chance',
        stance: 'high_risk',
        riskPreview: 'Vraie guérison possible, carrière en jeu.',
        immediate: [
          fx.flag('career_crisis'),
          fx.flag('grave_injury_risk'),
          fx.resource('moral', -6),
          fx.resource('forme', -12),
        ],
        delayed: [
          fx.delayed(1, [
            fx.skillCheck(
              'resource',
              'sante',
              45,
              [
                fx.resource('sante', 15),
                fx.resource('forme', 10),
                fx.resource('moral', 8),
              ],
              [fx.resource('sante', -10), fx.resource('moral', -8)],
            ),
          ]),
        ],
        hidden: [fx.hidden('resistancePression', 3)],
      }),
      choice({
        id: 'reconversion',
        label: 'Réinventer ton jeu autour de la douleur',
        stance: 'prudent',
        riskPreview: 'Carrière poursuivie, corps jamais guéri.',
        immediate: [
          fx.flag('career_crisis'),
          fx.stat('vitesse', -3),
          fx.stat('tactique', 2),
          fx.resource('moral', -4),
        ],
        hidden: [fx.hidden('adaptabilite', 4), fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_inj_medecine_alternative',
    title: 'Le guérisseur de l’Archipel du Sel',
    body: 'Ta blessure traîne et le protocole classique piétine. Un ancien international te recommande un praticien de l’Archipel du Sel aux méthodes controversées : manipulations interdites dans certains pays, plantes non homologuées, résultats spectaculaires — selon lui. Le staff médical serait furieux de l’apprendre. Mais toi, tu es prêt à beaucoup pour rejouer sans douleur. Peut-être même à confier ton corps à un inconnu.',
    category: 'injury',
    tags: ['medecine_alternative', 'secret'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 18,
    ageMax: 37,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'tenter',
        label: 'Consulter le praticien en secret',
        stance: 'high_risk',
        riskPreview: 'Guérison miracle ou pari sur ton corps.',
        immediate: [
          fx.cash(-6000),
          fx.chance(0.5, [fx.resource('sante', 10), fx.resource('moral', 6)]),
          fx.chance(0.25, [fx.resource('sante', -8)]),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.3, [
              fx.relation('media', -6),
              fx.resource('confianceEntraineur', -5),
            ]),
          ]),
        ],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'protocole',
        label: 'Rester dans le protocole du club',
        stance: 'prudent',
        riskPreview: 'Voie sûre, patience obligatoire.',
        immediate: [
          fx.resource('sante', 4),
          fx.resource('moral', -3),
          fx.resource('discipline', 3),
        ],
        hidden: [fx.hidden('professionnalisme', 2), fx.hidden('constance', 2)],
      }),
    ],
  }),
]
