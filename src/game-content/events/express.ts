import { dilemma, choice, fx } from './helpers'
import type { DilemmaDefinition } from '../../game-engine/dilemmas'

/**
 * Catalogue temporaire Phase 4 bis — ~12 dilemmes pour valider la boucle.
 * Le contenu massif arrivera en phase suivante.
 */
export const expressDilemmas: DilemmaDefinition[] = [
  dilemma({
    id: 'express_sport_titularisation',
    title: 'La place de titulaire',
    body: 'Le staff hésite pour le derby. Tu peux forcer ta candidature ou laisser le groupe décider sans te mettre en avant.',
    category: 'match',
    tags: ['sport', 'express'],
    rarity: 'common',
    weight: 20,
    ageMin: 16,
    ageMax: 39,
    choices: [
      choice({
        id: 'push',
        label: 'Réclamer ta place',
        stance: 'ambitious',
        riskPreview: 'Plus de minutes possibles, relation coach incertaine.',
        immediate: [
          fx.resource('confianceEntraineur', -4),
          fx.resource('reputationSportive', 3),
          fx.resource('moral', 4),
        ],
        delayed: [
          {
            seasonOffset: 1,
            effects: [fx.relation('coach', -5), fx.resource('forme', 3)],
          },
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
      choice({
        id: 'wait',
        label: 'Attendre le choix du coach',
        stance: 'prudent',
        riskPreview: 'Moins de tension, minutes non garanties.',
        immediate: [
          fx.relation('coach', 4),
          fx.resource('discipline', 2),
          fx.resource('moral', -2),
        ],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'express_coach_conflict',
    title: 'Remontrance publique',
    body: 'À la mi-temps, le coach te cible devant tout le vestiaire. Les coéquipiers regardent. Tu dois répondre — ou absorber.',
    category: 'coach',
    tags: ['coach', 'express'],
    rarity: 'common',
    weight: 18,
    ageMin: 16,
    ageMax: 39,
    choices: [
      choice({
        id: 'accept',
        label: 'Encaisser et travailler',
        stance: 'loyal',
        riskPreview: 'Respect possible, moral en berne.',
        immediate: [
          fx.relation('coach', 6),
          fx.resource('moral', -6),
          fx.resource('discipline', 4),
        ],
        delayed: [
          {
            seasonOffset: 2,
            effects: [fx.resource('confianceEntraineur', 8)],
          },
        ],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
      choice({
        id: 'push_back',
        label: 'Répondre sèchement',
        stance: 'individualist',
        riskPreview: 'Autorité affirmée, vestiaire divisé.',
        immediate: [
          fx.relation('coach', -10),
          fx.relation('teammates', 3),
          fx.resource('moral', 5),
        ],
        hidden: [fx.hidden('ambition', 2), fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'express_injury_risk',
    title: 'Douleur au genou',
    body: 'Le staff médical veut te sortir. La finale approche. Tu sens que tu peux tenir — au prix d’un risque.',
    category: 'injury',
    tags: ['injury', 'express'],
    rarity: 'uncommon',
    weight: 14,
    ageMin: 16,
    ageMax: 39,
    choices: [
      choice({
        id: 'play',
        label: 'Jouer quand même',
        stance: 'high_risk',
        riskPreview: 'Match sauvé peut-être, santé menacée.',
        immediate: [
          fx.resource('reputationSportive', 6),
          fx.resource('sante', -12),
          fx.resource('forme', -8),
        ],
        delayed: [
          {
            seasonOffset: 1,
            effects: [
              {
                type: 'chance',
                probability: 0.45,
                effects: [
                  fx.resource('sante', -15),
                  fx.setFlag('grave_injury_risk', true),
                ],
              },
            ],
          },
        ],
        hidden: [fx.hidden('fragilitePhysique', 4), fx.hidden('grandsMatchs', 3)],
      }),
      choice({
        id: 'rest',
        label: 'Suivre le staff médical',
        stance: 'prudent',
        riskPreview: 'Santé préservée, place moins sûre.',
        immediate: [
          fx.resource('sante', 8),
          fx.resource('confianceEntraineur', -3),
          fx.resource('reputationSportive', -2),
        ],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'express_transfer_offer',
    title: 'Offre de transfert',
    body: 'Un club étranger propose un contrat immédiat. Ton club actuel veut te garder. Le délai de réponse est court.',
    category: 'transfer',
    tags: ['transfer', 'express'],
    rarity: 'uncommon',
    weight: 12,
    ageMin: 17,
    ageMax: 34,
    choices: [
      choice({
        id: 'leave',
        label: 'Accepter le départ',
        stance: 'ambitious',
        riskPreview: 'Nouveau départ, loyauté locale cassée.',
        immediate: [
          fx.resource('reputationSportive', 5),
          fx.cash(8000),
          fx.relation('coach', -8),
          fx.setFlag('transfer_accepted', true),
        ],
        delayed: [
          {
            seasonOffset: 1,
            effects: [fx.hidden('adaptabilite', 4)],
          },
        ],
        hidden: [fx.hidden('ambition', 4), fx.hidden('loyaute', -4)],
        nextEventIds: [],
      }),
      choice({
        id: 'stay',
        label: 'Rester fidèle',
        stance: 'loyal',
        riskPreview: 'Stabilité, opportunité peut-être manquée.',
        immediate: [
          fx.relation('fans', 6),
          fx.relation('coach', 5),
          fx.resource('moral', 4),
          fx.narrativeDebt(
            'promise_club',
            'Promesse de rester une saison de plus',
            2,
          ),
        ],
        hidden: [fx.hidden('loyaute', 5)],
      }),
    ],
  }),

  dilemma({
    id: 'express_teammate_bond',
    title: 'Le coéquipier isolé',
    body: 'Un jeune du groupe se fait ostraciser après une erreur. Le prendre sous ton aile peut coûter du capital social.',
    category: 'teammates',
    tags: ['teammates', 'express'],
    rarity: 'common',
    weight: 16,
    ageMin: 16,
    ageMax: 39,
    choices: [
      choice({
        id: 'defend',
        label: 'Le défendre publiquement',
        stance: 'ethical',
        riskPreview: 'Allié futur possible, vestiaire tendu.',
        immediate: [
          fx.relation('teammates', -3),
          fx.resource('moral', 3),
          fx.setFlag('defended_teammate', true),
        ],
        delayed: [
          {
            seasonOffset: 3,
            effects: [
              fx.relation('teammates', 10),
              fx.resource('cohesionVestiaire', 8),
              fx.resource('moral', 6),
            ],
          },
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'silent',
        label: 'Ne pas s’en mêler',
        stance: 'prudent',
        riskPreview: 'Pas de vague, peu d’alliés.',
        immediate: [fx.resource('discipline', 2), fx.resource('moral', -2)],
        hidden: [fx.hidden('professionnalisme', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'express_media_quote',
    title: 'Micro tendu',
    body: 'Un journaliste te demande si le coach est dépassé. Une phrase peut tout enflammer.',
    category: 'media',
    tags: ['media', 'express'],
    rarity: 'common',
    weight: 15,
    ageMin: 16,
    ageMax: 39,
    choices: [
      choice({
        id: 'diplomacy',
        label: 'Réponse diplomatique',
        stance: 'prudent',
        riskPreview: 'Calme médiatique, peu de buzz.',
        immediate: [
          fx.relation('media', 3),
          fx.relation('coach', 4),
          fx.resource('popularite', 1),
        ],
      }),
      choice({
        id: 'fire',
        label: 'Phrase ambigüe et virale',
        stance: 'high_risk',
        riskPreview: 'Popularité en hausse, coach froissé.',
        immediate: [
          fx.resource('popularite', 10),
          fx.relation('coach', -8),
          fx.relation('media', 6),
          fx.setFlag('media_storm', true),
        ],
        delayed: [
          {
            seasonOffset: 1,
            effects: [fx.resource('confianceEntraineur', -6)],
          },
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'express_national_call',
    title: 'Première convocation',
    body: 'La sélection nationale t’appelle pour un rassemblement. Ton club craint la fatigue. Tu peux décliner sans le dire clairement.',
    category: 'national_team',
    tags: ['national', 'express'],
    rarity: 'uncommon',
    weight: 11,
    ageMin: 17,
    ageMax: 35,
    prerequisites: [{ type: 'minResource', id: 'reputationSportive', value: 35 }],
    choices: [
      choice({
        id: 'accept_call',
        label: 'Rejoindre la sélection',
        stance: 'ambitious',
        riskPreview: 'Prestige, fatigue accrue.',
        immediate: [
          fx.resource('reputationSportive', 8),
          fx.resource('fatigue', 12),
          fx.resource('popularite', 6),
          fx.setFlag('national_capped', true),
        ],
        hidden: [fx.hidden('grandsMatchs', 3)],
      }),
      choice({
        id: 'decline_soft',
        label: 'Prétexter une gêne physique',
        stance: 'individualist',
        riskPreview: 'Club content, porte nationale moins ouverte.',
        immediate: [
          fx.relation('coach', 5),
          fx.resource('sante', 4),
          fx.resource('reputationSportive', -4),
        ],
        hidden: [fx.hidden('ambition', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'express_money_sponsor',
    title: 'Contrat pub douteux',
    body: 'Une marque propose un gros chèque pour une campagne ambiguë. Ton agent pousse. Ta famille hésite.',
    category: 'money',
    tags: ['money', 'express'],
    rarity: 'common',
    weight: 14,
    ageMin: 16,
    ageMax: 39,
    choices: [
      choice({
        id: 'take',
        label: 'Signer le contrat',
        stance: 'financial',
        riskPreview: 'Liquidités immédiates, image floue.',
        immediate: [
          fx.cash(12000),
          fx.resource('financesPersonnelles', 10),
          fx.resource('popularite', 4),
          fx.relation('family', -4),
        ],
        delayed: [
          {
            seasonOffset: 2,
            effects: [fx.resource('discipline', -5), fx.relation('sponsors', -6)],
          },
        ],
        hidden: [fx.hidden('professionnalisme', -2)],
      }),
      choice({
        id: 'refuse',
        label: 'Refuser poliment',
        stance: 'ethical',
        riskPreview: 'Image propre, moins d’argent.',
        immediate: [
          fx.relation('family', 5),
          fx.resource('discipline', 3),
          fx.cash(-500),
        ],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
    ],
  }),

  dilemma({
    id: 'express_career_end',
    title: 'L’appel de la retraite',
    body: 'Ton corps parle plus fort. Un poste de consultant te tend les bras. Continuer une saison de plus serait un pari.',
    category: 'career_end',
    tags: ['retirement', 'express'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 32,
    ageMax: 39,
    careerStages: ['declin', 'fin_contrat', 'apogee'],
    choices: [
      choice({
        id: 'retire',
        label: 'Annoncer la retraite',
        stance: 'emotional',
        riskPreview: 'Fin de chapitre, héritage figé.',
        immediate: [
          fx.setFlag('wants_retirement', true),
          fx.resource('moral', 8),
          fx.resource('bienEtre', 10),
        ],
        hidden: [fx.hidden('ambition', -5)],
      }),
      choice({
        id: 'one_more',
        label: 'Tenter une saison de plus',
        stance: 'ambitious',
        riskPreview: 'Flamme rallumée, risque physique.',
        immediate: [
          fx.resource('moral', 6),
          fx.resource('sante', -5),
          fx.resource('forme', -4),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('fragilitePhysique', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'express_agent_pressure',
    title: 'L’agent impatient',
    body: 'Ton agent veut renégocier maintenant, quitte à brusquer le club. Tu peux le freiner ou lui laisser la main.',
    category: 'agent',
    tags: ['agent', 'express'],
    rarity: 'common',
    weight: 13,
    ageMin: 18,
    ageMax: 36,
    choices: [
      choice({
        id: 'hold',
        label: 'Calmer ton agent',
        stance: 'loyal',
        riskPreview: 'Club rassuré, salaire moins agressif.',
        immediate: [
          fx.relation('coach', 4),
          fx.cash(1500),
          fx.resource('discipline', 2),
        ],
        hidden: [fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'free_hand',
        label: 'Lui laisser carte blanche',
        stance: 'financial',
        riskPreview: 'Gain possible, crise relationnelle.',
        immediate: [
          fx.cash(9000),
          fx.relation('coach', -6),
          fx.setFlag('unreliable_agent', true),
        ],
        delayed: [
          {
            seasonOffset: 2,
            effects: [
              fx.resource('moral', -8),
              fx.relation('media', -5),
              {
                type: 'queueEvent',
                eventId: 'express_coach_conflict',
                seasonOffset: 0,
              },
            ],
          },
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'express_family_visit',
    title: 'Week-end en famille',
    body: 'Tes proches insistent pour te voir avant un gros match. Le staff préfère un camp fermé.',
    category: 'family',
    tags: ['family', 'express'],
    rarity: 'common',
    weight: 12,
    ageMin: 16,
    ageMax: 39,
    choices: [
      choice({
        id: 'family',
        label: 'Passer le week-end en famille',
        stance: 'emotional',
        riskPreview: 'Moral en hausse, coach moins convaincu.',
        immediate: [
          fx.relation('family', 8),
          fx.resource('bienEtre', 6),
          fx.resource('confianceEntraineur', -3),
        ],
      }),
      choice({
        id: 'camp',
        label: 'Rester au camp',
        stance: 'prudent',
        riskPreview: 'Préparation optimale, proches déçus.',
        immediate: [
          fx.relation('family', -4),
          fx.resource('forme', 4),
          fx.relation('coach', 3),
        ],
        hidden: [fx.hidden('professionnalisme', 2)],
      }),
    ],
  }),

  /** Secours toujours éligible si rien d’autre ne passe. */
  dilemma({
    id: 'express_fallback_training',
    title: 'Une semaine ordinaire',
    body: 'Pas de scandale cette semaine, pas de projecteur braqué sur toi. Juste sept jours d’entraînement ordinaire, ceux qui construisent une carrière sans faire de bruit. Tu peux pousser ton corps plus fort que le groupe, choisir de le protéger en dosant chaque effort, ou consacrer ton énergie à faire progresser un partenaire. Personne ne le remarquera aujourd’hui. Tout le monde le verra dans un an.',
    category: 'training',
    tags: ['fallback', 'express'],
    rarity: 'common',
    weight: 3,
    ageMin: 16,
    ageMax: 45,
    cooldownSeasons: 0,
    unique: false,
    choices: [
      choice({
        id: 'push_training',
        label: 'Aller chercher l’intensité',
        stance: 'ambitious',
        riskPreview: 'Progression possible, fatigue.',
        immediate: [
          fx.resource('forme', 4),
          fx.resource('fatigue', 8),
          fx.stat('endurance', 1),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
      choice({
        id: 'recover',
        label: 'Prioriser la récupération',
        stance: 'prudent',
        riskPreview: 'Santé ok, moins de gain.',
        immediate: [
          fx.resource('sante', 5),
          fx.resource('fatigue', -6),
          fx.resource('forme', 2),
        ],
      }),
      choice({
        id: 'help_group',
        label: 'Aider un partenaire',
        stance: 'loyal',
        riskPreview: 'Cohésion, peu de gloire.',
        immediate: [
          fx.relation('teammates', 5),
          fx.resource('cohesionVestiaire', 4),
          fx.resource('moral', 3),
        ],
        hidden: [fx.hidden('loyaute', 2)],
      }),
    ],
  }),
]
