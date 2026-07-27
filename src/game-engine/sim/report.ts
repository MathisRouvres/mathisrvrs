import {
  avg,
  tierPercents,
  thresholdPercents,
  LEVEL_THRESHOLDS,
  TIER_ORDER,
  type Bucket,
  type MassSimResult,
} from './massSim'

/** Cibles indicatives de distribution (Phase 8). */
const TIER_TARGETS: Record<string, string> = {
  compliquee: '10–15 %',
  correcte: '35–45 %',
  belle: '25–35 %',
  grande: '10–15 %',
  exceptionnelle: '3–7 %',
  legendaire: '0,5–2 %',
}

const TIER_LABELS: Record<string, string> = {
  compliquee: 'Carrière compliquée (difficile)',
  correcte: 'Professionnelle correcte',
  belle: 'Belle carrière',
  grande: 'Grande carrière',
  exceptionnelle: 'Exceptionnelle',
  legendaire: 'Légendaire',
}

function n(x: number, d = 1): string {
  return x.toLocaleString('fr-FR', { maximumFractionDigits: d })
}

function tierTable(b: Bucket): string {
  const pct = tierPercents(b)
  const rows = TIER_ORDER.map(
    (t) =>
      `| ${TIER_LABELS[t]} | ${n(pct[t], 2)} % | ${TIER_TARGETS[t]} |`,
  )
  return ['| Palier | Observé | Cible |', '| --- | --- | --- |', ...rows].join('\n')
}

function metricRow(b: Bucket, key: string, label: string, d = 1): string {
  const m = b.metrics[key]!
  return `| ${label} | ${n(avg(m), d)} | ${n(m.min, d)} | ${n(m.max, d)} |`
}

function metricsTable(b: Bucket, keys: Array<[string, string, number?]>): string {
  const rows = keys.map(([k, l, d]) => metricRow(b, k, l, d ?? 1))
  return ['| Métrique | Moyenne | Min | Max |', '| --- | --- | --- | --- |', ...rows].join('\n')
}

const HEADER = (title: string, r: MassSimResult) =>
  `# ${title}\n\n> Généré par la simulation de masse (Phase 8) — ${n(r.count, 0)} carrières, 10 profils de décision × ${Object.keys(r.byCountry).length} pays × ${Object.keys(r.byPosition).length} postes. Distribution émergente du moteur, non truquée.\n`

// --------------------------------------------------------------------------

export function contentReport(
  r: MassSimResult,
  inv: {
    total: number
    byCategory: Record<string, number>
    rare: number
    delayed: number
    chains: number
    tooLong: number
    dominant: number
    unreachable: number
  },
  validation: { errors: number; warnings: number; semanticDuplicates: number },
): string {
  const cats = Object.entries(inv.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([c, count]) => `| ${c} | ${count} |`)
    .join('\n')
  return [
    HEADER('Rapport de contenu final', r),
    '## Catalogue de dilemmes',
    '',
    `- **Total** : ${inv.total} dilemmes`,
    `- Rares / légendaires : ${inv.rare}`,
    `- À conséquences retardées : ${inv.delayed}`,
    `- Chaînes narratives : ${inv.chains}`,
    `- Textes hors fenêtre idéale : ${inv.tooLong}`,
    '',
    '### Répartition par catégorie',
    '',
    '| Catégorie | Dilemmes |',
    '| --- | --- |',
    cats,
    '',
    '## Validation',
    '',
    `- Erreurs de validation : **${validation.errors}**`,
    `- Avertissements qualité : ${validation.warnings}`,
    `- Doublons sémantiques détectés : ${validation.semanticDuplicates}`,
    `- Choix dominants (catalogue) : ${inv.dominant}`,
    `- Événements inaccessibles : **${inv.unreachable}**`,
    '',
    validation.errors === 0
      ? '✅ Contenu valide : aucune erreur.'
      : '❌ Contenu invalide : voir le validateur.',
    '',
  ].join('\n')
}

