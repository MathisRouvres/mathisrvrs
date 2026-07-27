import type { CareerSavePackage, SportStatId } from '../types'
import type {
  AutoTransferResult,
  SeasonSimulationResult,
  SeasonTimelineEntry,
} from '../types/season'
import { SPORT_STAT_IDS } from './constants'
import { isTerminalStage } from './careerStages'
import { clamp, clampCash, clampResource } from './clamp'
import { buildContract } from './finance'
import {
  deriveClubStanding,
  deriveSeasonObjective,
  evaluateSeasonObjective,
  objectiveOutcomeEffects,
  SEASON_OBJECTIVE_LABELS,
  OBJECTIVE_RESULT_LABELS,
} from './competition'
import { getChampionshipByCountry } from '../../game-content/championships'
import {
  collectAchievements,
  computeContribution,
  generateBonusTrophies,
  seasonTrophyImpact,
} from './trophy'
import { computeSeasonDistinctions, type SeasonDistinctions } from './awards'
import { computeMajorDistinctions, type MajorAwardsResult } from './majorAwards'
import { computeSeasonRecords } from './records'
import { createId, nowIso } from './ids'
import { createRng } from '../random/createRng'
import { simulateSeason, type SeasonSimulationInput } from './simulateSeason'
import { careerSavePackageSchema } from './schemas'
import { markCareerFinished } from '../rules/eventResolution'
import { processDueDilemmaEffects } from '../dilemmas/processDelayed'
import { getCountryById } from '../../game-content/countries'
import { clubs, getClubById } from '../../game-content/clubs'

function asSportStats(
  record: Record<string, number>,
): Record<SportStatId, number> {
  const next = {} as Record<SportStatId, number>
  for (const id of SPORT_STAT_IDS) {
    next[id] = record[id] ?? 40
  }
  return next
}

export function buildSeasonInputFromPackage(
  pkg: CareerSavePackage,
  overrides: Partial<SeasonSimulationInput> = {},
): SeasonSimulationInput {
  const { snapshot, playerProfile } = pkg
  const state = snapshot.state
  return {
    seed: state.seed,
    seasonIndex: state.seasonIndex,
    age: state.age,
    positionId: playerProfile.primaryPosition,
    difficulty: playerProfile.difficulty,
    mode: state.mode,
    careerStage: state.careerStage,
    stats: state.stats,
    resources: state.resources,
    hiddenTraits: state.hiddenTraits,
    relationships: state.relationships,
    clubInfrastructure: state.clubInfrastructure,
    competitionLevel: state.competitionLevel,
    estimatedValue: state.estimatedValue,
    injuryWeeksRemaining: state.injuryWeeksRemaining,
    contractWeeksRemaining: state.contract?.weeksRemaining ?? null,
    maxSeasons: state.maxSeasons,
    clubId: state.clubId,
    flags: state.flags,
    leagueLevel: getCountryById(state.countryId)?.leagueLevel ?? state.competitionLevel,
    ...overrides,
  }
}

/**
 * Applique un résultat de simulation au paquet (snapshot + journal saison + timeline).
 */
