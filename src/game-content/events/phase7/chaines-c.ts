import { dilemma, choice, chainEpisode, fx } from '../helpers'
import type { DilemmaDefinition } from '../../../game-engine/dilemmas'

/**
 * Chaînes C — 4 histoires longues de fin de parcours (15 événements).
 * reconversion : start → doutes → declic → maitrise (pose position_switch) ;
 * selection : liste → cadre → tournoi → transmission (pose national_regular) ;
 * perte : saison → doute → rebond OU spirale (pose level_crisis) ;
 * retraite : signaux → charniere → decision (pose retirement_path, wants_retirement).
 * NB : le validateur ne supporte pas le OU en prerequisites — la chaîne perte
 * s’appuie sur maxResource forme 45 (variante minutes non exprimable).
 */
export const chainesCDilemmas: DilemmaDefinition[] = [
  // ——— Chaîne 1 : la reconversion de poste ———
  dilemma({
    id: 'p7_chain_reconversion_start',
    title: 'Le staff veut te repositionner',
    body: 'Séance vidéo, lumière tamisée. {coach} coupe le son et trace des flèches : tes courses raccourcissent, mais ta lecture du jeu n’a jamais été aussi juste. Il propose de te repositionner un cran plus bas, là où l’on pense plus vite qu’on ne sprinte. Accepter, c’est admettre que ton corps change. Refuser, c’est parier que tes jambes tiendront encore des saisons entières. Le vestiaire attend ta réponse.',
    category: 'coach',
    tags: ['reconversion', 'poste'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 27,
    ageMax: 36,
    unique: true,
    choices: [
      choice({
        id: 'reculer',
        label: 'Accepter de reculer d’un cran',
        stance: 'professional',
        riskPreview: 'Une seconde carrière s’ouvre, l’ancienne se referme.',
        immediate: [
          fx.flag('position_switch'),
          fx.stat('tactique', 2),
          fx.resource('reputationSportive', -3),
          fx.resource('moral', -2),
        ],
        delayed: [
          fx.delayed(1, [
            fx.resource('bienEtre', 6),
            fx.resource('sante', 5),
            fx.queue('p7_chain_reconversion_doutes'),
          ]),
        ],
        hidden: [fx.hidden('adaptabilite', 4)],
      }),
      choice({
        id: 'jambes',
        label: 'Refuser : tes jambes décideront',
        stance: 'high_risk',
        riskPreview: 'Ton identité intacte, ton corps en première ligne.',
        immediate: [
          fx.resource('moral', 3),
          fx.resource('confianceEntraineur', -4),
        ],
        delayed: [
          fx.delayed(1, [fx.resource('forme', -4), fx.resource('fatigue', 6)]),
          fx.delayed(2, [fx.chance(0.4, [fx.resource('sante', -8)])]),
        ],
        hidden: [fx.hidden('fragilitePhysique', 3)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_reconversion_doutes',
    previousEventId: 'p7_chain_reconversion_start',
    title: 'Perdu entre deux postes',
    body: 'Trois mois dans ton nouveau rôle et rien ne coule de source. Tu arrives en retard sur des duels que tu gagnais les yeux fermés, {coequipier} te replace à la voix, et {journaliste} écrit que tu n’es « plus ni l’un ni l’autre ». {coach} propose des séances tactiques supplémentaires pour accélérer l’apprentissage. Au fond de toi, une petite voix réclame ton ancien poste, celui où tout était simple.',
    tags: ['reconversion', 'doute'],
    ageMin: 27,
    echoes: [
      { flag: 'position_switch', text: 'Le jour où tu as accepté de reculer d’un cran.' },
    ],
    choices: [
      choice({
        id: 'persister',
        label: 'S’accrocher au nouveau rôle, séances en plus',
        stance: 'professional',
        riskPreview: 'L’apprentissage coûte avant de payer.',
        immediate: [
          fx.stat('tactique', 1),
          fx.stat('placement', 1),
          fx.resource('fatigue', 5),
          fx.resource('moral', -2),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_reconversion_declic')])],
        hidden: [fx.hidden('adaptabilite', 2), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'ancien',
        label: 'Demander à retrouver ton ancien poste',
        stance: 'emotional',
        riskPreview: 'Le confort du connu, la facture du corps.',
        immediate: [
          fx.removeFlag('position_switch'),
          fx.resource('moral', 4),
          fx.resource('confianceEntraineur', -5),
        ],
        delayed: [
          fx.delayed(1, [fx.resource('forme', -3), fx.resource('fatigue', 4)]),
        ],
        hidden: [fx.hidden('adaptabilite', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_reconversion_declic',
    previousEventId: 'p7_chain_reconversion_doutes',
    title: 'Le soir où tout s’aligne',
    body: 'Match couperet contre {club_rival}. Dès la première relance, le jeu ralentit autour de toi : tu vois les coups deux secondes avant tout le monde. Puis le stade se lève sur un contre adverse — l’ancien toi aurait sprinté soixante mètres pour compenser. Le nouveau toi doit choisir : couvrir l’espace en position, froidement, ou traverser le terrain pour un tacle héroïque qui rappellerait qui tu étais.',
    tags: ['reconversion', 'declic'],
    ageMin: 27,
    echoes: [
      { flag: 'position_switch', text: 'Le jour où tu as accepté de reculer d’un cran.' },
      { flag: 'seen:p7_chain_reconversion_doutes', text: 'Les séances tactiques en plus commencent à payer, appui après appui.' },
    ],
    choices: [
      choice({
        id: 'position',
        label: 'Tenir ta position, laisser parler la lecture',
        stance: 'professional',
        riskPreview: 'La maîtrise se voit moins qu’un exploit.',
        immediate: [
          fx.skillCheck(
            'stat',
            'tactique',
            50,
            [
              fx.resource('reputationSportive', 6),
              fx.resource('confianceEntraineur', 6),
              fx.resource('moral', 4),
            ],
            [fx.resource('reputationSportive', -3), fx.resource('moral', -3)],
          ),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_reconversion_maitrise')])],
        hidden: [fx.hidden('adaptabilite', 3), fx.hidden('constance', 2)],
      }),
      choice({
        id: 'sprint',
        label: 'Sprinter soixante mètres, comme avant',
        stance: 'high_risk',
        riskPreview: 'Le panache d’hier, les muscles d’aujourd’hui.',
        immediate: [
          fx.skillCheck(
            'stat',
            'vitesse',
            60,
            [fx.resource('popularite', 6), fx.resource('moral', 5)],
            [fx.resource('forme', -4), fx.chance(0.35, [fx.resource('sante', -8)])],
          ),
        ],
        hidden: [fx.hidden('fragilitePhysique', 2), fx.hidden('adaptabilite', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_reconversion_maitrise',
    previousEventId: 'p7_chain_reconversion_declic',
    title: 'Maître du nouveau métier',
    body: 'Deux saisons après la bascule, plus personne ne parle de reconversion : on parle de toi comme du métronome de l’équipe. Ton corps te remercie, les analystes citent ton cas en exemple. Un soir, un jeune du centre vient te voir : on veut le repositionner, il a peur, il demande comment tu as fait. Lui transmettre ta méthode, c’est peut-être armer celui qui prendra ta place.',
    tags: ['reconversion', 'transmission'],
    ageMin: 28,
    echoes: [
      { flag: 'position_switch', text: '{years} saisons depuis le jour où tu as accepté de reculer d’un cran.' },
      { flag: 'seen:p7_chain_reconversion_declic', text: 'Le soir du match contre {club_rival}, tu avais tenu ta position. Tout est parti de là.' },
    ],
    choices: [
      choice({
        id: 'transmettre',
        label: 'Tout lui apprendre, même ce qui te menace',
        stance: 'collective',
        riskPreview: 'Un héritier formé de tes mains.',
        immediate: [
          fx.relation('teammates', 6),
          fx.resource('cohesionVestiaire', 5),
          fx.stat('leadership', 2),
        ],
        delayed: [
          fx.delayed(2, [fx.chance(0.4, [fx.resource('forme', -3), fx.resource('moral', -4)])]),
        ],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'secrets',
        label: 'Garder tes secrets, protéger ta place',
        stance: 'individualist',
        riskPreview: 'Ta place défendue, ton image en retrait.',
        immediate: [
          fx.resource('confianceEntraineur', 3),
          fx.resource('moral', 2),
          fx.relation('teammates', -4),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  // ——— Chaîne 2 : la sélection nationale au long cours ———
  dilemma({
    id: 'p7_chain_selection_liste',
    title: 'Ton nom dans la liste élargie',
    body: 'Le sélectionneur national publie sa liste élargie : ton nom y figure, tout en bas, dans les « joueurs suivis ». Le rassemblement tombe en pleine série de matchs décisifs avec ton club, et ta cheville siffle depuis deux semaines. {agent} y voit la vitrine de ta vie. {coach}, lui, rappelle qui paie ton salaire. Tu peux tout donner pour la sélection, ou t’excuser poliment cette fois-ci.',
    category: 'national_team',
    tags: ['selection', 'liste'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 20,
    ageMax: 30,
    unique: true,
    prerequisites: [{ type: 'minResource', id: 'reputationSportive', value: 40 }],
    echoes: [
      { flag: 'national_capped', text: '{years} saisons après ta première cape, le maillot national revient te chercher.' },
      { flag: 'national_declined', text: 'Tu avais dit non à la sélection il y a {years} saisons. On ne t’a pas oublié.' },
    ],
    choices: [
      choice({
        id: 'tout_donner',
        label: 'Répondre présent, tout donner au rassemblement',
        stance: 'ambitious',
        riskPreview: 'La vitrine de ta vie, sur une cheville fragile.',
        immediate: [
          fx.resource('reputationSportive', 4),
          fx.resource('fatigue', 8),
          fx.relation('coach', -3),
          fx.chance(0.25, [fx.resource('sante', -6)]),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_selection_cadre')])],
        hidden: [fx.hidden('ambition', 3), fx.hidden('grandsMatchs', 2)],
      }),
      choice({
        id: 'excuser',
        label: 'T’excuser, privilégier le club et ta cheville',
        stance: 'prudent',
        riskPreview: 'Le corps préservé, le train peut ne pas repasser.',
        immediate: [
          fx.resource('sante', 4),
          fx.relation('coach', 5),
          fx.resource('reputationSportive', -3),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('constance', 2), fx.hidden('ambition', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_selection_cadre',
    previousEventId: 'p7_chain_selection_liste',
    title: 'Cadre de la sélection',
    body: 'Trois rassemblements sans fausse note et le staff national ne te considère plus comme un invité. Avant le match amical, le sélectionneur te convoque : il veut faire de toi un relais du vestiaire — parler aux jeunes, assumer les micros après les défaites, porter le projet jusqu’au grand tournoi continental. Des cadres historiques voient d’un mauvais œil cette promotion express. À toi de choisir ta place.',
    tags: ['selection', 'cadre'],
    ageMin: 21,
    prerequisites: [{ type: 'minResource', id: 'reputationSportive', value: 55 }],
    echoes: [
      { flag: 'seen:p7_chain_selection_liste', text: 'Depuis ce premier rassemblement où tu avais tout donné, tu n’as plus quitté les listes.' },
    ],
    choices: [
      choice({
        id: 'relais',
        label: 'Accepter le rôle de cadre, assumer les micros',
        stance: 'collective',
        riskPreview: 'Une voix qui compte, des anciens qui grincent.',
        immediate: [
          fx.flag('national_regular'),
          fx.stat('leadership', 2),
          fx.resource('reputationSportive', 4),
          fx.relation('media', 3),
          fx.chance(0.3, [fx.relation('teammates', -4)]),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_selection_tournoi')])],
        hidden: [fx.hidden('resistancePression', 2), fx.hidden('ambition', 2)],
      }),
      choice({
        id: 'soldat',
        label: 'Rester un soldat discret du groupe',
        stance: 'professional',
        riskPreview: 'Zéro vague, zéro tribune pour peser.',
        immediate: [
          fx.resource('moral', 3),
          fx.resource('discipline', 3),
          fx.resource('reputationSportive', -2),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_selection_tournoi')])],
        hidden: [fx.hidden('constance', 3)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_selection_tournoi',
    previousEventId: 'p7_chain_selection_cadre',
    title: 'Le grand tournoi continental',
    body: 'Le pays entier vit au rythme du tournoi continental. Quart de finale dans trois jours — et ta cuisse a lâché une alerte à l’entraînement. Le médecin parle d’un risque « réel mais jouable ». Le sélectionneur te laisse décider : serrer les dents pour le match d’une vie, ou céder ta place à un jeune qui piaffe et regarder le quart depuis le banc.',
    tags: ['selection', 'tournoi'],
    ageMin: 22,
    prerequisites: [{ type: 'minResource', id: 'reputationSportive', value: 65 }],
    echoes: [
      { flag: 'national_regular', text: 'Le sélectionneur t’a confié les clés du groupe il y a {years} saisons.' },
      { flag: 'seen:p7_chain_selection_cadre', text: 'Depuis ta promotion parmi les cadres, chaque grand rendez-vous passe par toi.' },
    ],
    choices: [
      choice({
        id: 'jouer',
        label: 'Jouer le quart, cuisse en sursis',
        stance: 'high_risk',
        riskPreview: 'Le match d’une vie, sur un fil.',
        immediate: [
          fx.resource('fatigue', 6),
          fx.skillCheck(
            'hidden',
            'grandsMatchs',
            55,
            [
              fx.resource('reputationSportive', 8),
              fx.resource('popularite', 8),
              fx.relation('fans', 8),
              fx.resource('moral', 6),
            ],
            [
              fx.resource('sante', -10),
              fx.resource('forme', -6),
              fx.resource('moral', -5),
            ],
          ),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_selection_transmission')])],
        hidden: [fx.hidden('grandsMatchs', 3), fx.hidden('fragilitePhysique', 2)],
      }),
      choice({
        id: 'ceder',
        label: 'Céder ta place, protéger ta cuisse',
        stance: 'prudent',
        riskPreview: 'La raison l’emporte, l’histoire s’écrit sans toi.',
        immediate: [
          fx.resource('sante', 5),
          fx.resource('moral', -4),
          fx.resource('reputationSportive', -2),
          fx.relation('fans', -3),
        ],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_selection_transmission')])],
        hidden: [fx.hidden('professionnalisme', 3)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_selection_transmission',
    previousEventId: 'p7_chain_selection_tournoi',
    title: 'Passer le maillot',
    body: 'Les saisons ont passé et un gamin de dix-neuf ans affole les statistiques à ton poste. En rassemblement, il te colle, il t’observe, il apprend à ta table. Le sélectionneur est clair : la transition aura lieu, reste à savoir si tu l’accompagnes ou si tu la subis. Tu peux préparer ta succession à voix haute, ou défendre ta place jusqu’au dernier match.',
    tags: ['selection', 'transmission'],
    ageMin: 28,
    echoes: [
      { flag: 'national_regular', text: '{years} saisons de sélection sans discontinuer. Le maillot a fini par t’appartenir.' },
      { flag: 'seen:p7_chain_selection_tournoi', text: 'Le quart de finale du grand tournoi reste ta référence auprès du groupe.' },
    ],
    choices: [
      choice({
        id: 'accompagner',
        label: 'Préparer ta succession, à visage découvert',
        stance: 'collective',
        riskPreview: 'Une sortie par le haut, des minutes en moins.',
        immediate: [
          fx.stat('leadership', 2),
          fx.relation('teammates', 6),
          fx.resource('reputationSportive', 3),
        ],
        delayed: [fx.delayed(1, [fx.resource('forme', -3)])],
        hidden: [fx.hidden('loyaute', 3), fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'defendre',
        label: 'Défendre ta place jusqu’au dernier match',
        stance: 'individualist',
        riskPreview: 'La flamme intacte, l’image d’un homme qui s’accroche.',
        immediate: [
          fx.resource('moral', 4),
          fx.resource('forme', 3),
          fx.relation('teammates', -4),
          fx.chance(0.35, [fx.resource('reputationSportive', -4)]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('loyaute', -2)],
      }),
    ],
  }),

  // ——— Chaîne 3 : la perte de niveau ———
  dilemma({
    id: 'p7_chain_perte_saison',
    title: 'La saison de trop peu',
    body: 'Les chiffres sont cruels : moitié moins d’actions décisives, deux fois remplaçant sans explication, un corps qui répond une fois sur deux. Pendant ce temps, {rival} enchaîne les récitals avec {club_rival} et {journaliste} prépare un papier intitulé « La panne ». Tu peux affronter le constat de face et repartir du travail, ou monter au créneau médiatique pour gagner du temps.',
    category: 'mental',
    tags: ['crise', 'niveau'],
    rarity: 'rare',
    weight: 5,
    ageMin: 23,
    ageMax: 36,
    unique: true,
    prerequisites: [{ type: 'maxResource', id: 'forme', value: 45 }],
    choices: [
      choice({
        id: 'travail',
        label: 'Encaisser le constat, repartir du travail',
        stance: 'resilient',
        riskPreview: 'Le chemin le plus long, sans garantie.',
        immediate: [
          fx.resource('moral', -3),
          fx.resource('discipline', 4),
          fx.stat('endurance', 1),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_perte_doute')])],
        hidden: [fx.hidden('constance', 3), fx.hidden('resistancePression', 2)],
      }),
      choice({
        id: 'creneau',
        label: 'Contre-attaquer dans la presse, gagner du temps',
        stance: 'media_savvy',
        riskPreview: 'Le récit repris en main, le terrain toujours muet.',
        immediate: [
          fx.relation('media', 4),
          fx.resource('popularite', 3),
          fx.resource('confianceEntraineur', -4),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_perte_doute')])],
        hidden: [fx.hidden('resistancePression', -2), fx.hidden('professionnalisme', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_perte_doute',
    previousEventId: 'p7_chain_perte_saison',
    title: 'Le doute devient public',
    body: 'Les sifflets tombent désormais de ta propre tribune, et le papier de {journaliste} — « Fin de cycle ? » — tourne en boucle. Au club, {coequipier} propose de t’embarquer dans ses séances du soir, avec le groupe des anciens : du travail, des repas, zéro écran. Une autre voie te tente : couper les téléphones, t’isoler, et régler ça seul, comme tu as toujours tout réglé.',
    tags: ['crise', 'doute'],
    ageMin: 23,
    echoes: [
      { flag: 'seen:p7_chain_perte_saison', text: 'La saison de trop peu a laissé des traces : chaque ballon perdu réveille les sifflets.' },
    ],
    choices: [
      choice({
        id: 'groupe',
        label: 'T’appuyer sur {coequipier} et le groupe',
        stance: 'collective',
        riskPreview: 'Avouer que tu as besoin d’aide, devant tous.',
        immediate: [
          fx.resource('cohesionVestiaire', 5),
          fx.relation('teammates', 5),
          fx.resource('moral', 3),
          fx.resource('fatigue', 4),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_perte_rebond')])],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'seul',
        label: 'Couper les téléphones et t’isoler pour travailler',
        stance: 'individualist',
        riskPreview: 'Ta méthode de toujours, dans un silence inédit.',
        immediate: [
          fx.resource('discipline', 3),
          fx.resource('bienEtre', -4),
          fx.relation('teammates', -3),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_perte_spirale')])],
        hidden: [fx.hidden('resistancePression', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_perte_rebond',
    previousEventId: 'p7_chain_perte_doute',
    title: 'Le match qui te relève',
    body: 'Soir de coupe nationale, stade plein, et soudain tout revient : les appuis, la justesse, l’insolence. Tu es partout, le public scande à nouveau ton nom. Dans la zone mixte, {journaliste} — le même qui écrivait « La panne » — tend son micro pour l’interview du retour. Tu peux rendre le mérite au groupe qui t’a porté, ou savourer ta revanche en rappelant qui avait tort.',
    tags: ['crise', 'rebond'],
    ageMin: 23,
    echoes: [
      { flag: 'seen:p7_chain_perte_doute', text: 'Les séances du soir avec {coequipier} t’ont remis debout, une passe après l’autre.' },
    ],
    choices: [
      choice({
        id: 'humble',
        label: 'Rendre le mérite au groupe, rester dans l’effort',
        stance: 'resilient',
        riskPreview: 'La lumière partagée éclaire moins fort.',
        immediate: [
          fx.resource('cohesionVestiaire', 6),
          fx.relation('teammates', 5),
          fx.resource('confianceEntraineur', 4),
          fx.resource('popularite', -2),
        ],
        hidden: [fx.hidden('constance', 3), fx.hidden('professionnalisme', 2)],
      }),
      choice({
        id: 'revanche',
        label: 'Rappeler à {journaliste} qui avait tort',
        stance: 'media_savvy',
        riskPreview: 'Une revanche savoureuse, une presse rancunière.',
        immediate: [
          fx.resource('popularite', 5),
          fx.resource('moral', 5),
          fx.relation('media', -5),
          fx.chance(0.3, [fx.resource('reputationSportive', -3)]),
        ],
        hidden: [fx.hidden('resistancePression', 2), fx.hidden('professionnalisme', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_perte_spirale',
    previousEventId: 'p7_chain_perte_doute',
    title: 'La spirale silencieuse',
    body: 'L’isolement n’a rien réparé. Les nuits raccourcissent, les mains deviennent moites avant l’échauffement, et ce silence de plomb t’accompagne quand tu entres dans le vestiaire. Le médecin du club a alerté la direction : un accompagnement spécialisé existe, discret, mais il faudra accepter le mot « crise ». L’autre option, c’est celle de toujours : serrer les dents, jouer quand même, et prier pour que personne ne voie rien.',
    tags: ['crise', 'spirale'],
    ageMin: 23,
    echoes: [
      { flag: 'seen:p7_chain_perte_doute', text: 'Tu avais choisi de t’isoler pour régler ça seul. Le silence a grandi avec toi.' },
    ],
    choices: [
      choice({
        id: 'accompagnement',
        label: 'Accepter l’accompagnement, poser le mot crise',
        stance: 'resilient',
        riskPreview: 'Un mot qui soigne, un mot qui peut fuiter.',
        immediate: [
          fx.flag('level_crisis'),
          fx.resource('bienEtre', 6),
          fx.resource('moral', 3),
          fx.chance(0.3, [fx.resource('reputationSportive', -3)]),
        ],
        delayed: [fx.delayed(1, [fx.resource('forme', 5), fx.resource('sante', 4)])],
        hidden: [fx.hidden('resistancePression', 3)],
      }),
      choice({
        id: 'facade',
        label: 'Serrer les dents et sauver la façade',
        stance: 'high_risk',
        riskPreview: 'Les apparences tiennent, jusqu’à quand ?',
        immediate: [
          fx.flag('level_crisis'),
          fx.resource('moral', -4),
          fx.resource('fatigue', 6),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.5, [
              fx.flag('career_crisis'),
              fx.resource('forme', -8),
              fx.resource('sante', -6),
            ]),
          ]),
        ],
        hidden: [fx.hidden('fragilitePhysique', 3), fx.hidden('resistancePression', -3)],
      }),
    ],
  }),

  // ——— Chaîne 4 : le chemin vers la retraite ———
  dilemma({
    id: 'p7_chain_retraite_signaux',
    title: 'Les premiers signaux',
    body: 'Rien de spectaculaire, juste des détails qui s’additionnent : trois jours pour récupérer au lieu d’un, le kiné qui parle de « gestion », toi qui regardes l’horloge à l’entraînement. Un soir, {agent} pose la question interdite : « Tu as pensé à l’après ? » Tu peux ouvrir ce dossier maintenant, à tête reposée, ou le refermer d’un geste et laisser le terrain décider pour toi.',
    category: 'career_end',
    tags: ['retraite', 'signaux'],
    rarity: 'uncommon',
    weight: 6,
    ageMin: 31,
    ageMax: 38,
    unique: true,
    choices: [
      choice({
        id: 'ouvrir',
        label: 'Ouvrir le dossier de l’après, sans honte',
        stance: 'professional',
        riskPreview: 'La lucidité apaise, et vieillit d’un coup.',
        immediate: [
          fx.flag('retirement_path'),
          fx.resource('bienEtre', 5),
          fx.resource('moral', -2),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_retraite_charniere')])],
        hidden: [fx.hidden('adaptabilite', 3)],
      }),
      choice({
        id: 'refermer',
        label: 'Refermer le dossier, le terrain décidera',
        stance: 'emotional',
        riskPreview: 'Le déni protège, jusqu’au jour où il lâche.',
        immediate: [fx.resource('moral', 4), fx.resource('bienEtre', -3)],
        delayed: [fx.delayed(2, [fx.queue('p7_chain_retraite_charniere')])],
        hidden: [fx.hidden('ambition', 2), fx.hidden('adaptabilite', -2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_retraite_charniere',
    previousEventId: 'p7_chain_retraite_signaux',
    title: 'L’année charnière',
    body: 'Fin de saison, bureau du président. Le club propose une prolongation d’un an avec un rôle assumé de rotation : moins de minutes, plus de transmission, un salaire revu à la baisse. {agent} a aussi sondé le marché : un club de milieu de tableau t’offre un statut de titulaire, une dernière aventure à l’ancienne. Ton corps vote pour la rotation. Ton orgueil a déjà fait ses valises.',
    tags: ['retraite', 'charniere'],
    ageMin: 32,
    echoes: [
      { flag: 'retirement_path', text: 'Depuis {years} saisons, le dossier de l’après est ouvert sur un coin de ton bureau.' },
      { flag: 'seen:p7_chain_retraite_signaux', text: 'Les signaux ne mentaient pas : ton corps compte désormais en jours de récupération.' },
    ],
    choices: [
      choice({
        id: 'rotation',
        label: 'Signer le rôle de rotation, transmettre',
        stance: 'professional',
        riskPreview: 'Une fin maîtrisée, un statut en berne.',
        immediate: [
          fx.resource('sante', 4),
          fx.resource('bienEtre', 4),
          fx.resource('reputationSportive', -3),
          fx.cash(-15000),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_retraite_decision')])],
        hidden: [fx.hidden('professionnalisme', 3), fx.hidden('loyaute', 2)],
      }),
      choice({
        id: 'aventure',
        label: 'Partir titulaire, une dernière aventure',
        stance: 'ambitious',
        riskPreview: 'L’orgueil servi, le corps en découvert.',
        immediate: [
          fx.resource('moral', 6),
          fx.resource('fatigue', 8),
          fx.chance(0.35, [fx.resource('sante', -6)]),
        ],
        delayed: [fx.delayed(1, [fx.queue('p7_chain_retraite_decision')])],
        hidden: [fx.hidden('ambition', 3), fx.hidden('fragilitePhysique', 2)],
      }),
    ],
  }),

  chainEpisode({
    id: 'p7_chain_retraite_decision',
    previousEventId: 'p7_chain_retraite_charniere',
    title: 'Le jour de la décision',
    body: 'Reprise de la préparation. Douze ans que tu vis ce rituel, et pour la première fois tu te demandes si c’est le dernier. Ta famille n’ose plus poser la question, {coequipier} te charrie sans y croire, le club attend un signe pour construire l’effectif. Annoncer une saison d’adieu, c’est choisir ta sortie. Repartir sans rien dire, c’est laisser la porte ouverte — et le doute avec.',
    tags: ['retraite', 'decision'],
    ageMin: 33,
    echoes: [
      { flag: 'retirement_path', text: 'Cela fait {years} saisons que tu prépares l’après sans oser prononcer le mot fin.' },
      { flag: 'seen:p7_chain_retraite_charniere', text: 'L’année charnière est passée. Le sursis que tu avais négocié touche à sa fin.' },
    ],
    choices: [
      choice({
        id: 'adieu',
        label: 'Annoncer ta saison d’adieu, choisir ta sortie',
        stance: 'emotional',
        riskPreview: 'Une sortie choisie, un deuil qui commence.',
        immediate: [
          fx.flag('wants_retirement'),
          fx.resource('bienEtre', 6),
          fx.resource('popularite', 5),
          fx.relation('fans', 6),
          fx.relation('family', 6),
          fx.resource('moral', -3),
        ],
        hidden: [fx.hidden('adaptabilite', 2)],
      }),
      choice({
        id: 'repartir',
        label: 'Repartir sans rien annoncer, porte ouverte',
        stance: 'high_risk',
        riskPreview: 'Encore une danse, aux conditions du corps.',
        immediate: [
          fx.removeFlag('retirement_path'),
          fx.resource('moral', 5),
          fx.resource('fatigue', 5),
        ],
        delayed: [
          fx.delayed(1, [
            fx.chance(0.4, [fx.resource('sante', -8), fx.resource('forme', -5)]),
          ]),
        ],
        hidden: [fx.hidden('ambition', 3), fx.hidden('fragilitePhysique', 2)],
      }),
    ],
  }),
]
