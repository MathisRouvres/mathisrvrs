import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LEGACY_DIMENSION_LABELS,
  buildFinalReport,
  buildShareCard,
  completeSeason,
  deriveCareerTier,
  getCareerSummary,
  buildTimelineCards,
  getNextDilemma,
  getPastEcho,
  interpolateDilemma,
  isCareerFinished,
  listCareerTiers,
  resolveDilemmaChoice,
} from '../../game-engine'
import { MACRO_POSITIONS, countries } from '../../game-content'
import { getLocalCareerStore } from './persistence/localCareerStore'
import CareerShell, { CareerButton } from './CareerShell'
import DilemmaPanel from './DilemmaPanel'
import PlayerHeroCard from './components/PlayerHeroCard'
import SecondaryRail from './components/SecondaryRail'
import SeasonProgress from './components/SeasonProgress'
import AttributesPanel from './components/AttributesPanel'
import SeasonSummary from './components/SeasonSummary'
import CareerMilestoneModal from './components/CareerMilestoneModal'
import StatChangeToast from './components/StatChangeToast'
import TimelineCard from './components/TimelineCard'
import { stageMilestone } from './components/careerUiMaps'

/** Durée d'affichage du retour de conséquences (toast non bloquant). */
const TOAST_MS = 3000

/** Flags marquant une décision irréversible → double appui de confirmation. */
const IRREVERSIBLE_FLAGS = ['wants_retirement', 'transfer_accepted']

function effectsSetIrreversibleFlag(effects) {
  return effects.some((e) => {
    if (e.type === 'setFlag' && IRREVERSIBLE_FLAGS.includes(e.key)) return true
    if (e.type === 'skillCheck') {
      return (
        effectsSetIrreversibleFlag(e.onSuccess) ||
        effectsSetIrreversibleFlag(e.onFail)
      )
    }
    if (e.type === 'chance') return effectsSetIrreversibleFlag(e.effects)
    return false
  })
}