export function applySeasonResult(
  pkg: CareerSavePackage,
  result: SeasonSimulationResult,
): CareerSavePackage {
  const now = nowIso()
  const state0 = pkg.snapshot.state

  // --- Phase 9 : championnat, statut, objectif de saison, évaluation ---
  const championship = getChampionshipByCountry(state0.countryId)
  const leagueLevel = championship?.prestige ?? state0.competitionLevel
  const seasonDivision: 1 | 2 = state0.flags.division2 === true ? 2 : 1
  const standing = deriveClubStanding(
    state0.competitionLevel,
    leagueLevel,
    seasonDivision,
    state0.flags.was_promoted === true,
  )
  const objective = deriveSeasonObjective(
    standing,
    seasonDivision,
    state0.flags.was_champion === true,
    leagueLevel,
  )
  const objectiveResult = evaluateSeasonObjective(objective, result.club, standing)
  const objEffects = objectiveOutcomeEffects(
    objectiveResult,
    championship?.reputationCoef ?? 1,
  )
  // Résumé narratif enrichi (objectif → verdict), sans écran ni choix supplémentaire.
  const objectiveNarrative = `Objectif : ${SEASON_OBJECTIVE_LABELS[objective].toLowerCase()} — ${OBJECTIVE_RESULT_LABELS[objectiveResult].toLowerCase()}.`
  const enrichedNarrative = `${result.narrativeSummary} ${objectiveNarrative}`

  // --- Phase 10 : trophées collectifs, contribution, accomplissements, impact ---
  // Résultats AUTOMATIQUES (aucun dilemme). Les trophées « bonus » (finale de
  // coupe, épreuves continentales, sélection) sont tirés via un rng dédié
  // (trophy.ts) → le flux de la simulation de saison reste inchangé.
  const contribution = computeContribution(result.matchStats)
  const bonusTrophies = generateBonusTrophies(state0, result.club)
  // `matchStats.trophies` contient déjà les trophées club + individuels.
  const seasonTrophies = [
    ...new Set([...result.matchStats.trophies, ...bonusTrophies]),
  ]
  const achievements = collectAchievements(
    result.club,
    standing,
    objective,
    state0.seasonTimeline,
    pkg.snapshot.clubId,
  )
  const trophyImpact = seasonTrophyImpact(
    seasonTrophies,
    contribution.score,
    leagueLevel,
    standing,
  )

  // --- Phase 11 : distinctions individuelles par championnat (automatiques) ---
  // Scoring pur (rng dédié `seed:awards:season`), joueur noté comme les
  // concurrents synthétiques → aucun favoritisme, flux de saison intact.
  const distinctions: SeasonDistinctions = championship
    ? computeSeasonDistinctions(state0, {
        matchStats: result.matchStats,
        club: result.club,
        ageDuringSeason: result.ageBefore,
        championship,
      })
    : { records: [], winners: [], impact: { reputation: 0, popularite: 0, valuePct: 0, flags: [] } }

  // --- Phase 12 : distinctions majeures (nationale → mondiale) + records ---
  const originCountry = pkg.playerProfile.countryId
  const isAbroad = originCountry !== state0.countryId
  const major: MajorAwardsResult = championship
    ? computeMajorDistinctions(state0, {
        matchStats: result.matchStats,
        club: result.club,
        ageDuringSeason: result.ageBefore,
        championship,
        seasonTrophies,
        countryLabel: getCountryById(state0.countryId)?.label ?? state0.countryId,
        isAbroad,
      })
    : { records: [], winners: [], impact: { reputation: 0, popularite: 0, valuePct: 0, flags: [] }, worldAccess: 0 }

  // Toutes les distinctions de la saison (championnat + majeures).
  const allDistinctions = [...distinctions.records, ...major.records]

  // Records (données réelles), comparés au registre — rareté ≥ record_club émise.
  const seasonRecords = championship
    ? computeSeasonRecords(state0, {
        matchStats: result.matchStats,
        club: result.club,
        ageDuringSeason: result.ageBefore,
        championship,
        valueBefore: result.valueBefore,
        valueAfter: result.valueAfter,
        weeklyWage: state0.contract?.weeklyWage ?? state0.finances.weeklyWage,
        distinctions: allDistinctions,
        collectiveTrophyCount: seasonTrophies.length,
      })
    : { newRecords: [], ledger: state0.records ?? [] }

  // Trophées enrichis : collectifs + bonus Phase 10 + distinctions gagnées.
  const allTrophies = [
    ...new Set([...seasonTrophies, ...distinctions.winners, ...major.winners]),
  ]
  const enrichedMatchStats = { ...result.matchStats, trophies: allTrophies }
  // Valeur estimée : bonus modéré des distinctions (borné, jamais de saut de niveau).
  const valueAfterAwards = Math.round(
    result.valueAfter * (1 + distinctions.impact.valuePct + major.impact.valuePct),
  )

  const timelineEntry: SeasonTimelineEntry = {
    seasonIndex: result.seasonIndex,
    age: result.ageAfter,
    clubId: pkg.snapshot.clubId,
    careerStage: result.careerStageAfter,
    matchStats: enrichedMatchStats,
    progressionLabel: result.progressionLabel,
    narrativeSummary: enrichedNarrative,
    valueAfter: valueAfterAwards,
    reputationAfter: result.reputationAfter,
    recordedAt: now,
    clubRank: result.club.leagueRank,
    keyEvent: result.keyEvent,
    championshipId: championship?.id ?? null,
    division: seasonDivision,
    objective,
    objectiveResult,
    promoted: result.club.promoted,
    relegated: result.club.relegated,
    continentalQualified: result.club.continentalQualified,
    cupRun: result.club.cupRun,
    historicImportance: objEffects.historicImportance,
    clubStanding: standing,
    achievements,
    contributionTier: contribution.tier,
    distinctions: allDistinctions,
    records: seasonRecords.newRecords,
    level: result.overallAfter,
  }

  // Conséquences club : division, niveau de compétition, entraîneur.
  const clubFlags: Record<string, boolean | number | string> = {
    ...pkg.snapshot.state.flags,
  }
  // Mémoire sportive pour la saison suivante (statut/objectif).
  clubFlags.was_champion = result.club.trophies.some((t) =>
    t.startsWith('Champion national'),
  )
  clubFlags.was_promoted = result.club.promoted
  clubFlags.last_objective_result = objectiveResult
  if (objEffects.flag) clubFlags[objEffects.flag] = true
  // Phase 10 — participation continentale la saison suivante (qualification acquise).
  clubFlags.continental_entrant = result.club.continentalQualified
  // Héritage / intérêt sélection ouverts par les trophées majeurs (pas de bonus niveau).
  for (const f of trophyImpact.flags) clubFlags[f] = true
  // Distinctions individuelles (Phase 11) : confirment une saison, ouvrent des portes.
  for (const f of distinctions.impact.flags) clubFlags[f] = true
  // Distinctions majeures (Phase 12) : héritage / rayonnement (pas de bonus niveau).
  for (const f of major.impact.flags) clubFlags[f] = true
  if (objectiveResult === 'saison_historique') {
    const prev =
      typeof pkg.snapshot.state.flags.historicSeasons === 'number'
        ? pkg.snapshot.state.flags.historicSeasons
        : 0
    clubFlags.historicSeasons = prev + 1
  }
  let competitionLevel = pkg.snapshot.state.competitionLevel
  if (result.club.relegated) {
    clubFlags.division2 = true
    competitionLevel = clamp(competitionLevel - 10, 1, 99)
  }
  if (result.club.promoted) {
    delete clubFlags.division2
    competitionLevel = clamp(competitionLevel + 10, 1, 99)
  }
  const coachReset = result.club.coachChanged

  const seasonRecord = {
    id: createId('season'),
    careerId: pkg.snapshot.id,
    seasonIndex: result.seasonIndex,
    clubId: pkg.snapshot.clubId,
    startedAt: pkg.journal.seasons.find((s) => s.seasonIndex === result.seasonIndex)
      ?.startedAt ?? now,
    endedAt: now,
    summary: {
      bilan: true,
      progressionLabel: result.progressionLabel,
      narrativeSummary: result.narrativeSummary,
      matchStats: enrichedMatchStats,
      valueAfter: result.valueAfter,
      careerStageAfter: result.careerStageAfter,
      beats: result.beats,
    },
  }

  const otherSeasons = pkg.journal.seasons.filter(
    (s) => s.seasonIndex !== result.seasonIndex || s.endedAt != null,
  )

  const terminal = isTerminalStage(result.careerStageAfter)
  const nextSeasonIndex = terminal ? result.seasonIndex : result.seasonIndex + 1

  let next: CareerSavePackage = {
    ...pkg,
    snapshot: {
      ...pkg.snapshot,
      updatedAt: now,
      age: result.ageAfter,
      seasonIndex: nextSeasonIndex,
      status: terminal ? 'finished' : pkg.snapshot.status,
      state: {
        ...pkg.snapshot.state,
        age: result.ageAfter,
        seasonIndex: nextSeasonIndex,
        chapterId: terminal ? 'retired' : 'preseason',
        phase: terminal ? 'retired' : 'playing',
        careerStage: result.careerStageAfter,
        flags: clubFlags,
        competitionLevel,
        stats: asSportStats(result.statsAfter),
        resources: {
          ...pkg.snapshot.state.resources,
          ...Object.fromEntries(
            Object.entries(result.resourcesAfter).map(([k, v]) => [k, v]),
          ),
          // Évaluation de l'objectif → réputation (pondérée par le prestige),
          // plus l'impact modéré des trophées collectifs (Phase 10).
          reputationSportive: clampResource(
            (result.resourcesAfter.reputationSportive ??
              pkg.snapshot.state.resources.reputationSportive) +
              objEffects.reputation +
              trophyImpact.reputation +
              distinctions.impact.reputation +
              major.impact.reputation,
          ),
          // Popularité : dérivée de la saison, augmentée par trophées + distinctions.
          popularite: clampResource(
            (result.resourcesAfter.popularite ??
              pkg.snapshot.state.resources.popularite) +
              trophyImpact.popularite +
              distinctions.impact.popularite +
              major.impact.popularite,
          ),
          // Confiance du coach : soit un nouvel entraîneur (neutre), soit
          // l'ajustement lié au verdict de la saison.
          confianceEntraineur: coachReset
            ? clampResource(45 + Math.round(result.reputationAfter / 10))
            : clampResource(
                (result.resourcesAfter.confianceEntraineur ??
                  pkg.snapshot.state.resources.confianceEntraineur) +
                  objEffects.coach +
                  trophyImpact.confiance,
              ),
        } as CareerSavePackage['snapshot']['state']['resources'],
        relationships: coachReset
          ? { ...result.relationshipsAfter, coach: 50 }
          : result.relationshipsAfter,
        estimatedValue: valueAfterAwards,
        injuryWeeksRemaining: result.longInjury
          ? Math.max(0, Math.round(result.matchStats.injuryDays / 7) - 8)
          : 0,
        seasonTimeline: [...pkg.snapshot.state.seasonTimeline, timelineEntry],
        records: seasonRecords.ledger,
        rngState: result.rngFinalState,
        contract: pkg.snapshot.state.contract
          ? {
              ...pkg.snapshot.state.contract,
              weeksRemaining: Math.max(
                0,
                pkg.snapshot.state.contract.weeksRemaining - 52,
              ),
            }
          : null,
      },
    },
    journal: {
      ...pkg.journal,
      seasons: [...otherSeasons, seasonRecord],
      events: [
        ...pkg.journal.events,
        ...result.beats.map((beat) => ({
          id: createId('event'),
          careerId: pkg.snapshot.id,
          eventDefinitionId: null,
          type: `season_beat_${beat.type}`,
          seasonIndex: result.seasonIndex,
          createdAt: now,
          payload: {
            title: beat.title,
            body: beat.summary,
            chapterId: beat.chapterId,
          },
          resolved: true,
          resolutionDecisionId: null,
        })),
      ],
    },
  }

  if (terminal) {
    next = markCareerFinished(next, Math.round(result.valueAfter / 10_000))
    next = {
      ...next,
      snapshot: {
        ...next.snapshot,
        state: {
          ...next.snapshot.state,
          careerStage: 'carriere_terminee',
          phase: 'retired',
        },
      },
    }
  } else {
    // Ouvre la saison suivante dans le journal
    next = {
      ...next,
      journal: {
        ...next.journal,
        seasons: [
          ...next.journal.seasons,
          {
            id: createId('season'),
            careerId: pkg.snapshot.id,
            seasonIndex: nextSeasonIndex,
            clubId: pkg.snapshot.clubId,
            startedAt: now,
            endedAt: null,
            summary: { bootstrap: true },
          },
        ],
      },
    }
  }

  return careerSavePackageSchema.parse(next) as CareerSavePackage
}

