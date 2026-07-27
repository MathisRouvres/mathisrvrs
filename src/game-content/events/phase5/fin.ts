import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes de fin de carrière — emplacement 2.
 * 4 dilemmes. Pose le flag wants_retirement.
 * Le moteur bloque déjà career_end avant 30 ans sans crise.
 */
export const finDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p5_end_derniere_prolongation',
    title: 'Un an de plus, ou la gloire ailleurs',
    body: 'Ton club de cœur te propose une dernière prolongation d’un an : salaire réduit, rôle de sage du vestiaire, et la promesse d’une tribune qui portera peut-être ton nom un jour. Le même jour, un club taillé pour le titre appelle : ils veulent ton expérience pour aller chercher la coupe continentale qui manque à ta carrière. Les deux offres expirent vendredi.',
    category: 'career_end',
    tags: ['prolongation', 'loyaute'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 32,
    ageMax: 38,
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'rester',
        label: 'Finir là où tout a commencé',
        stance: 'loyal',
        riskPreview: 'Légende locale, palmarès figé.',
        immediate: [
          fx.relation('fans', 10),
          fx.resource('popularite', 5),
          fx.cash(20000),
          fx.resource('moral', 4),
        ],
        hidden: [fx.hidden('loyaute', 4), fx.hidden('ambition', -2)],
      }),
      choice({
        id: 'partir',
        label: 'Partir chasser la coupe continentale',
        stance: 'ambitious',
        riskPreview: 'Trophée possible, histoire abîmée.',
        immediate: [
          fx.cash(60000),
          fx.relation('fans', -10),
          fx.resource('reputationSportive', 5),
          fx.chance(0.4, [fx.resource('moral', -5)]),
        ],
        hidden: [fx.hidden('ambition', 4), fx.hidden('loyaute', -3)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_end_reconversion',
    title: 'Le diplôme ou les dernières cartouches',
    body: 'La fédération ouvre une session du diplôme d’entraîneur réservée aux joueurs en activité : deux soirées par semaine et des modules pendant les trêves, pendant deux ans. Ton corps réclame déjà chaque heure de récupération. T’inscrire, c’est préparer la suite au détriment de tes dernières saisons pleines. Refuser, c’est tout miser sur le terrain — et sauter dans le vide le jour où le rideau tombera.',
    category: 'career_end',
    tags: ['reconversion', 'avenir'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 31,
    ageMax: 37,
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'diplome',
        label: 'S’inscrire au diplôme d’entraîneur',
        stance: 'prudent',
        riskPreview: 'Avenir préparé, présent rogné.',
        immediate: [
          fx.stat('tactique', 2),
          fx.resource('fatigue', 8),
          fx.resource('forme', -4),
        ],
        delayed: [
          fx.delayed(2, [fx.resource('financesPersonnelles', 8), fx.resource('bienEtre', 6)]),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('constance', 2)],
      }),
      choice({
        id: 'terrain',
        label: 'Tout miser sur les dernières saisons',
        stance: 'ambitious',
        riskPreview: 'Présent maximal, filet inexistant.',
        immediate: [fx.resource('forme', 5), fx.resource('moral', 4)],
        delayed: [
          fx.delayed(2, [
            fx.resource('bienEtre', -6),
            fx.chance(0.4, [fx.resource('financesPersonnelles', -8)]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_end_tour_honneur',
    title: 'Annoncer la dernière danse',
    body: 'L’idée mûrit depuis des mois : la saison qui s’ouvre pourrait être la dernière. L’annoncer dès maintenant, c’est transformer chaque déplacement en adieux — hommages, tifos, stades debout, y compris chez les rivaux. C’est aussi vivre un an sous les projecteurs de ta propre fin, sans droit de changer d’avis. Partir en silence, c’est garder ta liberté jusqu’au bout, et renoncer à la tournée d’adieux.',
    category: 'career_end',
    tags: ['retraite', 'adieux'],
    rarity: 'rare',
    weight: 4,
    ageMin: 33,
    ageMax: 39,
    unique: true,
    choices: [
      choice({
        id: 'annoncer',
        label: 'Annoncer ta dernière saison au monde',
        stance: 'emotional',
        riskPreview: 'Adieux grandioses, retour impossible.',
        immediate: [
          fx.flag('wants_retirement'),
          fx.relation('fans', 12),
          fx.resource('popularite', 8),
          fx.relation('media', 6),
          fx.resource('forme', -3),
        ],
        hidden: [fx.hidden('resistancePression', -2)],
      }),
      choice({
        id: 'silence',
        label: 'Préparer ta sortie en silence, sans cérémonie',
        stance: 'prudent',
        riskPreview: 'Liberté totale, adieux escamotés.',
        immediate: [
          fx.flag('wants_retirement'),
          fx.resource('bienEtre', 5),
          fx.resource('moral', 3),
          fx.resource('popularite', -4),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_end_saison_de_trop',
    title: 'La saison de trop ?',
    body: 'Les rechutes s’enchaînent, et la dernière consultation a laissé un silence lourd : continuer est possible, mais plus rien ne sera garanti, ni ton niveau ni ta santé d’après-carrière. Autour de toi, certains parlent d’un courage qui s’appelle arrêter, d’autres d’un gâchis. Tu as encore des offres, un nom, des jambes certains matins. Et cette peur, à chaque échauffement, qui ne part plus.',
    category: 'career_end',
    tags: ['crise', 'sante'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 26,
    ageMax: 39,
    unique: true,
    prerequisites: [{ type: 'hasFlag', key: 'career_crisis' }],
    choices: [
      choice({
        id: 'raccrocher',
        label: 'Raccrocher maintenant, la tête haute',
        stance: 'prudent',
        riskPreview: 'Santé préservée, rêve interrompu.',
        immediate: [
          fx.flag('wants_retirement'),
          fx.resource('sante', 8),
          fx.resource('bienEtre', 8),
          fx.resource('popularite', -6),
          fx.resource('moral', -5),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
      choice({
        id: 'continuer',
        label: 'Continuer malgré les signaux',
        stance: 'high_risk',
        riskPreview: 'Le rêve continue, le corps décidera.',
        immediate: [
          fx.resource('moral', 6),
          fx.chance(0.35, [fx.resource('sante', -12), fx.resource('forme', -6)]),
        ],
        hidden: [fx.hidden('fragilitePhysique', 3), fx.hidden('resistancePression', 3)],
      }),
    ],
  }),
]