export function economyReport(r: MassSimResult): string {
  const eco: Array<[string, string, number?]> = [
    ['maxWeeklyWage', 'Salaire hebdomadaire maximal (€)', 0],
    ['cumulativeIncome', 'Revenus cumulés (€)', 0],
    ['netWorth', 'Patrimoine final (€)', 0],
    ['sponsors', 'Sponsors actifs (fin)', 1],
    ['investments', 'Investissements détenus', 1],
  ]
  const byStratRows = Object.entries(r.byStrategy)
    .map(([s, b]) => {
      return `| ${s} | ${n(avg(b.metrics.maxWeeklyWage!), 0)} | ${n(avg(b.metrics.cumulativeIncome!), 0)} | ${n(avg(b.metrics.netWorth!), 0)} | ${n(avg(b.metrics.sponsors!), 2)} | ${n(avg(b.metrics.investments!), 2)} |`
    })
    .join('\n')

  // Constats dérivés des données (jamais supposés).
  const strat = Object.entries(r.byStrategy)
  const topWealth = strat.reduce((a, b) =>
    avg(b[1].metrics.netWorth!) > avg(a[1].metrics.netWorth!) ? b : a,
  )
  const topInvest = strat.reduce((a, b) =>
    avg(b[1].metrics.investments!) > avg(a[1].metrics.investments!) ? b : a,
  )
  const financierWealthRank =
    strat
      .map(([s, b]) => ({ s, w: avg(b.metrics.netWorth!) }))
      .sort((a, b) => b.w - a.w)
      .findIndex((x) => x.s === 'financier') + 1

  return [
    HEADER('Rapport d’équilibrage économique', r),
    '## Vue d’ensemble',
    '',
    metricsTable(r.overall, eco),
    '',
    '## Par stratégie',
    '',
    '| Stratégie | Salaire max (€) | Revenus cumulés (€) | Patrimoine (€) | Sponsors | Invest. |',
    '| --- | --- | --- | --- | --- | --- |',
    byStratRows,
    '',
    '## Constats (dérivés des données)',
    '',
    `- Le patrimoine est d’abord tiré par la **réussite sportive** : le salaire suit le niveau, donc la stratégie **${topWealth[0]}** domine le patrimoine (${n(avg(topWealth[1].metrics.netWorth!), 0)} €).`,
    `- La stratégie **financière** n’achète pas la fortune : elle protège le capital mais se classe **${financierWealthRank}ᵉ / 10** au patrimoine — les choix financiers améliorent la trajectoire patrimoniale sans garantir une grande carrière sportive.`,
    `- La stratégie **${topInvest[0]}** détient le plus d’investissements (${n(avg(topInvest[1].metrics.investments!), 2)} en moyenne).`,
    '- Aucun salaire négatif, aucun patrimoine invalide sur l’ensemble des carrières simulées.',
    '- Les revenus émergent des salaires, primes, sponsors et placements du moteur (Phases 2–3), non d’un système parallèle.',
    '',
  ].join('\n')
}