const TRANSFER_KEY_EVENTS: Record<AutoTransferResult['reason'], string> = {
  fin_contrat: 'Départ libre en fin de contrat',
  pret_impose: 'Prêt imposé par le club',
  relegation: 'Vendu après la relégation',
  libere: 'Libéré par le club',
  faillite: 'Faillite du club',
  consequence_choix: 'Transfert acté',
}

function pickTransferClub(
  rng: ReturnType<typeof createRng>,
  currentClubId: string | null,
  targetLevel: number,
): string | null {
  const candidates = clubs
    .filter((c) => c.id !== currentClubId && !c.isAcademy)
    .sort(
      (a, b) =>
        Math.abs(a.competitionLevel - targetLevel) -
        Math.abs(b.competitionLevel - targetLevel),
    )
    .slice(0, 3)
  if (candidates.length === 0) return null
  return rng.pick(candidates).id
}

/**
 * Transferts automatiques — jamais d’écran mercato : le mouvement est décidé
 * par le moteur et raconté dans le bilan. Les offres nécessitant une décision
 * passent, elles, par les dilemmes.
 */
function decideAutoTransfer(
  pkg: CareerSavePackage,
  result: SeasonSimulationResult,
): AutoTransferResult | null {
  const state = pkg.snapshot.state
  if (state.phase === 'retired') return null

  const rng = createRng(`${state.seed}:transfer:${result.seasonIndex}`)
  const reputation = state.resources.reputationSportive
  const fromClub = getClubById(state.clubId ?? '')
  const fromName = fromClub?.name ?? 'ton club'

  // 1. Conséquence directe d’un ancien choix (dilemme de transfert accepté).
  if (state.flags.transfer_accepted === true) {
    const toId = pickTransferClub(rng, state.clubId, reputation + 8)
    if (toId) {
      const toName = getClubById(toId)?.name ?? 'un nouveau club'
      return {
        reason: 'consequence_choix',
        fromClubId: state.clubId,
        toClubId: toId,
        narrative: `Le transfert accepté en cours de saison se concrétise : tu quittes ${fromName} pour ${toName}.`,
      }
    }
  }

  // 2. Faillite fictive — très rare.
  if (rng.chance(0.006)) {
    const toId = pickTransferClub(rng, state.clubId, Math.max(30, reputation - 8))
    if (toId) {
      const toName = getClubById(toId)?.name ?? 'un club de repli'
      return {
        reason: 'faillite',
        fromClubId: state.clubId,
        toClubId: toId,
        narrative: `${fromName} s’effondre financièrement et disparaît des radars. Tu rebondis en urgence à ${toName}.`,
      }
    }
  }

  // 3. Club relégué + joueur coté → vendu vers la division 1.
  if (result.club.relegated && reputation >= 55) {
    const toId = pickTransferClub(rng, state.clubId, reputation)
    if (toId) {
      const toName = getClubById(toId)?.name ?? 'un club du haut de tableau'
      return {
        reason: 'relegation',
        fromClubId: state.clubId,
        toClubId: toId,
        narrative: `Le club descend, pas toi : ${toName} paie pour te garder dans l’élite.`,
      }
    }
  }

  // 4. Fin de contrat : libéré si la confiance est basse, sinon prolongé sans bruit.
  const contractOver =
    state.contract !== null && state.contract.weeksRemaining <= 0
  if (contractOver && state.resources.confianceEntraineur < 42) {
    const toId = pickTransferClub(rng, state.clubId, Math.max(28, reputation - 5))
    if (toId) {
      const toName = getClubById(toId)?.name ?? 'un nouveau projet'
      return {
        reason: 'fin_contrat',
        fromClubId: state.clubId,
        toClubId: toId,
        narrative: `Contrat terminé, aucune prolongation sur la table : tu t’engages libre avec ${toName}.`,
      }
    }
  }

  // 5. Prêt imposé : jeune sans minutes dans un club huppé.
  if (
    state.age <= 20 &&
    result.matchStats.minutes < 500 &&
    state.competitionLevel >= 55
  ) {
    const toId = pickTransferClub(rng, state.clubId, state.competitionLevel - 15)
    if (toId) {
      const toName = getClubById(toId)?.name ?? 'un club partenaire'
      return {
        reason: 'pret_impose',
        fromClubId: state.clubId,
        toClubId: toId,
        narrative: `Faute de minutes, le club t’envoie en prêt à ${toName} pour t’aguerrir.`,
      }
    }
  }

  return null
}

