import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes d'investissement narratif (Phase 3) — emplacement 2.
 * Jamais d'argent réel, aucune mécanique de pari : coût fixe, échéance connue,
 * issue résolue par des effets retardés (rendement ou perte).
 */
export const investmentDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'p3_invest_immobilier',
    title: 'Une pierre pour l’avenir',
    body: 'Un promoteur te propose d’acquérir un bien immobilier bien placé. Le ticket d’entrée est conséquent, mais la valeur devrait grimper sur plusieurs saisons. C’est immobiliser une part de ton patrimoine dans quelque chose de tangible.',
    category: 'money',
    tags: ['investissement', 'immobilier', 'patrimoine'],
    rarity: 'common',
    weight: 8,
    ageMin: 22,
    ageMax: 39,
    cooldownSeasons: 3,
    prerequisites: [{ type: 'minResource', id: 'financesPersonnelles', value: 40 }],
    choices: [
      choice({
        id: 'investir',
        label: 'Acheter le bien immobilier',
        stance: 'financial',
        riskPreview: 'Actif solide, capital immobilisé longtemps.',
        immediate: [
          fx.makeInvestment({
            investmentId: 'immobilier',
            label: 'Bien immobilier',
            cost: 90000,
            sector: 'immobilier',
          }),
        ],
        delayed: [
          fx.delayed(4, [
            fx.chance(0.8, [fx.cash(40000), fx.res('financesPersonnelles', 4)]),
            fx.chance(0.2, [fx.cash(-35000), fx.res('financesPersonnelles', -5)]),
          ]),
        ],
      }),
      choice({
        id: 'passer',
        label: 'Garder ton épargne liquide',
        stance: 'prudent',
        riskPreview: 'Liquidités gardées, occasion laissée.',
        immediate: [fx.res('financesPersonnelles', 3)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_invest_tech',
    title: 'La start-up qui promet la lune',
    body: 'Un ancien coéquipier lève des fonds pour une start-up techno prometteuse. Le potentiel est énorme, l’échec tout aussi possible. Il te faut décider vite si tu montes dans le train ou si tu regardes passer.',
    category: 'money',
    tags: ['investissement', 'technologie', 'risque'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 21,
    ageMax: 38,
    cooldownSeasons: 4,
    prerequisites: [{ type: 'minResource', id: 'financesPersonnelles', value: 35 }],
    choices: [
      choice({
        id: 'investir',
        label: 'Miser sur la start-up',
        stance: 'high_risk',
        riskPreview: 'Gain potentiel élevé, perte possible.',
        immediate: [
          fx.makeInvestment({
            investmentId: 'technologie',
            label: 'Start-up tech',
            cost: 40000,
            sector: 'technologie',
          }),
        ],
        delayed: [
          fx.delayed(3, [
            fx.chance(0.4, [fx.cash(80000), fx.res('financesPersonnelles', 5)]),
            fx.chance(0.6, [fx.cash(-30000), fx.res('moral', -4)]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 1)],
      }),
      choice({
        id: 'passer',
        label: 'Ne pas jouer avec ton argent',
        stance: 'prudent',
        riskPreview: 'Prudence, mais peut-être un regret.',
        immediate: [fx.res('financesPersonnelles', 2)],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_invest_centre_sportif',
    title: 'Bâtir ton centre sportif',
    body: 'Un projet de complexe sportif à ton nom voit le jour dans ta région. C’est un investissement lourd, mais qui construirait ton héritage local et te lierait durablement à ta communauté. Le rendement, lui, se fera attendre.',
    category: 'money',
    tags: ['investissement', 'sport', 'heritage'],
    rarity: 'rare',
    weight: 5,
    ageMin: 26,
    ageMax: 39,
    cooldownSeasons: 5,
    prerequisites: [{ type: 'minResource', id: 'financesPersonnelles', value: 55 }],
    choices: [
      choice({
        id: 'investir',
        label: 'Financer le centre sportif',
        stance: 'ambitious',
        riskPreview: 'Héritage local, capital fortement engagé.',
        immediate: [
          fx.makeInvestment({
            investmentId: 'centre_sportif',
            label: 'Centre sportif',
            cost: 120000,
            sector: 'sport',
          }),
          fx.res('reputationSportive', 2),
        ],
        delayed: [
          fx.delayed(4, [
            fx.chance(0.7, [fx.cash(90000), fx.res('reputationSportive', 4)]),
            fx.chance(0.3, [fx.cash(-70000), fx.res('moral', -5)]),
          ]),
        ],
      }),
      choice({
        id: 'passer',
        label: 'Repousser le projet',
        stance: 'prudent',
        riskPreview: 'Trésorerie préservée, rêve en pause.',
        immediate: [fx.res('bienEtre', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_invest_restaurant',
    title: 'Un restaurant à ton nom',
    body: 'Des associés te proposent d’ouvrir un restaurant qui porterait ton nom. C’est visible, sympathique, mais la restauration est un métier exigeant et capricieux. Le succès dépendra autant de l’équipe que de ta notoriété.',
    category: 'money',
    tags: ['investissement', 'restauration'],
    rarity: 'common',
    weight: 7,
    ageMin: 23,
    ageMax: 39,
    cooldownSeasons: 4,
    prerequisites: [{ type: 'minResource', id: 'financesPersonnelles', value: 40 }],
    choices: [
      choice({
        id: 'investir',
        label: 'Ouvrir le restaurant',
        stance: 'financial',
        riskPreview: 'Visibilité, mais métier capricieux.',
        immediate: [
          fx.makeInvestment({
            investmentId: 'restauration',
            label: 'Restaurant',
            cost: 60000,
            sector: 'restauration',
          }),
        ],
        delayed: [
          fx.delayed(3, [
            fx.chance(0.55, [fx.cash(45000), fx.res('popularite', 3)]),
            fx.chance(0.45, [fx.cash(-40000), fx.res('moral', -4)]),
          ]),
        ],
      }),
      choice({
        id: 'passer',
        label: 'Éviter les tracas de gérant',
        stance: 'prudent',
        riskPreview: 'Sérénité gardée, projet abandonné.',
        immediate: [fx.res('bienEtre', 2), fx.res('financesPersonnelles', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p3_invest_speculatif',
    title: 'Le coup qui rapporte gros, dit-on',
    body: 'Un intermédiaire te vante un montage spéculatif au rendement mirobolant. Tout paraît trop beau : c’est souvent le cas. Ton entourage financier tique, mais l’appât du gain rapide est là. Ce n’est pas un jeu de hasard, juste un pari risqué.',
    category: 'money',
    tags: ['investissement', 'risque', 'speculatif'],
    rarity: 'uncommon',
    weight: 5,
    ageMin: 21,
    ageMax: 39,
    cooldownSeasons: 4,
    prerequisites: [{ type: 'minResource', id: 'financesPersonnelles', value: 35 }],
    choices: [
      choice({
        id: 'investir',
        label: 'Tenter le montage spéculatif',
        stance: 'high_risk',
        riskPreview: 'Rendement alléchant, échec très probable.',
        immediate: [
          fx.makeInvestment({
            investmentId: 'projet_speculatif',
            label: 'Projet spéculatif',
            cost: 45000,
            sector: 'speculatif',
          }),
        ],
        delayed: [
          fx.delayed(2, [
            fx.chance(0.2, [fx.cash(72000)]),
            fx.chance(0.8, [fx.cash(-40000), fx.res('moral', -5), fx.res('financesPersonnelles', -6)]),
          ]),
        ],
      }),
      choice({
        id: 'refuser',
        label: 'Refuser ce mirage',
        stance: 'prudent',
        riskPreview: 'Argent protégé, occasion (peut-être) manquée.',
        immediate: [fx.res('financesPersonnelles', 4)],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),
]