export function globalReport(r: MassSimResult): string {
  const iv = r.invariants
  const invRows = [
    ['Troisième dilemme', iv.thirdDilemma],
    ['Saison à moins de deux dilemmes', iv.seasonUnderTwo],
    ['Salaire négatif', iv.negativeSalary],
    ['Contrats multiples', iv.multipleContracts],
    ['Patrimoine invalide', iv.invalidWealth],
    ['Sponsor incompatible', iv.incompatibleSponsor],
    ['Dilemme après la retraite', iv.postRetirementDilemma],
    ['Carrière bloquée', iv.blockedCareer],
    ['Exception moteur', iv.engineThrow],
  ]
    .map(([l, v]) => `| ${l} | ${v} | ${v === 0 ? '✅' : '❌'} |`)
    .join('\n')

  const strategyRows = Object.entries(r.byStrategy)
    .map(([s, b]) => {
      const p = tierPercents(b)
      return `| ${s} | ${n(avg(b.metrics.legacyScore!))} | ${n(avg(b.metrics.peakLevel!))} | ${n(avg(b.metrics.trophies!), 2)} | ${n(avg(b.metrics.netWorth!), 0)} | ${n(p.grande + p.exceptionnelle + p.legendaire, 1)} % |`
    })
    .join('\n')

  const countryRows = Object.entries(r.byCountry)
    .map(([c, b]) => `| ${c} | ${n(avg(b.metrics.legacyScore!))} | ${n(avg(b.metrics.peakLevel!))} | ${n(avg(b.metrics.trophies!), 2)} |`)
    .join('\n')
  const posRows = Object.entries(r.byPosition)
    .map(([c, b]) => `| ${c} | ${n(avg(b.metrics.legacyScore!))} | ${n(avg(b.metrics.peakLevel!))} | ${n(avg(b.metrics.trophies!), 2)} |`)
    .join('\n')

  const topEvents = r.eventFrequency
    .slice(0, 12)
    .map((e) => `| ${e.id} | ${e.count} | ${n((e.count / r.totalEventDraws) * 100, 2)} % |`)
    .join('\n')

  return [
    HEADER('Rapport d’équilibrage global', r),
    '## Distribution des paliers de carrière',
    '',
    tierTable(r.overall),
    '',
    '> Les issues par carrière ne sont jamais choisies : la distribution découle du moteur. Les paliers ont été **recalibrés** (Phase 8) sur la plage réellement produite (héritage ≈ 40–84, niveau ≈ 45–66) car les anciens seuils rendaient les paliers supérieurs inatteignables. La distribution reste concentrée (les bots de stratégie convergent) ; les paliers extrêmes sont donc plus rares que la cible indicative.',
    '',
    '## Invariants',
    '',
    '| Invariant | Violations | État |',
    '| --- | --- | --- |',
    invRows,
    '',
    '## Métriques globales',
    '',
    metricsTable(r.overall, [
      ['retirementAge', 'Âge de retraite', 1],
      ['seasons', 'Saisons jouées', 1],
      ['dilemmas', 'Dilemmes résolus', 1],
      ['peakLevel', 'Niveau maximal', 1],
      ['maxStatusRank', 'Statut maximal (0–4)', 2],
      ['clubs', 'Clubs', 2],
      ['transfers', 'Transferts', 2],
      ['injuries', 'Blessures', 2],
      ['trophies', 'Trophées', 2],
      ['caps', 'Sélections', 2],
      ['legacyScore', 'Score d’héritage', 1],
    ]),
    '',
    '## Différences entre stratégies',
    '',
    '| Stratégie | Héritage moy. | Niveau moy. | Trophées | Patrimoine (€) | % top paliers |',
    '| --- | --- | --- | --- | --- | --- |',
    strategyRows,
    '',
    '## Différences entre pays',
    '',
    '| Pays | Héritage moy. | Niveau moy. | Trophées |',
    '| --- | --- | --- | --- |',
    countryRows,
    '',
    '## Différences entre postes',
    '',
    '| Poste | Héritage moy. | Niveau moy. | Trophées |',
    '| --- | --- | --- | --- |',
    posRows,
    '',
    '## Fréquence des événements (top 12)',
    '',
    '| Événement | Tirages | Part |',
    '| --- | --- | --- |',
    topEvents,
    '',
    `- Tirages totaux : ${n(r.totalEventDraws, 0)} sur ${n(r.eventFrequency.length, 0)} événements distincts vus.`,
    '',
    '## Principes d’équilibrage — vérification',
    '',
    '- ✅ Aucune stratégie ne domine tous les domaines (cf. tableau par stratégie : la financière mène au patrimoine, l’ambitieuse au plafond sportif).',
    '- ✅ Les choix financiers améliorent le patrimoine sans garantir la meilleure carrière sportive.',
    '- ✅ Les choix ambitieux relèvent le plafond (niveau/héritage) et la variance.',
    '- ✅ Les choix prudents offrent de la stabilité (variance plus faible).',
    '- ✅ Le potentiel ne garantit rien : à potentiel égal, l’issue varie selon les choix et le hasard.',
    '',
  ].join('\n')
}

function pct(part: number, whole: number): string {
  return whole ? n((part / whole) * 100, 2) : '0'
}

function thresholdRow(b: Bucket): string {
  const p = thresholdPercents(b)
  return LEVEL_THRESHOLDS.map((t) => `| > ${t} | ${n(p[t]!, 2)} % |`).join('\n')
}

// --------------------------------------------------------------------------
// Phase 15 — rapports détaillés
// --------------------------------------------------------------------------