function applyAutoTransfer(
  pkg: CareerSavePackage,
  transfer: AutoTransferResult,
): CareerSavePackage {
  const toClub = getClubById(transfer.toClubId)
  if (!toClub) return pkg
  const state = pkg.snapshot.state
  const flags = { ...state.flags }
  delete flags.transfer_accepted
  delete flags.division2
  flags.lastSigningSeason = state.seasonIndex

  const isLoan = transfer.reason === 'pret_impose'
  const leagueLevel =
    getCountryById(state.countryId)?.leagueLevel ?? toClub.competitionLevel

  // Nouveau contrat au club d'accueil : salaire calculé (Phase 2), clôture de
  // l'ancien contrat (remplacement) — un seul contrat actif garanti.
  const movedState: typeof state = {
    ...state,
    clubId: toClub.id,
    competitionLevel: toClub.competitionLevel,
    clubStatus: 'rotation',
  }
  const built = buildContract(movedState, {
    reason: 'transfer',
    clubId: toClub.id,
    seasonIndex: state.seasonIndex,
    // 2 saisons (104 sem.) hors prêt — repère de test conservé ; 1 saison en prêt.
    durationSeasons: isLoan ? 1 : 2,
    leagueLevel,
    competition: 0.6,
  })
  // Prêt : pas de prime à la signature ; sinon prime versée une fois au cash.
  const signingBonus = isLoan ? 0 : built.signingBonus ?? 0
  const contract = { ...built, signingBonus }

  const next: CareerSavePackage = {
    ...pkg,
    snapshot: {
      ...pkg.snapshot,
      clubId: toClub.id,
      state: {
        ...state,
        clubId: toClub.id,
        clubInfrastructure: toClub.infrastructure,
        competitionLevel: toClub.competitionLevel,
        clubStatus: 'rotation',
        flags,
        contract,
        finances: {
          ...state.finances,
          cash: clampCash(state.finances.cash + signingBonus),
          weeklyWage: contract.weeklyWage,
        },
        resources: {
          ...state.resources,
          confianceEntraineur: clampResource(48),
        },
        relationships: {
          ...state.relationships,
          coach: 50,
        },
      },
    },
  }
  return careerSavePackageSchema.parse(next) as CareerSavePackage
}

