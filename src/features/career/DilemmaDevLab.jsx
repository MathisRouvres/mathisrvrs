import { useMemo, useState } from 'react'
import {
  createPlayerCareerPackage,
  createRng,
  getVisibleStats,
  isDilemmaEligible,
  passesContextGuards,
  processDueDilemmaEffects,
  quickGenerateDraft,
  resolveDilemmaChoiceEngine,
  slotForCategory,
} from '../../game-engine'
import {
  catalogStats,
  dilemmaCatalog,
  getCatalogValidationIssues,
  getDilemmaById,
  getValidatedCatalog,
} from '../../game-content'
import CareerShell, { CareerButton } from './CareerShell'

/**
 * Presets d’état de carrière — sélection rapide d’un contexte de test.
 * flags/resources écrasent l’état simulé de base.
 */
const STATE_PRESETS = [
  {
    id: 'espoir',
    label: 'Jeune espoir (17 ans)',
    age: 17,
    seasonIndex: 1,
    reputation: 25,
    popularite: 15,
    minutes: 700,
    sante: 85,
    flags: {},
  },
  {
    id: 'titulaire',
    label: 'Titulaire confirmé (24 ans)',
    age: 24,
    seasonIndex: 7,
    reputation: 55,
    popularite: 45,
    minutes: 2600,
    sante: 75,
    flags: {},
  },
  {
    id: 'star',
    label: 'Star internationale (28 ans)',
    age: 28,
    seasonIndex: 11,
    reputation: 85,
    popularite: 80,
    minutes: 3000,
    sante: 70,
    flags: { national_capped: true, fan_favorite: true },
  },
  {
    id: 'blesse',
    label: 'Gravement blessé (26 ans)',
    age: 26,
    seasonIndex: 9,
    reputation: 50,
    popularite: 40,
    minutes: 400,
    sante: 22,
    flags: { grave_injury_risk: true },
  },
  {
    id: 'crise',
    label: 'Crise de carrière (31 ans)',
    age: 31,
    seasonIndex: 14,
    reputation: 38,
    popularite: 25,
    minutes: 900,
    sante: 40,
    flags: { career_crisis: true, coach_feud: true },
  },
  {
    id: 'veteran',
    label: 'Vétéran en déclin (35 ans)',
    age: 35,
    seasonIndex: 18,
    reputation: 60,
    popularite: 55,
    minutes: 1400,
    sante: 55,
    flags: {},
  },
]

const STANCE_LABELS = {
  prudent: 'Prudent',
  ambitious: 'Ambitieux',
  loyal: 'Loyal',
  individualist: 'Individualiste',
  financial: 'Financier',
  emotional: 'Émotionnel',
  ethical: 'Éthique',
  high_risk: 'Haut risque',
  collective: 'Collectif',
  professional: 'Professionnel',
  media_savvy: 'Médiatique',
  resilient: 'Résilient',
}

const RARITY_LABELS = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  legendary: 'Légendaire',
}

/**
 * Atelier de développement — tester un événement avec un état de carrière simulé.
 * Route : /carriere/dev/events
 */