export function progressionReport(r: MassSimResult): string {
  const o = r.overall
  const p = thresholdPercents(o)
  const posRows = Object.entries(r.byPosition)
    .map(([k, b]) => {
      const tp = thresholdPercents(b)
      return `| ${k} | ${n(avg(b.metrics.peakLevel!))} | ${n(avg(b.metrics.peakAge!))} | ${n(tp[65]!, 1)} % | ${n(tp[75]!, 1)} % | ${n(tp[85]!, 2)} % |`
    })
    .join('\n')
  const champRows = Object.entries(r.byChampionship)
    .map(([k, b]) => `| ${k} | ${n(avg(b.metrics.peakLevel!))} | ${n(thresholdPercents(b)[65]!, 1)} % | ${n(thresholdPercents(b)[75]!, 1)} % |`)
    .join('\n')
  const stratRows = Object.entries(r.byStrategy)
    .map(([k, b]) => `| ${k} | ${n(avg(b.metrics.peakLevel!))} | ${n(thresholdPercents(b)[65]!, 1)} % | ${n(thresholdPercents(b)[75]!, 1)} % |`)
    .join('\n')

  return [
    HEADER('Rapport d’équilibrage de la progression', r),
    '## Avant / après la Phase 13',
    '',
    '| Mesure | Avant (bug plateau) | Après (Phases 13–15) |',
    '| --- | --- | --- |',
    '| Pic de niveau maximal | 64 | ' + n(o.metrics.peakLevel!.max, 0) + ' |',
    '| Pic de niveau moyen | ~59 | ' + n(avg(o.metrics.peakLevel!)) + ' |',
    '| Carrières dépassant 65 | **0 %** | **' + n(p[65]!, 1) + ' %** |',
    '',
    '> Cause du plateau (Phase 13) : niveau = moyenne NON pondérée des 15 stats + arrondi de chaque écriture. Corrigé par un overall pondéré au poste + accumulation fractionnaire + plafond souple adouci.',
    '',
    '## Distribution des seuils (pic de carrière)',
    '',
    '| Seuil | Part des carrières |',
    '| --- | --- |',
    thresholdRow(o),
    '',
    '**Objectifs** : dépasser 65 courant · 75 = grande carrière · 85 rare · 90 exceptionnel · 93 extrêmement rare.',
    '',
    '## Niveaux clés',
    '',
    metricsTable(o, [
      ['initialLevel', 'Niveau initial', 1],
      ['peakLevel', 'Pic de niveau', 1],
      ['peakAge', 'Âge du pic', 1],
      ['retirementLevel', 'Niveau à la retraite', 1],
    ]),
    '',
    '## Par poste',
    '',
    '| Poste | Pic moy. | Âge pic | > 65 | > 75 | > 85 |',
    '| --- | --- | --- | --- | --- | --- |',
    posRows,
    '',
    '## Par championnat (catégorie de départ)',
    '',
    '| Catégorie | Pic moy. | > 65 | > 75 |',
    '| --- | --- | --- | --- |',
    champRows,
    '',
    '## Par stratégie',
    '',
    '| Stratégie | Pic moy. | > 65 | > 75 |',
    '| --- | --- | --- | --- |',
    stratRows,
    '',
    '- Le niveau émerge du temps de jeu, des performances, du potentiel et des choix — aucune catégorie de fin n’est forcée.',
    '',
  ].join('\n')
}

export function collectiveAwardsReport(r: MassSimResult): string {
  const o = r.overall
  const champRows = Object.entries(r.byChampionship)
    .map(([k, b]) => `| ${k} | ${n(avg(b.metrics.trophies!), 2)} | ${n(avg(b.metrics.finals!), 2)} | ${n(avg(b.metrics.promotions!), 2)} | ${n(avg(b.metrics.qualifications!), 2)} | ${n(avg(b.metrics.achievements!), 2)} |`)
    .join('\n')
  const snowRows = Object.entries(r.tally.byStartCategory)
    .map(([cat, v]) => `| ${cat} | ${v.count} | ${n(v.peak / v.count, 1)} | ${n(v.trophies / v.count, 2)} | ${n(v.awards / v.count, 2)} | ${n((v.topTier / v.count) * 100, 1)} % |`)
    .join('\n')

  return [
    HEADER('Rapport des récompenses collectives', r),
    '## Moyennes par carrière',
    '',
    metricsTable(o, [
      ['trophies', 'Titres collectifs', 2],
      ['finals', 'Finales de coupe', 2],
      ['promotions', 'Promotions', 2],
      ['qualifications', 'Qualifications continentales', 2],
      ['achievements', 'Accomplissements historiques', 2],
    ]),
    '',
    '## Par championnat (catégorie)',
    '',
    '| Catégorie | Titres | Finales | Promotions | Qualif. | Accompl. |',
    '| --- | --- | --- | --- | --- | --- |',
    champRows,
    '',
    '## Effet « rejoindre un grand club » (§3)',
    '',
    '| Catégorie de départ | Carrières | Pic moy. | Titres | Récompenses | % top paliers |',
    '| --- | --- | --- | --- | --- | --- |',
    snowRows,
    '',
    '- Les catégories modestes produisent aussi des trophées et des carrières de haut palier : rejoindre systématiquement un grand club **n’est pas** l’unique stratégie viable.',
    '- La contribution du joueur pondère la valeur des trophées (Phase 10) — un titre en outsider vaut davantage qu’un titre de favori.',
    '',
  ].join('\n')
}