/** Simule puis applique — helper UI / tests d’intégration. */
export function advanceCareerSeason(
  pkg: CareerSavePackage,
  overrides: Partial<SeasonSimulationInput> = {},
): { package: CareerSavePackage; result: SeasonSimulationResult } {
  const prepared = processDueDilemmaEffects(pkg)
  const input = buildSeasonInputFromPackage(prepared, overrides)
  const rawResult = simulateSeason(input)
  let applied = applySeasonResult(prepared, rawResult)

  // Le bilan affiché reprend les trophées enrichis (bonus Phase 10) stockés sur
  // la dernière entrée de timeline — cohérence bilan ↔ palmarès.
  const lastEntry = applied.snapshot.state.seasonTimeline.at(-1)
  const result =
    lastEntry && lastEntry.seasonIndex === rawResult.seasonIndex
      ? {
          ...rawResult,
          matchStats: lastEntry.matchStats,
          distinctions: lastEntry.distinctions ?? [],
          records: lastEntry.records ?? [],
        }
      : rawResult

  const terminal = isTerminalStage(result.careerStageAfter)
  const transfer = terminal ? null : decideAutoTransfer(applied, result)
  if (transfer) {
    applied = applyAutoTransfer(applied, transfer)
    return {
      package: applied,
      result: {
        ...result,
        autoTransfer: transfer,
        keyEvent: TRANSFER_KEY_EVENTS[transfer.reason],
        narrativeSummary: `${result.narrativeSummary} ${transfer.narrative}`,
      },
    }
  }
  return { package: applied, result: { ...result, autoTransfer: null } }
}
