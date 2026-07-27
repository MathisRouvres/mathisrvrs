import { dilemma, choice, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Dilemmes spécifiques aux postes — emplacement 1.
 * 16 dilemmes : 4 gardien, 4 défenseur, 4 milieu, 4 attaquant.
 */
export const positionDilemmas: DilemmaDefinition[] = [
  // ── GARDIEN ──────────────────────────────────────────────

  dilemma({
    id: 'p5_gk_sortie_pieds',
    title: 'Une sortie à quitte ou double',
    body: 'Contre éclair. L’attaquant adverse a brûlé ta défense et déboule vers ta surface, ballon collé au pied. Sortir dans ses pieds peut tuer l’action net — ou offrir penalty et carton si tu arrives une fraction de seconde trop tard. Rester sur ta ligne te laisse une chance dans le face-à-face, mais c’est lui qui choisira son geste. Le stade hurle. Tu as deux secondes pour trancher.',
    category: 'match',
    tags: ['gardien', 'duel'],
    rarity: 'common',
    weight: 14,
    ageMin: 16,
    ageMax: 39,
    positions: ['gk'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'sortir',
        label: 'Jaillir dans ses pieds pour tuer l’action',
        stance: 'high_risk',
        riskPreview: 'Arrêt héroïque possible, penalty possible.',
        immediate: [
          fx.skillCheck(
            'stat',
            'placement',
            52,
            [
              fx.resource('reputationSportive', 6),
              fx.resource('moral', 5),
              fx.stat('placement', 1),
            ],
            [
              fx.resource('discipline', -6),
              fx.relation('teammates', -4),
              fx.resource('moral', -5),
            ],
          ),
        ],
        hidden: [fx.hidden('grandsMatchs', 2)],
      }),
      choice({
        id: 'rester',
        label: 'Rester sur ta ligne et jouer le face-à-face',
        stance: 'prudent',
        riskPreview: 'Pas de faute possible, duel subi.',
        immediate: [
          fx.resource('discipline', 3),
          fx.resource('confianceEntraineur', 3),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('grandsMatchs', -1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_gk_erreur_gants',
    title: 'Le ballon qui te file entre les gants',
    body: 'Dernière minute d’un match capital. Une frappe anodine glisse entre tes gants et finit au fond : défaite. Dans le vestiaire, personne ne te regarde. En zone mixte, les journalistes attendent un coupable. Tu peux assumer face aux caméras, filer sans un mot, ou rappeler que ta défense t’a laissé seul sur l’action. Chaque mot — ou chaque silence — pèsera lundi matin.',
    category: 'match',
    tags: ['gardien', 'erreur', 'pression'],
    rarity: 'common',
    weight: 12,
    ageMin: 17,
    ageMax: 39,
    positions: ['gk'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'assumer',
        label: 'Prendre la parole et tout assumer face aux caméras',
        stance: 'ethical',
        riskPreview: 'Courage salué, faute gravée dans les mémoires.',
        immediate: [
          fx.relation('media', 5),
          fx.relation('teammates', 4),
          fx.resource('moral', -5),
        ],
        delayed: [
          fx.delayed(1, [fx.resource('reputationSportive', 4), fx.relation('fans', 4)]),
        ],
        hidden: [fx.hidden('resistancePression', 3), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'silence',
        label: 'Filer sans un mot et laisser passer l’orage',
        stance: 'prudent',
        riskPreview: 'Rien à regretter, image qui se dégrade seule.',
        immediate: [
          fx.resource('reputationSportive', -4),
          fx.resource('bienEtre', 3),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('resistancePression', -2), fx.hidden('constance', 1)],
      }),
      choice({
        id: 'defense',
        label: 'Rappeler que ta défense t’a laissé seul',
        stance: 'individualist',
        riskPreview: 'Ta version imposée, vestiaire piqué au vif.',
        immediate: [
          fx.relation('teammates', -8),
          fx.relation('media', 3),
          fx.resource('moral', 3),
          fx.resource('cohesionVestiaire', -6),
        ],
        hidden: [fx.hidden('loyaute', -3)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_gk_concurrence_recrue',
    title: 'Un international débarque dans tes buts',
    body: 'Ton derby héroïque est encore dans toutes les têtes, et pourtant le club officialise l’arrivée d’un gardien international, présenté en grande pompe devant la presse. « Une concurrence saine », sourit le directeur sportif. Tu connais la suite : deux gardiens, une seule place, un vestiaire qui observe. Répondre sur le terrain sans dire un mot, ou monter exiger un statut clair ?',
    category: 'rivalry',
    tags: ['gardien', 'concurrence'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 20,
    ageMax: 37,
    positions: ['gk'],
    cooldownSeasons: 4,
    prerequisites: [{ type: 'hasFlag', key: 'derby_hero' }],
    choices: [
      choice({
        id: 'terrain',
        label: 'Répondre sur le terrain, séance après séance',
        stance: 'ambitious',
        riskPreview: 'Duel long et usant, verdict incertain.',
        immediate: [
          fx.stat('placement', 1),
          fx.resource('fatigue', 6),
          fx.resource('discipline', 3),
        ],
        delayed: [
          fx.delayed(1, [
            fx.resource('confianceEntraineur', 6),
            fx.resource('reputationSportive', 4),
          ]),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'statut',
        label: 'Monter voir le coach et exiger un statut clair',
        stance: 'individualist',
        riskPreview: 'Position affirmée, bras de fer engagé.',
        immediate: [
          fx.relation('coach', -5),
          fx.resource('moral', 5),
          fx.chance(0.35, [fx.resource('reputationSportive', -3)]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('resistancePression', -1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_gk_tirs_au_but',
    title: 'Tirs au but : la nuit du gardien',
    body: 'Quart de finale de la coupe nationale. La prolongation vient de mourir, place aux tirs au but. L’analyste te glisse une fiche : les habitudes des cinq tireurs adverses, côté préféré, course d’élan. Mais sous les projecteurs, trop réfléchir peut te figer sur ta ligne. Éplucher la fiche méthodiquement, ou tout jeter et ne croire que ton instinct ? Cette séance peut faire de toi une légende.',
    category: 'match',
    tags: ['gardien', 'tirs_au_but', 'pression'],
    rarity: 'rare',
    weight: 4,
    ageMin: 17,
    ageMax: 39,
    positions: ['gk'],
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'fiche',
        label: 'Éplucher la fiche, jouer chaque tireur',
        stance: 'prudent',
        riskPreview: 'Méthode solide, tireurs parfois imprévisibles.',
        immediate: [
          fx.skillCheck(
            'stat',
            'tactique',
            48,
            [
              fx.resource('reputationSportive', 8),
              fx.resource('popularite', 6),
              fx.relation('fans', 5),
            ],
            [fx.resource('moral', -6), fx.resource('reputationSportive', -4)],
          ),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('constance', 2)],
      }),
      choice({
        id: 'instinct',
        label: 'Oublier les stats, suivre ton instinct',
        stance: 'high_risk',
        riskPreview: 'Nuit de légende possible, fiasco possible.',
        immediate: [
          fx.skillCheck(
            'hidden',
            'grandsMatchs',
            56,
            [
              fx.resource('reputationSportive', 10),
              fx.resource('popularite', 7),
              fx.relation('media', 5),
            ],
            [fx.resource('moral', -7), fx.resource('reputationSportive', -5)],
          ),
        ],
        hidden: [fx.hidden('grandsMatchs', 3)],
      }),
    ],
  }),

  // ── DÉFENSEUR ────────────────────────────────────────────

  dilemma({
    id: 'p5_def_faute_tactique',
    title: 'La faute qui sauve un but',
    body: 'Perte de ballon fatale au milieu de terrain. L’attaquant adverse file seul vers le but, et tu es le dernier rempart. Le faucher maintenant, c’est un carton certain, peut-être un rouge — mais le but est sauvé et l’équipe te devra ce point. Tenter le retour à la régulière, c’est plus noble ; s’il marque, personne ne retiendra ta bonne intention.',
    category: 'match',
    tags: ['defenseur', 'discipline'],
    rarity: 'common',
    weight: 15,
    ageMin: 16,
    ageMax: 38,
    positions: ['cb', 'fb'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'faucher',
        label: 'Faucher l’attaquant, prendre le carton',
        stance: 'loyal',
        riskPreview: 'But sauvé, sanction assumée.',
        immediate: [
          fx.resource('discipline', -7),
          fx.relation('teammates', 6),
          fx.resource('confianceEntraineur', 4),
          fx.chance(0.25, [fx.resource('reputationSportive', -5), fx.resource('moral', -4)]),
        ],
        hidden: [fx.hidden('loyaute', 3)],
      }),
      choice({
        id: 'reguliere',
        label: 'Tenter le retour à la régulière, sans faute',
        stance: 'ethical',
        riskPreview: 'Course propre, but adverse possible.',
        immediate: [
          fx.skillCheck(
            'stat',
            'vitesse',
            54,
            [fx.resource('reputationSportive', 6), fx.stat('defense', 1)],
            [fx.resource('moral', -6), fx.resource('confianceEntraineur', -5)],
          ),
        ],
        hidden: [fx.hidden('constance', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_def_relance_courte',
    title: 'Relancer court sous le pressing',
    body: 'Le coach exige des relances courtes depuis l’arrière, sans exception. Ce soir, le pressing adverse est féroce : ton gardien te donne le ballon avec un attaquant lancé dans ton dos. Casser la première ligne d’une passe risquée, c’est exactement le jeu qu’on te demande — et un but encaissé si tu la rates. Dégager loin, c’est trahir le plan devant tout le banc.',
    category: 'match',
    tags: ['defenseur', 'relance', 'tactique'],
    rarity: 'common',
    weight: 14,
    ageMin: 16,
    ageMax: 38,
    positions: ['cb', 'fb'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'courte',
        label: 'Casser la première ligne d’une passe risquée',
        stance: 'high_risk',
        riskPreview: 'Relance signature ou cadeau à l’adversaire.',
        immediate: [
          fx.skillCheck(
            'stat',
            'passe',
            52,
            [fx.relation('coach', 5), fx.stat('passe', 1), fx.stat('vision', 1)],
            [
              fx.resource('reputationSportive', -5),
              fx.resource('moral', -5),
              fx.chance(0.3, [fx.resource('confianceEntraineur', -4)]),
            ],
          ),
        ],
        hidden: [fx.hidden('adaptabilite', 2), fx.hidden('resistancePression', 1)],
      }),
      choice({
        id: 'degager',
        label: 'Dégager loin et assumer devant le banc',
        stance: 'prudent',
        riskPreview: 'Danger écarté, plan de jeu piétiné.',
        immediate: [
          fx.relation('coach', -4),
          fx.relation('teammates', 3),
          fx.resource('moral', 2),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('adaptabilite', -1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_def_crampons_traines',
    title: 'Ses crampons traînent à chaque duel',
    body: 'Depuis le coup d’envoi, l’attaquant que tu marques laisse traîner ses crampons dans chaque duel. Tes chevilles sont en sang et l’arbitre ne siffle rien. Le prochain ballon aérien arrive. Y aller plein fer pour marquer ton territoire, quitte à risquer la blessure ou le carton ? Ou te protéger, jouer juste, et laisser croire au stade entier qu’il t’a dominé ?',
    category: 'match',
    tags: ['defenseur', 'duel', 'provocation'],
    rarity: 'common',
    weight: 12,
    ageMin: 16,
    ageMax: 39,
    positions: ['cb', 'fb'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'repondre',
        label: 'Monter plein fer et marquer ton territoire',
        stance: 'high_risk',
        riskPreview: 'Respect imposé, corps et carton en jeu.',
        immediate: [
          fx.skillCheck(
            'stat',
            'puissance',
            50,
            [
              fx.resource('reputationSportive', 5),
              fx.resource('moral', 5),
              fx.relation('teammates', 4),
            ],
            [fx.chance(0.35, [fx.resource('sante', -10)]), fx.resource('discipline', -5)],
          ),
        ],
        hidden: [fx.hidden('resistancePression', 2), fx.hidden('fragilitePhysique', 2)],
      }),
      choice({
        id: 'proteger',
        label: 'Te protéger et jouer juste, malgré les regards',
        stance: 'prudent',
        riskPreview: 'Chevilles préservées, duel perdu en apparence.',
        immediate: [
          fx.resource('sante', 4),
          fx.resource('moral', -4),
          fx.resource('reputationSportive', -3),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('professionnalisme', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_def_changement_poste',
    title: 'Le coach veut te repositionner',
    body: 'Le coach t’attend devant l’écran vidéo avec un projet : te repositionner dans la ligne défensive, à un poste qui n’est pas le tien. Il y voit ta seconde carrière et promet du temps de jeu. Toi, tu y vois des années de repères jetés par la fenêtre et des mois d’apprentissage à découvert. Te réinventer, ou défendre le poste que tu maîtrises ?',
    category: 'coach',
    tags: ['defenseur', 'reconversion'],
    rarity: 'uncommon',
    weight: 8,
    ageMin: 18,
    ageMax: 34,
    positions: ['cb', 'fb'],
    cooldownSeasons: 4,
    unique: true,
    choices: [
      choice({
        id: 'accepter',
        label: 'Accepter de te réinventer à ce nouveau poste',
        stance: 'ambitious',
        riskPreview: 'Nouvel horizon, apprentissage exposé.',
        immediate: [
          fx.resource('confianceEntraineur', 5),
          fx.resource('moral', -3),
          fx.stat('placement', 1),
        ],
        delayed: [
          fx.delayed(1, [
            fx.stat('tactique', 2),
            fx.stat('placement', 1),
            fx.resource('reputationSportive', 3),
          ]),
        ],
        hidden: [fx.hidden('adaptabilite', 4), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'refuser',
        label: 'Défendre le poste que tu maîtrises depuis toujours',
        stance: 'prudent',
        riskPreview: 'Repères conservés, coach contrarié.',
        immediate: [fx.relation('coach', -5), fx.resource('moral', 4)],
        hidden: [fx.hidden('constance', 3), fx.hidden('adaptabilite', -3)],
      }),
    ],
  }),

  // ── MILIEU ───────────────────────────────────────────────

  dilemma({
    id: 'p5_mid_liberte_offensive',
    title: 'Libéré de tes tâches défensives',
    body: 'Causerie d’avant-match. Le coach te libère de tes tâches défensives : « Projette-toi, crée, on assumera derrière. » Sauf que tu connais ton milieu mieux que personne : sans toi à l’équilibre, chaque perte de ballon devient un boulevard pour l’adversaire. Jouer libéré comme demandé et t’exposer aux contres, ou tricher discrètement en gardant un pied derrière, contre la consigne ?',
    category: 'match',
    tags: ['milieu', 'tactique'],
    rarity: 'common',
    weight: 14,
    ageMin: 17,
    ageMax: 37,
    positions: ['cdm', 'cm', 'cam'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'libere',
        label: 'Jouer libéré, comme le coach le demande',
        stance: 'ambitious',
        riskPreview: 'Création débridée, contres dans ton dos.',
        immediate: [
          fx.skillCheck(
            'stat',
            'vision',
            50,
            [
              fx.resource('reputationSportive', 6),
              fx.relation('coach', 5),
              fx.stat('tir', 1),
            ],
            [fx.resource('cohesionVestiaire', -4), fx.resource('reputationSportive', -4)],
          ),
        ],
        hidden: [fx.hidden('ambition', 2), fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'equilibre',
        label: 'Garder un pied à l’équilibre, contre la consigne',
        stance: 'prudent',
        riskPreview: 'Équipe protégée, consigne piétinée.',
        immediate: [
          fx.relation('coach', -5),
          fx.relation('teammates', 4),
          fx.resource('discipline', -3),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('professionnalisme', -1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_mid_tenir_le_score',
    title: 'Tenir le score ou tuer le match',
    body: 'Soixante-quinzième minute d’un match capital : ton équipe mène d’un but et les jambes sont lourdes. C’est toi qui tiens le tempo du milieu. Tout ralentir — ballon gardé au poteau de corner, fautes malignes, rythme cassé — c’est efficace et détesté des tribunes. Continuer d’attaquer pour tuer le match, c’est généreux, et ça ouvre des espaces immenses dans ton dos.',
    category: 'match',
    tags: ['milieu', 'gestion', 'tempo'],
    rarity: 'common',
    weight: 15,
    ageMin: 18,
    ageMax: 38,
    positions: ['cdm', 'cm', 'cam'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'ralentir',
        label: 'Casser le rythme et étouffer la fin de match',
        stance: 'prudent',
        riskPreview: 'Victoire probable, tribunes qui sifflent.',
        immediate: [
          fx.resource('discipline', 4),
          fx.relation('coach', 5),
          fx.relation('fans', -4),
          fx.resource('popularite', -2),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'attaquer',
        label: 'Continuer d’attaquer pour le deuxième but',
        stance: 'high_risk',
        riskPreview: 'Break possible, égalisation possible.',
        immediate: [
          fx.skillCheck(
            'stat',
            'endurance',
            52,
            [
              fx.resource('reputationSportive', 5),
              fx.relation('fans', 6),
              fx.resource('moral', 4),
            ],
            [fx.resource('moral', -6), fx.resource('confianceEntraineur', -5)],
          ),
        ],
        hidden: [fx.hidden('grandsMatchs', 2), fx.hidden('ambition', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_mid_patron_declinant',
    title: 'Le patron du milieu décline',
    body: 'Le patron du milieu a dix ans de club et des jambes qui ne suivent plus. Les duels perdus s’accumulent, l’équipe recule, tout le monde le voit, personne ne le dit. En match, tu commences naturellement à diriger à sa place — et son regard te fusille. Prendre le leadership maintenant, ouvertement, ou rester dans son ombre une saison de plus ?',
    category: 'teammates',
    tags: ['milieu', 'leadership', 'vestiaire'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 21,
    ageMax: 34,
    positions: ['cdm', 'cm', 'cam'],
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'prendre',
        label: 'Prendre le leadership du milieu, ouvertement',
        stance: 'ambitious',
        riskPreview: 'Statut à conquérir, cadre froissé.',
        immediate: [
          fx.stat('leadership', 2),
          fx.relation('teammates', -4),
          fx.resource('reputationSportive', 3),
        ],
        delayed: [
          fx.delayed(1, [fx.relation('teammates', 5), fx.resource('cohesionVestiaire', 4)]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'attendre',
        label: 'Rester dans son ombre une saison de plus',
        stance: 'loyal',
        riskPreview: 'Hiérarchie respectée, équipe qui recule.',
        immediate: [
          fx.relation('teammates', 5),
          fx.resource('cohesionVestiaire', 3),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('ambition', -2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_mid_sentinelle',
    title: 'Sentinelle pure, talent bridé',
    body: 'Nouveau système. Le coach te confie un rôle de sentinelle pure : casser les attaques, donner simple, ne jamais franchir le rond central. L’équipe gagne depuis ce changement, mais ta créativité meurt à petit feu et les recruteurs ne voient plus tes vraies qualités. Accepter le sacrifice qui fait gagner l’équipe, ou demander au coach des libertés dans son système ?',
    category: 'match',
    tags: ['milieu', 'role', 'sacrifice'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 18,
    ageMax: 36,
    positions: ['cdm', 'cm', 'cam'],
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'accepter',
        label: 'Accepter le sacrifice qui fait gagner l’équipe',
        stance: 'loyal',
        riskPreview: 'Équipe servie, talent mis sous cloche.',
        immediate: [
          fx.stat('defense', 2),
          fx.stat('tactique', 1),
          fx.resource('moral', -5),
          fx.relation('coach', 5),
        ],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('ambition', -2)],
      }),
      choice({
        id: 'negocier',
        label: 'Demander des libertés dans le système',
        stance: 'individualist',
        riskPreview: 'Discussion franche, issue incertaine.',
        immediate: [
          fx.skillCheck(
            'resource',
            'confianceEntraineur',
            55,
            [fx.relation('coach', 4), fx.resource('moral', 5)],
            [fx.relation('coach', -6), fx.resource('discipline', -3)],
          ),
        ],
        hidden: [fx.hidden('ambition', 3)],
      }),
    ],
  }),

  // ── ATTAQUANT ────────────────────────────────────────────

  dilemma({
    id: 'p5_att_frappe_ou_passe',
    title: 'Frapper ou servir le héros',
    body: 'Quatre-vingt-dixième minute, score nul. Tu surgis dans la surface, angle fermé, le gardien avance sur toi. Au second poteau, ton coéquipier est seul, bras levés, la cage grande ouverte devant lui. Tu as déjà marqué de là — et raté aussi. Frapper pour un but qui serait le tien, ou servir la passe évidente et lui laisser le rôle du héros ?',
    category: 'match',
    tags: ['attaquant', 'egoisme', 'pression'],
    rarity: 'common',
    weight: 16,
    ageMin: 16,
    ageMax: 39,
    positions: ['winger', 'st'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'frapper',
        label: 'Frapper dans l’angle fermé',
        stance: 'individualist',
        riskPreview: 'Gloire personnelle possible, gâchis possible.',
        immediate: [
          fx.skillCheck(
            'stat',
            'finition',
            55,
            [
              fx.resource('reputationSportive', 7),
              fx.resource('popularite', 6),
              fx.resource('moral', 6),
            ],
            [
              fx.relation('teammates', -6),
              fx.resource('reputationSportive', -4),
              fx.resource('moral', -5),
            ],
          ),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('grandsMatchs', 2)],
      }),
      choice({
        id: 'passer',
        label: 'Servir la passe évidente au second poteau',
        stance: 'loyal',
        riskPreview: 'Équipe d’abord, lumière pour un autre.',
        immediate: [
          fx.relation('teammates', 6),
          fx.resource('cohesionVestiaire', 4),
          fx.resource('popularite', -2),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('ambition', -1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_att_disette',
    title: 'Huit matchs sans marquer',
    body: 'Huit matchs sans marquer. Les journaux comptent les jours, ton nom glisse dans les rumeurs de mercato, et chaque contrôle raté fait soupirer le stade. Deux voies s’offrent à toi : forcer, tenter ta chance sur chaque ballon pour briser la malédiction, ou simplifier ton jeu, te mettre au service de l’équipe et attendre que les buts reviennent d’eux-mêmes.',
    category: 'match',
    tags: ['attaquant', 'disette', 'confiance'],
    rarity: 'common',
    weight: 13,
    ageMin: 17,
    ageMax: 39,
    positions: ['winger', 'st'],
    cooldownSeasons: 3,
    choices: [
      choice({
        id: 'forcer',
        label: 'Forcer ta chance sur chaque ballon',
        stance: 'high_risk',
        riskPreview: 'Déclic possible, spirale égoïste possible.',
        immediate: [
          fx.skillCheck(
            'stat',
            'tir',
            52,
            [
              fx.resource('moral', 7),
              fx.resource('reputationSportive', 5),
              fx.resource('popularite', 4),
            ],
            [
              fx.relation('teammates', -5),
              fx.resource('moral', -6),
              fx.resource('cohesionVestiaire', -3),
            ],
          ),
        ],
        hidden: [fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'collectif',
        label: 'Simplifier ton jeu et servir l’équipe',
        stance: 'prudent',
        riskPreview: 'Patience exigée, compteur toujours bloqué.',
        immediate: [
          fx.relation('teammates', 5),
          fx.relation('coach', 4),
          fx.resource('moral', -3),
        ],
        delayed: [fx.delayed(1, [fx.resource('moral', 6), fx.resource('forme', 4)])],
        hidden: [fx.hidden('constance', 3), fx.hidden('loyaute', 2)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_att_supersub',
    title: 'L’étiquette de supersub',
    body: 'Le buteur recruté cet été débute chaque match. Toi, tu entres à la soixante-dixième minute — et tu marques, souvent. La presse t’a trouvé un surnom : le supersub. Le coach adore sa formule, les supporters scandent ton nom dès l’échauffement. Mais aucun grand attaquant ne s’est construit sur des bouts de matchs. Embrasser ce rôle qui te réussit, ou exiger une place de titulaire ?',
    category: 'rivalry',
    tags: ['attaquant', 'concurrence', 'statut'],
    rarity: 'uncommon',
    weight: 10,
    ageMin: 18,
    ageMax: 36,
    positions: ['winger', 'st'],
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'embrasser',
        label: 'Embrasser le rôle de supersub qui te réussit',
        stance: 'prudent',
        riskPreview: 'Rôle en or, carrière en pointillé.',
        immediate: [
          fx.relation('coach', 5),
          fx.resource('moral', -4),
          fx.resource('reputationSportive', 2),
        ],
        delayed: [fx.delayed(1, [fx.resource('popularite', 5), fx.relation('fans', 5)])],
        hidden: [fx.hidden('adaptabilite', 3), fx.hidden('ambition', -2)],
      }),
      choice({
        id: 'contester',
        label: 'Exiger une vraie place de titulaire',
        stance: 'ambitious',
        riskPreview: 'Ambition affichée, formule gagnante bousculée.',
        immediate: [
          fx.relation('coach', -6),
          fx.resource('moral', 4),
          fx.resource('cohesionVestiaire', -3),
        ],
        hidden: [fx.hidden('ambition', 4), fx.hidden('resistancePression', 1)],
      }),
    ],
  }),

  dilemma({
    id: 'p5_att_course_buteur',
    title: 'La course au trophée de buteur',
    body: 'Deux journées avant la fin du championnat, un seul but te sépare du titre de meilleur buteur. Un sponsor promet une prime, les médias ne parlent que de ça, et tes coéquipiers plaisantent à moitié : « Tu ne passes plus jamais. » Chasser la couronne sur chaque ballon, penalty compris, ou continuer à jouer juste, quitte à voir un autre soulever le trophée ?',
    category: 'match',
    tags: ['attaquant', 'buteur', 'egoisme'],
    rarity: 'uncommon',
    weight: 9,
    ageMin: 19,
    ageMax: 37,
    positions: ['winger', 'st'],
    cooldownSeasons: 4,
    choices: [
      choice({
        id: 'chasser',
        label: 'Chasser la couronne, penalty compris',
        stance: 'individualist',
        riskPreview: 'Trophée à portée, vestiaire qui grince.',
        immediate: [
          fx.relation('teammates', -5),
          fx.skillCheck(
            'stat',
            'finition',
            52,
            [
              fx.resource('popularite', 8),
              fx.cash(20000),
              fx.resource('reputationSportive', 5),
            ],
            [fx.resource('moral', -6), fx.resource('reputationSportive', -3)],
          ),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('loyaute', -2)],
      }),
      choice({
        id: 'juste',
        label: 'Continuer à jouer juste, tant pis pour le trophée',
        stance: 'loyal',
        riskPreview: 'Collectif préservé, couronne envolée.',
        immediate: [
          fx.relation('teammates', 6),
          fx.resource('cohesionVestiaire', 5),
          fx.resource('popularite', -3),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('constance', 2)],
      }),
    ],
  }),
]