function isIrreversibleChoice(choice) {
  return (
    effectsSetIrreversibleFlag(choice.immediate) ||
    effectsSetIrreversibleFlag(choice.hidden) ||
    choice.delayed.some((d) => effectsSetIrreversibleFlag(d.effects))
  )
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatMoney(value) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} €`
}

/**
 * Écran de départ unique : titre, concept, cartes pays, cartes poste,
 * un bouton. Aucun champ texte, aucun compte requis.
 */
const GENDER_OPTIONS = [
  { id: 'male', label: 'Masculine' },
  { id: 'female', label: 'Féminine' },
]

function StartScreen({ busy, onStart }) {
  const [countryId, setCountryId] = useState(null)
  const [macroPosition, setMacroPosition] = useState(null)
  const [gender, setGender] = useState('male')
  const ready = Boolean(countryId && macroPosition)

  return (
    <section className="cg-section cg-start" aria-labelledby="start-title">
      <p className="cg-kicker">Carrière express</p>
      <h1 id="start-title" className="cg-title">
        Deux choix par saison.
        <br />
        Une carrière entière.
      </h1>
      <p className="cg-lead">
        Choisis un pays et un poste — tout le reste est généré. Chaque saison,
        deux dilemmes décident de ta trajectoire, jusqu’à la retraite.
      </p>

      <fieldset className="cg-fieldset">
        <legend className="cg-label">Ton pays de départ</legend>
        <div className="cg-choice-grid">
          {countries.map((country) => (
            <button
              key={country.id}
              type="button"
              aria-pressed={countryId === country.id}
              className={`cg-choice${countryId === country.id ? ' is-selected' : ''}`}
              disabled={busy}
              onClick={() => setCountryId(country.id)}
            >
              <span className="cg-choice__title">{country.label}</span>
              <span className="cg-choice__summary">{country.blurb}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="cg-fieldset">
        <legend className="cg-label">Ton poste</legend>
        <div className="cg-choice-grid cg-choice-grid--positions">
          {MACRO_POSITIONS.map((position) => (
            <button
              key={position.id}
              type="button"
              aria-pressed={macroPosition === position.id}
              className={`cg-choice${macroPosition === position.id ? ' is-selected' : ''}`}
              disabled={busy}
              onClick={() => setMacroPosition(position.id)}
            >
              <span className="cg-choice__title">{position.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="cg-fieldset">
        <legend className="cg-label">Ta carrière</legend>
        <div className="cg-choice-grid cg-choice-grid--positions">
          {GENDER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={gender === option.id}
              className={`cg-choice${gender === option.id ? ' is-selected' : ''}`}
              disabled={busy}
              onClick={() => setGender(option.id)}
            >
              <span className="cg-choice__title">{option.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="cg-actions">
        <CareerButton
          type="button"
          variant="primary"
          className="cg-btn--hero"
          disabled={busy || !ready}
          onClick={() => onStart({ countryId, macroPosition, gender })}
        >
          {busy ? 'Création…' : 'Commencer ma carrière'}
        </CareerButton>
      </div>
    </section>
  )
}

/** Barre de dimension d’héritage — valeur lisible sans dépendre de la couleur. */
function LegacyBar({ label, value }) {
  return (
    <div className="cg-legacy-row">
      <span className="cg-legacy-row__label">{label}</span>
      <span className="cg-legacy-track" aria-hidden="true">
        <span className="cg-legacy-fill" style={{ width: `${value}%` }} />
      </span>
      <span className="cg-legacy-row__value">{value}</span>
    </div>
  )
}

/** Carte partageable — aucune donnée personnelle de l’utilisateur. */
function ShareCard({ card }) {
  return (
    <figure className="cg-sharecard cg-anim-trophy">
      <figcaption className="cg-sharecard__head">
        <span className="cg-sharecard__title">{card.archetypeTitle}</span>
        <span className="cg-sharecard__legacy">{card.legacyScore}</span>
      </figcaption>
      <p className="cg-sharecard__name">{card.displayName}</p>
      <p className="cg-sharecard__meta">
        {card.positionLabel} · {card.countryLabel}
      </p>
      <dl className="cg-sharecard__stats">
        <div>
          <dt>Retraite</dt>
          <dd>{card.retirementAge} ans</dd>
        </div>
        <div>
          <dt>Meilleur club</dt>
          <dd>{card.bestClubName}</dd>
        </div>
        <div>
          <dt>Trophées</dt>
          <dd>{card.trophies}</dd>
        </div>
      </dl>
      <p className="cg-sharecard__foot">Carrière express · héritage {card.legacyScore}/100</p>
    </figure>
  )
}

function CareerEndScreen({ report, card, timelineCards, onNewCareer, onReplaySame }) {
  const t = report.totals
  const isGk = report.positionLabel.toLowerCase().includes('gardien')
  const tier = deriveCareerTier(report.legacyScore, report.bestLevel)

  return (
    <section className="cg-section cg-end" aria-labelledby="end-heading">
      <p className="cg-kicker cg-anim-enter">Fin de carrière</p>
      <h2 id="end-heading" className="cg-title cg-anim-enter">
        {report.archetype.title}
      </h2>
      <p className="cg-lead cg-anim-enter">{report.archetype.tagline}</p>

      <ShareCard card={card} />

      <div className="cg-panel cg-anim-enter">
        <h3 className="cg-label">Palier atteint · {tier.label}</h3>
        <div className="cg-tierscale">
          {listCareerTiers().map((ct) => (
            <div
              key={ct.id}
              className={`cg-tier${ct.id === tier.id ? ' is-current' : ''}`}
              aria-current={ct.id === tier.id ? 'true' : undefined}
            >
              <span className="cg-tier__rank">{ct.rank}</span>
              <span>{ct.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cg-panel cg-anim-enter">
        <h3 className="cg-label">Héritage · {report.legacyScore}/100</h3>
        <div className="cg-legacy">
          {Object.entries(LEGACY_DIMENSION_LABELS).map(([id, label]) => (
            <LegacyBar key={id} label={label} value={report.legacy[id]} />
          ))}
        </div>
      </div>

      <div className="cg-panel cg-anim-enter">
        <h3 className="cg-label">Carte de carrière</h3>
        <dl className="cg-dl" style={{ marginTop: '0.6rem' }}>
          <div>
            <dt>Joueur</dt>
            <dd>{report.displayName}</dd>
          </div>
          <div>
            <dt>Pays · poste</dt>
            <dd>
              {report.countryLabel} · {report.positionLabel}
            </dd>
          </div>
          <div>
            <dt>Retraite</dt>
            <dd>
              {report.retirementAge} ans · {report.seasons} saisons
            </dd>
          </div>
          <div>
            <dt>Matchs</dt>
            <dd>{t.matches}</dd>
          </div>
          {isGk ? (
            <>
              <div>
                <dt>Clean sheets</dt>
                <dd>{t.cleanSheets}</dd>
              </div>
              <div>
                <dt>Arrêts décisifs</dt>
                <dd>{t.keySaves}</dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>Buts</dt>
                <dd>{t.goals}</dd>
              </div>
              <div>
                <dt>Passes décisives</dt>
                <dd>{t.assists}</dd>
              </div>
            </>
          )}
          <div>
            <dt>Sélections</dt>
            <dd>{t.nationalCaps}</dd>
          </div>
          <div>
            <dt>Trophées · distinctions</dt>
            <dd>
              {t.trophies} · {t.distinctions}
            </dd>
          </div>
          <div>
            <dt>Blessures graves</dt>
            <dd>{t.majorInjuries}</dd>
          </div>
          <div>
            <dt>Meilleur niveau</dt>
            <dd>{report.bestLevel}</dd>
          </div>
          <div>
            <dt>Fortune</dt>
            <dd>{formatMoney(report.fortune)}</dd>
          </div>
          <div className="cg-dl__full">
            <dt>Clubs</dt>
            <dd>{report.clubs.map((c) => c.name).join(' → ') || '—'}</dd>
          </div>
          {report.trophyList.length > 0 && (
            <div className="cg-dl__full">
              <dt>Palmarès</dt>
              <dd>{report.trophyList.join(', ')}</dd>
            </div>
          )}
          <div className="cg-dl__full">
            <dt>Rivalité</dt>
            <dd>
              {report.rival.displayName} — niveau {report.rival.level},{' '}
              {report.rival.trophies} trophée
              {report.rival.trophies > 1 ? 's' : ''}. {report.rival.verdict}
            </dd>
          </div>
          <div className="cg-dl__full">
            <dt>Relations marquantes</dt>
            <dd>
              {report.keyRelationships.map((r) => (
                <span key={r.role} style={{ display: 'block' }}>
                  <strong>{r.name}</strong> ({r.role.toLowerCase()}) — {r.note}
                </span>
              ))}
            </dd>
          </div>
          <div className="cg-dl__full">
            <dt>Décisions importantes</dt>
            <dd>
              <ul className="cg-decisions">
                {report.keyDecisions.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="cg-dl__full">
            <dt>Résumé</dt>
            <dd className="cg-quote">{report.narrative}</dd>
          </div>
        </dl>
      </div>

      {timelineCards.length > 0 && (
        <details className="cg-hud__more">
          <summary>Voir toutes les saisons</summary>
          <ol className="cg-tltimeline" style={{ marginTop: '0.6rem' }}>
            {timelineCards.map((card) => (
              <TimelineCard key={`tl-${card.seasonIndex}`} card={card} />
            ))}
          </ol>
        </details>
      )}

      <div className="cg-actions">
        <CareerButton
          type="button"
          variant="primary"
          className="cg-btn--hero"
          onClick={onNewCareer}
        >
          Nouvelle carrière
        </CareerButton>
        <CareerButton type="button" variant="secondary" onClick={onReplaySame}>
          Rejouer {report.countryLabel} · {report.positionLabel}
        </CareerButton>
      </div>
    </section>
  )
}

function SavedCareersList({
  careers,
  busy,
  onResume,
  onDelete,
  confirmDeleteId,
  setConfirmDeleteId,
}) {
  if (careers.length === 0) return null
  return (
    <section className="cg-section" aria-labelledby="saved-heading">
      <h2 id="saved-heading" className="cg-section__title">
        Carrières sauvegardées
      </h2>
      <ul className="cg-list">
        {careers.map((career) => (
          <li key={career.id} className="cg-card">
            <div>
              <p className="cg-card__title">{career.displayName}</p>
              <p className="cg-card__meta">
                S{career.seasonIndex} · {career.age} ans ·{' '}
                {formatDate(career.updatedAt)}
                {career.status === 'finished' ? ' · Terminée' : ''}
              </p>
              {career.legacy && (
                <p className="cg-hint">
                  Sauvegarde legacy ({career.legacyReason ?? 'format ancien'}) —
                  conservée en lecture seule.
                </p>
              )}
            </div>
            <div className="cg-actions" style={{ marginTop: 0 }}>
              {!career.legacy && (
                <CareerButton
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => onResume(career.id)}
                >
                  Reprendre
                </CareerButton>
              )}
              {confirmDeleteId === career.id ? (
                <>
                  <CareerButton
                    type="button"
                    variant="danger"
                    disabled={busy}
                    onClick={() => onDelete(career.id)}
                  >
                    Confirmer
                  </CareerButton>
                  <CareerButton
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Annuler
                  </CareerButton>
                </>
              ) : (
                <CareerButton
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirmDeleteId(career.id)}
                >
                  Supprimer
                </CareerButton>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Reprise automatique : la carrière express active la plus récente. */
function bootstrap(store) {
  const careers = store.listCareers()
  const resumable = careers.find(
    (c) => !c.legacy && !c.readOnly && c.status === 'active',
  )
  if (resumable) {
    const pkg = store.getCareer(resumable.id)
    if (pkg && pkg.snapshot.state.flags.createdVia === 'express') {
      return { careers, active: pkg }
    }
  }
  return { careers, active: null }
}

export default function CareerApp() {
  const store = useMemo(() => getLocalCareerStore(), [])
  const [boot] = useState(() => bootstrap(store))
  const [careers, setCareers] = useState(boot.careers)
  const [active, setActive] = useState(boot.active)
  const [view, setView] = useState(() =>
    boot.active
      ? isCareerFinished(boot.active)
        ? 'finished'
        : 'play'
      : 'start',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [dilemma, setDilemma] = useState(() =>
    boot.active && !isCareerFinished(boot.active)
      ? getNextDilemma(boot.active)
      : null,
  )
  const [armedChoiceId, setArmedChoiceId] = useState(null)
  const [lastBilan, setLastBilan] = useState(null)
  const [milestone, setMilestone] = useState(null)
  // Conséquences du dernier choix : toast éphémère + surlignage des attributs.
  const [toast, setToast] = useState(null)
  const [recentDeltas, setRecentDeltas] = useState([])
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [saved, setSaved] = useState(false)

  const refreshList = useCallback(() => {
    setCareers(store.listCareers())
  }, [store])

  // Le toast disparaît seul — aucune validation requise pour continuer.
  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(id)
  }, [toast])

  const enterCareer = useCallback((pkg) => {
    setActive(pkg)
    setToast(null)
    setRecentDeltas([])
    setArmedChoiceId(null)
    if (isCareerFinished(pkg)) {
      setDilemma(null)
      setView('finished')
      return
    }
    setDilemma(getNextDilemma(pkg))
    setView('play')
  }, [])

  async function handleStart({ countryId, macroPosition, gender = 'male' }) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const pkg = await store.createExpressCareer({
        countryId,
        macroPosition,
        gender,
      })
      enterCareer(pkg)
      setSaved(true)
      refreshList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function handleResume(id) {
    setBusy(true)
    setError(null)
    setLastBilan(null)
    try {
      const pkg = store.getCareer(id)
      if (!pkg) throw new Error('Sauvegarde introuvable.')
      enterCareer(pkg)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reprise impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    setBusy(true)
    setError(null)
    try {
      await store.deleteCareer(id)
      if (active?.snapshot.id === id) {
        setActive(null)
        setDilemma(null)
        setView('start')
      }
      setConfirmDeleteId(null)
      refreshList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function handleChoice(choiceId) {
    if (!active || !dilemma || busy) return

    // Décision irréversible (retraite, transfert) : premier appui arme,
    // second confirme — seule exception à la résolution immédiate.
    const choice = dilemma.choices.find((c) => c.id === choiceId)
    if (choice && isIrreversibleChoice(choice) && armedChoiceId !== choiceId) {
      setArmedChoiceId(choiceId)
      return
    }
    setArmedChoiceId(null)

    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const {
        package: resolved,
        shouldCompleteSeason,
        visibleDeltas,
        statDeltas,
        hasHiddenConsequences,
      } = resolveDilemmaChoice(active, dilemma, choiceId)

      if (shouldCompleteSeason) {
        // Deuxième dilemme résolu → simulation + bilan (les conséquences y sont
        // détaillées), on y passe directement.
        const { package: next, result } = completeSeason(resolved)
        const savedPkg = await store.saveCareer(next)
        setActive(savedPkg)
        setLastBilan(result)
        setMilestone(
          stageMilestone(result.careerStageBefore, result.careerStageAfter),
        )
        setToast(null)
        setRecentDeltas([])
        setView('bilan')
      } else {
        // Premier dilemme résolu → enchaînement immédiat du second, sans
        // écran de validation. Les conséquences défilent en toast.
        const savedPkg = await store.saveCareer(resolved)
        setActive(savedPkg)
        setDilemma(getNextDilemma(savedPkg))
        setRecentDeltas(statDeltas)
        setToast({ deltas: visibleDeltas, hasHidden: hasHiddenConsequences })
      }
      setSaved(true)
      refreshList()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Choix impossible.')
    } finally {
      setBusy(false)
    }
  }

  function handleContinueAfterBilan() {
    if (!active) return
    setLastBilan(null)
    setMilestone(null)
    setToast(null)
    setRecentDeltas([])
    if (isCareerFinished(active)) {
      setView('finished')
      return
    }
    setDilemma(getNextDilemma(active))
    setView('play')
  }

  function handleNewCareer() {
    setActive(null)
    setDilemma(null)
    setToast(null)
    setRecentDeltas([])
    setLastBilan(null)
    setMilestone(null)
    setView('start')
    refreshList()
  }

  /** Rejouer la même combinaison pays + poste + genre, nouvelle seed. */
  async function handleReplaySame() {
    if (!active || busy) return
    const { countryId, macroPosition } = active.snapshot.state
    const gender = active.playerProfile?.gender ?? 'male'
    await handleStart({ countryId, macroPosition, gender })
  }

  const summary = active ? getCareerSummary(active) : null
  const finalReport =
    view === 'finished' && active ? buildFinalReport(active) : null

  return (
    <CareerShell title="Mode Carrière">
      {error && (
        <div className="cg-alert cg-alert--error" role="alert">
          {error}
        </div>
      )}

      {view === 'start' && (
        <>
          <StartScreen busy={busy} onStart={handleStart} />
          <SavedCareersList
            careers={careers}
            busy={busy}
            onResume={handleResume}
            onDelete={handleDelete}
            confirmDeleteId={confirmDeleteId}
            setConfirmDeleteId={setConfirmDeleteId}
          />
        </>
      )}

      {view === 'play' && summary && (
        <div aria-live="polite" className="cg-game">
          <div className="cg-topgrid">
            <PlayerHeroCard summary={summary} saved={saved} />
            <SecondaryRail summary={summary} />
          </div>

          <SeasonProgress
            seasonIndex={summary.seasonIndex}
            stageLabel={summary.careerStageLabel}
            dilemmaNumber={Math.min(summary.dilemmasResolvedThisSeason + 1, 2)}
          />

          {dilemma ? (
            <DilemmaPanel
              event={interpolateDilemma(dilemma, active.snapshot.state.npcs)}
              echo={getPastEcho(dilemma, active.snapshot.state)}
              busy={busy}
              armedChoiceId={armedChoiceId}
              onChoose={handleChoice}
            />
          ) : (
            <p className="cg-hint">Aucun dilemme disponible.</p>
          )}

          <AttributesPanel
            attributes={summary.attributes}
            statDeltas={recentDeltas}
          />

          <div className="cg-actions">
            <CareerButton type="button" variant="ghost" onClick={handleNewCareer}>
              Quitter (sauvegardé)
            </CareerButton>
          </div>

          <StatChangeToast toast={toast} onDismiss={() => setToast(null)} />
        </div>
      )}

      {view === 'bilan' && lastBilan && (
        <>
          <SeasonSummary
            bilan={lastBilan}
            summary={summary}
            finished={active ? isCareerFinished(active) : false}
            onContinue={handleContinueAfterBilan}
          />
          {milestone && (
            <CareerMilestoneModal
              milestone={milestone}
              onClose={() => setMilestone(null)}
            />
          )}
        </>
      )}

      {view === 'finished' && finalReport && (
        <CareerEndScreen
          report={finalReport}
          card={buildShareCard(finalReport)}
          timelineCards={
            active ? buildTimelineCards(active.snapshot.state) : []
          }
          onNewCareer={handleNewCareer}
          onReplaySame={handleReplaySame}
        />
      )}

      <p className="cg-footer-note">
        Sauvegarde locale automatique — recharge la page, tu reprendras au même
        endroit.
      </p>
    </CareerShell>
  )
}