export default function DilemmaDevLab() {
  const catalog = useMemo(() => getValidatedCatalog(), [])
  const stats = useMemo(() => catalogStats(), [])
  const [eventId, setEventId] = useState(catalog[0]?.id ?? '')
  const [seed, setSeed] = useState('dev-lab-seed')
  const [age, setAge] = useState(22)
  const [seasonIndex, setSeasonIndex] = useState(3)
  const [position, setPosition] = useState('cm')
  const [reputation, setReputation] = useState(55)
  const [popularite, setPopularite] = useState(40)
  const [minutes, setMinutes] = useState(1800)
  const [sante, setSante] = useState(75)
  const [extraFlags, setExtraFlags] = useState({})
  const [presetId, setPresetId] = useState(null)
  const [forceQueued, setForceQueued] = useState(false)
  const [log, setLog] = useState(null)
  const [error, setError] = useState(null)
  const [pkgPreview, setPkgPreview] = useState(null)
  const validationIssues = useMemo(() => getCatalogValidationIssues(), [])

  const event = getDilemmaById(eventId) ?? catalog[0]

  function applyPreset(preset) {
    setPresetId(preset.id)
    setAge(preset.age)
    setSeasonIndex(preset.seasonIndex)
    setReputation(preset.reputation)
    setPopularite(preset.popularite)
    setMinutes(preset.minutes)
    setSante(preset.sante)
    setExtraFlags(preset.flags)
    setLog(null)
  }

  function buildSimPackage() {
    const draft = {
      ...quickGenerateDraft(seed),
      primaryPosition: position,
      seed,
    }
    let pkg = createPlayerCareerPackage(draft)
    pkg = {
      ...pkg,
      snapshot: {
        ...pkg.snapshot,
        age,
        seasonIndex,
        state: {
          ...pkg.snapshot.state,
          age,
          seasonIndex,
          careerStage:
            age >= 34
              ? 'declin'
              : age >= 28
                ? 'apogee'
                : age >= 20
                  ? 'progression'
                  : 'debuts_professionnels',
          resources: {
            ...pkg.snapshot.state.resources,
            reputationSportive: reputation,
            popularite,
            sante,
          },
          flags: {
            ...pkg.snapshot.state.flags,
            ...extraFlags,
            ...(forceQueued && event
              ? { queuedDilemmaId: event.id }
              : {}),
          },
          seasonTimeline: [
            {
              seasonIndex: Math.max(1, seasonIndex - 1),
              age: Math.max(16, age - 1),
              clubId: pkg.snapshot.clubId,
              careerStage: 'progression',
              matchStats: {
                matches: Math.max(1, Math.round(minutes / 90)),
                starts: Math.max(0, Math.round(minutes / 100)),
                minutes,
                goals: 4,
                assists: 3,
                cleanSheets: position === 'gk' ? 8 : 0,
                averageRating: 6.8,
                yellowCards: 2,
                redCards: 0,
                injuryDays: 0,
                trophies: [],
              },
              progressionLabel: 'positive',
              narrativeSummary: 'Saison simulée pour l’atelier dilemmes.',
              valueAfter: pkg.snapshot.state.estimatedValue,
              reputationAfter: reputation,
              recordedAt: new Date().toISOString(),
            },
          ],
        },
      },
      playerProfile: {
        ...pkg.playerProfile,
        primaryPosition: position,
      },
    }
    return processDueDilemmaEffects(pkg)
  }

  function handleEligibility() {
    setError(null)
    setLog(null)
    try {
      const pkg = buildSimPackage()
      setPkgPreview(pkg)
      if (!event) throw new Error('Événement introuvable.')
      const conditionsOk = isDilemmaEligible(
        event,
        pkg.snapshot.state,
        pkg.playerProfile,
      )
      const guardsOk = passesContextGuards(event, pkg.snapshot.state)
      const eligible = conditionsOk && guardsOk
      setLog({
        kind: 'eligibility',
        eligible,
        narrative: eligible
          ? 'Éligible avec l’état simulé actuel.'
          : !conditionsOk
            ? 'Non éligible : conditions (âge, poste, flags, cooldown, prérequis…).'
            : 'Bloqué par un garde-fou contextuel (répétition, signature récente, blessure grave, retraite précoce, finale).',
        appliedImmediate: [],
        appliedHidden: [],
        queuedDelayed: 0,
        skillChecks: [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur éligibilité.')
    }
  }

  function handleResolve(choiceId) {
    setError(null)
    try {
      const pkg = buildSimPackage()
      if (!event) throw new Error('Événement introuvable.')
      const visibleBefore = getVisibleStats(pkg.snapshot.state)
      const { package: next, log: resolution } = resolveDilemmaChoiceEngine(
        pkg,
        event,
        choiceId,
        { seedSalt: 'dev-lab' },
      )
      const visibleAfter = getVisibleStats(next.snapshot.state)
      const visibleDeltas = Object.keys(visibleAfter)
        .map((id) => ({ id, delta: visibleAfter[id] - visibleBefore[id] }))
        .filter((d) => d.delta !== 0)
      setPkgPreview(next)
      setLog({ ...resolution, visibleDeltas })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Résolution impossible.')
    }
  }

  function handlePickRandom() {
    setError(null)
    setLog(null)
    try {
      const pkg = buildSimPackage()
      const rng = createRng(`${seed}:dev-pick:${seasonIndex}`)
      const eligible = catalog.filter((e) =>
        isDilemmaEligible(e, pkg.snapshot.state, pkg.playerProfile),
      )
      if (eligible.length === 0) {
        setLog({
          kind: 'pick',
          eligible: false,
          narrative: 'Aucun dilemme éligible pour cet état.',
          appliedImmediate: [],
          appliedHidden: [],
          queuedDelayed: 0,
          skillChecks: [],
        })
        return
      }
      const weights = eligible.map((e) => e.weight)
      const picked = rng.weightedPick(eligible, weights)
      setEventId(picked.id)
      setPkgPreview(pkg)
      setLog({
        kind: 'pick',
        eligible: true,
        narrative: `Tirage : ${picked.title} (${picked.id}) — ${eligible.length} candidats.`,
        appliedImmediate: [],
        appliedHidden: [],
        queuedDelayed: 0,
        skillChecks: [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tirage impossible.')
    }
  }

  return (
    <CareerShell title="Atelier dilemmes">
      <p className="cg-kicker">Développement</p>
      <h1 className="cg-title">Atelier d’événements</h1>
      <p className="cg-lead">
        Teste un dilemme avec un état de carrière simulé — hors sauvegarde
        joueur.
      </p>

      <p className="cg-hint">
        Catalogue : {stats.total} · rares {stats.rare} · chaînes {stats.chains}{' '}
        · GK {stats.gk} · banc {stats.bench} · stars {stats.star} · fin{' '}
        {stats.endCareer}
      </p>

      {(error || log) && (
        <div
          className={`cg-alert${error ? ' cg-alert--error' : ' cg-alert--ok'}`}
          role={error ? 'alert' : 'status'}
        >
          {error ?? log?.narrative}
        </div>
      )}

      <section className="cg-section" aria-labelledby="sim-state-heading">
        <h2 id="sim-state-heading" className="cg-section__title">
          État simulé
        </h2>
        <div className="cg-actions" style={{ marginBottom: '0.85rem' }}>
          {STATE_PRESETS.map((preset) => (
            <CareerButton
              key={preset.id}
              type="button"
              variant={presetId === preset.id ? 'primary' : 'secondary'}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </CareerButton>
          ))}
        </div>
        <div className="cg-panel">
          <div
            style={{
              display: 'grid',
              gap: '0.85rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(11rem, 1fr))',
            }}
          >
            <label className="cg-field">
              <span>Seed</span>
              <input
                className="cg-input"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
            </label>
            <label className="cg-field">
              <span>Âge</span>
              <input
                className="cg-input"
                type="number"
                min={16}
                max={45}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
              />
            </label>
            <label className="cg-field">
              <span>Saison</span>
              <input
                className="cg-input"
                type="number"
                min={1}
                max={30}
                value={seasonIndex}
                onChange={(e) => setSeasonIndex(Number(e.target.value))}
              />
            </label>
            <label className="cg-field">
              <span>Poste</span>
              <select
                className="cg-input"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                {['gk', 'cb', 'fb', 'cdm', 'cm', 'cam', 'winger', 'st'].map(
                  (p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="cg-field">
              <span>Réputation</span>
              <input
                className="cg-input"
                type="number"
                min={0}
                max={100}
                value={reputation}
                onChange={(e) => setReputation(Number(e.target.value))}
              />
            </label>
            <label className="cg-field">
              <span>Popularité</span>
              <input
                className="cg-input"
                type="number"
                min={0}
                max={100}
                value={popularite}
                onChange={(e) => setPopularite(Number(e.target.value))}
              />
            </label>
            <label className="cg-field">
              <span>Minutes (saison préc.)</span>
              <input
                className="cg-input"
                type="number"
                min={0}
                max={4500}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </label>
            <label className="cg-field">
              <span>Santé</span>
              <input
                className="cg-input"
                type="number"
                min={0}
                max={100}
                value={sante}
                onChange={(e) => setSante(Number(e.target.value))}
              />
            </label>
            <label
              className="cg-field"
              style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}
            >
              <input
                type="checkbox"
                checked={forceQueued}
                onChange={(e) => setForceQueued(e.target.checked)}
              />
              <span>Forcer file d’attente</span>
            </label>
          </div>
        </div>
        <div className="cg-actions">
          <CareerButton type="button" variant="secondary" onClick={handleEligibility}>
            Tester l’éligibilité
          </CareerButton>
          <CareerButton type="button" variant="ghost" onClick={handlePickRandom}>
            Tirer un dilemme
          </CareerButton>
          <CareerButton
            type="button"
            variant="ghost"
            onClick={() => {
              window.location.href = '/carriere'
            }}
          >
            Retour carrière
          </CareerButton>
        </div>
      </section>

      <section className="cg-section" aria-labelledby="event-pick-heading">
        <h2 id="event-pick-heading" className="cg-section__title">
          Événement
        </h2>
        <label className="cg-field">
          <span>Choisir dans le catalogue ({dilemmaCatalog.length})</span>
          <select
            className="cg-input"
            value={event?.id ?? ''}
            onChange={(e) => setEventId(e.target.value)}
          >
            {catalog.map((d) => (
              <option key={d.id} value={d.id}>
                [{RARITY_LABELS[d.rarity]}] {d.title}
              </option>
            ))}
          </select>
        </label>

        {event && (
          <article className="cg-panel" style={{ marginTop: '1rem' }}>
            <p className="cg-kicker">
              {event.category} · {RARITY_LABELS[event.rarity]} · poids{' '}
              {event.weight}
              {event.unique ? ' · unique' : ''} · emplacement{' '}
              {slotForCategory(event.category) ?? 'libre'}
            </p>
            <h3 className="cg-card__title" style={{ fontSize: '1.25rem' }}>
              {event.title}
            </h3>
            <p className="cg-lead" style={{ fontSize: '1rem' }}>
              {event.body}
            </p>
            <p className="cg-hint">
              Âge {event.ageMin}–{event.ageMax}
              {event.positions
                ? ` · postes ${event.positions.join(', ')}`
                : ' · tous postes'}
              {event.tags.length > 0 ? ` · ${event.tags.join(', ')}` : ''}
            </p>

            <ul className="cg-list" style={{ marginTop: '1.25rem' }}>
              {event.choices.map((c) => (
                <li key={c.id} className="cg-card">
                  <div>
                    <p className="cg-card__title">{c.label}</p>
                    <p className="cg-card__meta">
                      {STANCE_LABELS[c.stance] ?? c.stance} — {c.riskPreview}
                    </p>
                  </div>
                  <CareerButton
                    type="button"
                    variant="primary"
                    onClick={() => handleResolve(c.id)}
                  >
                    Résoudre
                  </CareerButton>
                </li>
              ))}
            </ul>
          </article>
        )}
      </section>

      {log && log.appliedImmediate && (
        <section className="cg-section" aria-labelledby="log-heading">
          <h2 id="log-heading" className="cg-section__title">
            Journal de résolution
          </h2>
          <div className="cg-panel">
            {log.visibleDeltas?.length > 0 && (
              <ul className="cg-delta-row" aria-label="Variations visibles">
                {log.visibleDeltas.map(({ id, delta }) => (
                  <li
                    key={id}
                    className={`cg-delta${delta > 0 ? ' cg-delta--up' : ' cg-delta--down'}`}
                  >
                    {id} {delta > 0 ? '+' : ''}
                    {delta}
                  </li>
                ))}
              </ul>
            )}
            <dl className="cg-dl" style={{ marginTop: '0.85rem' }}>
              <div>
                <dt>Immédiat</dt>
                <dd>
                  {log.appliedImmediate?.length
                    ? log.appliedImmediate.join(' · ')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Caché (inspection dev)</dt>
                <dd>
                  {log.appliedHidden?.length
                    ? log.appliedHidden.join(' · ')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Retardés en file</dt>
                <dd>{log.queuedDelayed ?? 0}</dd>
              </div>
              <div>
                <dt>Tests</dt>
                <dd>
                  {log.skillChecks?.length
                    ? log.skillChecks
                        .map((s) => `${s.id}:${s.passed ? 'ok' : 'fail'}`)
                        .join(' · ')
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}

      {pkgPreview && (
        <section className="cg-section" aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="cg-section__title">
            Aperçu état
          </h2>
          <div className="cg-panel">
            <dl className="cg-dl">
              <div>
                <dt>Moral</dt>
                <dd>{pkgPreview.snapshot.state.resources.moral}</dd>
              </div>
              <div>
                <dt>Popularité</dt>
                <dd>{pkgPreview.snapshot.state.resources.popularite}</dd>
              </div>
              <div>
                <dt>Confiance coach</dt>
                <dd>{pkgPreview.snapshot.state.relationships.coach}</dd>
              </div>
              <div>
                <dt>Cash</dt>
                <dd>{pkgPreview.snapshot.state.finances.cash}</dd>
              </div>
              <div>
                <dt>Effets en attente</dt>
                <dd>{pkgPreview.snapshot.state.pendingEffects.length}</dd>
              </div>
              <div>
                <dt>queuedDilemmaId</dt>
                <dd>
                  {String(pkgPreview.snapshot.state.flags.queuedDilemmaId ?? '—')}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}

      <section className="cg-section" aria-labelledby="validation-heading">
        <h2 id="validation-heading" className="cg-section__title">
          Validation du catalogue
        </h2>
        {validationIssues.length === 0 ? (
          <p className="cg-hint" role="status">
            Aucun problème détecté par le validateur.
          </p>
        ) : (
          <ul className="cg-list">
            {validationIssues.map((issue, idx) => (
              <li
                key={`${issue.eventId ?? 'global'}-${idx}`}
                className="cg-card"
              >
                <div>
                  <p className="cg-card__title">
                    {issue.severity === 'error' ? '⛔' : '⚠️'}{' '}
                    {issue.eventId ?? 'catalogue'}
                  </p>
                  <p className="cg-card__meta">{issue.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </CareerShell>
  )
}