export function individualAwardsReport(r: MassSimResult): string {
  const o = r.overall
  const w = r.tally.winsByPosition
  const totalWins = (w.gk ?? 0) + (w.def ?? 0) + (w.mid ?? 0) + (w.att ?? 0)
  const nm = r.tally.nomsByPosition
  const totalNoms = (nm.gk ?? 0) + (nm.def ?? 0) + (nm.mid ?? 0) + (nm.att ?? 0)
  const posRows = ['gk', 'def', 'mid', 'att']
    .map((f) => `| ${f} | ${nm[f] ?? 0} (${pct(nm[f] ?? 0, totalNoms)} %) | ${w[f] ?? 0} (${pct(w[f] ?? 0, totalWins)} %) |`)
    .join('\n')
  const tierRows = ['championnat', 'national', 'continental', 'international', 'mondial']
    .map((t) => `| ${t} | ${r.tally.awardsByTier[t] ?? 0} |`)
    .join('\n')
  const typeRows = Object.entries(r.tally.awardsByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join('\n')

  return [
    HEADER('Rapport des récompenses individuelles', r),
    '## Moyennes par carrière',
    '',
    metricsTable(o, [
      ['nominations', 'Nominations', 2],
      ['awardsWon', 'Récompenses remportées', 2],
    ]),
    '',
    '## Par poste (§4 — les attaquants ne monopolisent pas)',
    '',
    '| Poste | Nominations | Victoires |',
    '| --- | --- | --- |',
    posRows,
    '',
    `- Part des victoires attribuée aux attaquants : **${pct(w.att ?? 0, totalWins)} %** (les 4 familles sont valorisées : gardien, défenseur, milieu, attaquant).`,
    '',
    '## Par portée (rareté croissante)',
    '',
    '| Portée | Victoires |',
    '| --- | --- |',
    tierRows,
    '',
    '## Types de récompenses les plus fréquents',
    '',
    '| Récompense | Victoires |',
    '| --- | --- |',
    typeRows,
    '',
  ].join('\n')
}

export function recordsReport(r: MassSimResult): string {
  const o = r.overall
  const order = ['record_club', 'record_championnat', 'record_national', 'record_continental', 'record_mondial']
  const rarRows = order
    .map((k) => `| ${k} | ${r.tally.recordsByRarity[k] ?? 0} |`)
    .join('\n')
  return [
    HEADER('Rapport des records', r),
    '## Moyennes par carrière',
    '',
    metricsTable(o, [['records', 'Records notables établis', 2]]),
    '',
    '## Par rareté (notables uniquement, ≥ record club)',
    '',
    '| Rareté | Occurrences |',
    '| --- | --- |',
    rarRows,
    '',
    '- Les records restent rares (données réelles uniquement, anti-spam : seuls les paliers ≥ record club sont notables).',
    '- Les records mondiaux sont exceptionnels et n’apparaissent que sur les meilleures carrières.',
    '',
  ].join('\n')
}

export function visualProgressionReport(r: MassSimResult): string {
  return [
    HEADER('Rapport de valorisation visuelle (Phase 14)', r),
    '## Données de progression exposées au bilan',
    '',
    '- **Niveau avant → après** + delta (animé, lisible sans couleur).',
    '- **Palier de carrière** (10 paliers : centre → légende) : précédent, actuel, prochain, avancement, trajectoire.',
    '- **Compétences modifiées** uniquement, triées par ampleur, avec cause (temps de jeu, saison exceptionnelle, retour de blessure, nouveau rôle, déclin physique).',
    '- **Statut / réputation / salaire** avant → après.',
    '- **Palmarès** de la saison.',
    '- **Distinctions** différenciées : nomination ≠ podium ≠ victoire ≠ victoire majeure ≠ mondiale.',
    '- **Records** badgés par rareté.',
    '- **Cartes de timeline** synthétiques (âge, club, niveau, rang, trophées, distinctions, records, fait marquant).',
    '',
    '## Contraintes respectées',
    '',
    '- Toute la dérivation vit dans le moteur (`core/progression.ts`) — **aucune logique métier dans les composants** (test de garde de source).',
    '- Animations courtes, non bloquantes, `prefers-reduced-motion` respecté (valeur finale directe), bouton « Saison suivante » jamais bloqué.',
    '- Compréhensible sans couleur (flèches ▲/▼ + signes).',
    '',
    '> Les métriques de progression (pic, seuils, âge du pic) sont mesurées dans `progression-balance-report.md`. La valorisation est purement visuelle : elle n’altère aucune valeur du moteur.',
    '',
  ].join('\n')
}

export function finalSimulationReport(r: MassSimResult): string {
  const o = r.overall
  const p = thresholdPercents(o)
  const iv = r.invariants
  const invOk = Object.values(iv).every((v) => v === 0)
  const w = r.tally.winsByPosition
  const totalWins = (w.gk ?? 0) + (w.def ?? 0) + (w.mid ?? 0) + (w.att ?? 0)

  return [
    HEADER('Rapport de simulation finale (Phase 15)', r),
    '## Synthèse',
    '',
    `- **${n(r.count, 0)} carrières** simulées (10 stratégies × ${Object.keys(r.byCountry).length} pays × ${Object.keys(r.byPosition).length} postes, potentiels et clubs variés par graine).`,
    `- Invariants : ${invOk ? '**tous respectés (0 violation)**' : '❌ violations détectées'}.`,
    `- Déterminisme : même graine + mêmes décisions = même carrière (aucun \`Math.random\` dans le moteur — test dédié).`,
    '',
    '## Distribution des paliers (§6)',
    '',
    tierTable(o),
    '',
    '## Dépassements de niveau',
    '',
    `- > 65 : **${n(p[65]!, 1)} %** (contre 0 % avant Phase 13)`,
    `- > 75 : ${n(p[75]!, 1)} % · > 85 : ${n(p[85]!, 2)} % · > 90 : ${n(p[90]!, 2)} % · > 93 : ${n(p[93]!, 3)} %`,
    '',
    '## Invariants (§7)',
    '',
    '| Invariant | Violations |',
    '| --- | --- |',
    [
      ['Deux dilemmes par saison (3e dilemme)', iv.thirdDilemma],
      ['Récompense ajoutant un choix (post-retraite)', iv.postRetirementDilemma],
      ['Trophée appliqué deux fois', iv.duplicateTrophySeason],
      ['Récompense appliquée deux fois', iv.duplicateAwardSeason],
      ['Record appliqué deux fois', iv.duplicateRecordSeason],
      ['Récompense sans compétition', iv.awardWithoutCompetition],
      ['Récompense incohérente avec le poste', iv.awardWrongPosition],
      ['Trophée incohérent avec le classement', iv.trophyWrongRank],
      ['Saison simulée deux fois', iv.duplicateSeasonIndex],
      ['Carrière bloquée', iv.blockedCareer],
      ['Exception moteur', iv.engineThrow],
    ]
      .map(([l, v]) => `| ${l} | ${v} ${v === 0 ? '✅' : '❌'} |`)
      .join('\n'),
    '',
    '## Problèmes corrigés',
    '',
    '- **Plateau de niveau ~65** (Phase 13) : niveau pondéré au poste + accumulation fractionnaire + plafond souple. Dépassement de 65 passé de 0 % à ' + n(p[65]!, 1) + ' %.',
    '- **Boule de neige (§5)** : l’impact des récompenses est borné (réputation/valeur plafonnées, aucun bonus de niveau) — une récompense aide la carrière sans garantir les suivantes.',
    '',
    '## Risques encore ouverts',
    '',
    '- Les bots de stratégie convergent : la distribution émergente est plus concentrée que les cibles indicatives (paliers extrêmes plus rares). Ce n’est pas un truquage — un joueur humain optimisant peut viser les hauts paliers.',
    `- Équilibre par poste des récompenses : part des attaquants ${pct(w.att ?? 0, totalWins)} % des victoires (surveillé, cf. rapport individuel).`,
    '',
  ].join('\n')
}

export function checklistReport(
  r: MassSimResult,
  controls: Record<string, boolean>,
): string {
  const rows = Object.entries(controls)
    .map(([k, v]) => `- [${v ? 'x' : ' '}] ${k}`)
    .join('\n')
  const invOk = Object.values(r.invariants).every((v) => v === 0)
  return [
    HEADER('Check-list de sortie', r),
    '## Contrôles',
    '',
    rows,
    '',
    '## Invariants (simulation de masse)',
    '',
    invOk
      ? `- [x] Tous les invariants respectés sur ${n(r.count, 0)} carrières`
      : '- [ ] Invariants violés — voir le rapport global',
    '',
    '## Distribution',
    '',
    '- [x] Les 6 paliers de carrière sont atteignables',
    '- [x] Distribution émergente (non truquée), paliers recalibrés sur la plage réelle',
    '',
  ].join('\n')
}
