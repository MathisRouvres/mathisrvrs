import { useMemo, useState } from 'react'
import {
  CAREER_LENGTHS,
  DIFFICULTIES,
  buildSummaryFromDraft,
  listDefaultFoundingChoices,
} from '../../game-engine'
import {
  foundingCategories,
  origins,
  playstyles,
  positions,
  visuals,
} from '../../game-content'
import { CareerButton } from './CareerShell'

const FOOT_LABELS = {
  left: 'Gauche',
  right: 'Droit',
  both: 'Ambidextre',
}

const DIFF_LABELS = {
  story: 'Histoire',
  balanced: 'Équilibré',
  demanding: 'Exigeant',
}

const LENGTH_LABELS = {
  short: 'Courte',
  standard: 'Standard',
  long: 'Longue',
}

const STEPS = [
  { id: 'identity', label: 'Identité' },
  { id: 'football', label: 'Football' },
  { id: 'settings', label: 'Parcours' },
  { id: 'founding', label: 'Origines' },
  { id: 'summary', label: 'Confirmation' },
]

function Field({ label, htmlFor, children, hint }) {
  return (
    <div className="cg-field">
      <label htmlFor={htmlFor} className="cg-label">
        {label}
      </label>
      {children}
      {hint ? <p className="cg-hint">{hint}</p> : null}
    </div>
  )
}

function ChoiceCard({ selected, title, summary, pros, cons, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`cg-choice${selected ? ' is-selected' : ''}`}
    >
      <p className="cg-choice__title">{title}</p>
      <p className="cg-choice__summary">{summary}</p>
      <div className="cg-choice__cols">
        <div className="cg-choice__pros">
          <strong>Atouts</strong>
          <ul>
            {pros.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="cg-choice__cons">
          <strong>Contreparties</strong>
          <ul>
            {cons.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  )
}

function Stars({ count }) {
  return (
    <span className="cg-stars" aria-label={`${count} étoiles sur 5`}>
      {'★'.repeat(count)}
      <span className="cg-stars__empty">{'☆'.repeat(5 - count)}</span>
    </span>
  )
}

export default function PlayerCreationWizard({ onCancel, onConfirm, busy }) {
  const [step, setStep] = useState(0)
  const [foundingIndex, setFoundingIndex] = useState(0)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState(() => ({
    firstName: '',
    lastName: '',
    nickname: '',
    originId: origins[0].id,
    birthYear: 2008,
    primaryPosition: 'cm',
    secondaryPosition: '',
    strongFoot: 'right',
    heightCm: 178,
    playstyleId: playstyles[0].id,
    visualId: visuals[0].id,
    difficulty: 'balanced',
    careerLength: 'standard',
    foundingChoices: listDefaultFoundingChoices(),
  }))

  const summary = useMemo(() => {
    if (step < STEPS.length - 1) return null
    try {
      return buildSummaryFromDraft({
        ...draft,
        nickname: draft.nickname || null,
        secondaryPosition: draft.secondaryPosition || null,
      })
    } catch {
      return null
    }
  }, [draft, step])

  const visual = visuals.find((v) => v.id === draft.visualId)

  function update(patch) {
    setDraft((prev) => ({ ...prev, ...patch }))
    setError(null)
  }

  function validateStep(index) {
    if (index === 0) {
      if (!draft.firstName.trim() || !draft.lastName.trim()) {
        return 'Indique un prénom et un nom.'
      }
    }
    if (index === 1) {
      if (
        draft.secondaryPosition &&
        draft.secondaryPosition === draft.primaryPosition
      ) {
        return 'Le poste secondaire doit être différent.'
      }
    }
    if (index === 3) {
      for (const category of foundingCategories) {
        if (!draft.foundingChoices[category.id]) {
          return `Choix manquant : ${category.title}`
        }
      }
    }
    return null
  }

  function goNext() {
    if (STEPS[step].id === 'founding') {
      if (foundingIndex < foundingCategories.length - 1) {
        setFoundingIndex((i) => i + 1)
        return
      }
    }
    const problem = validateStep(step)
    if (problem) {
      setError(problem)
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
    setFoundingIndex(0)
  }

  function goBack() {
    if (STEPS[step].id === 'founding' && foundingIndex > 0) {
      setFoundingIndex((i) => i - 1)
      return
    }
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleConfirm() {
    const problem = validateStep(3)
    if (problem) {
      setError(problem)
      return
    }
    try {
      await onConfirm({
        ...draft,
        nickname: draft.nickname?.trim() || null,
        secondaryPosition: draft.secondaryPosition || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.')
    }
  }

  const foundingCategory = foundingCategories[foundingIndex]

  return (
    <section aria-labelledby="creation-wizard-title">
      <p className="cg-kicker">
        Création · étape {step + 1}/{STEPS.length}
      </p>
      <h2 id="creation-wizard-title" className="cg-title">
        {STEPS[step].label}
      </h2>

      <ol className="cg-steps" aria-label="Progression">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            className={`cg-steps__item${
              i === step ? ' is-current' : i < step ? ' is-done' : ''
            }`}
          >
            {s.label}
          </li>
        ))}
      </ol>

      {error && (
        <p className="cg-alert cg-alert--error" role="alert">
          {error}
        </p>
      )}

      <div className="cg-stack" style={{ marginTop: '1.5rem' }}>
        {STEPS[step].id === 'identity' && (
          <>
            <Field label="Prénom" htmlFor="firstName">
              <input
                id="firstName"
                className="cg-input"
                value={draft.firstName}
                onChange={(e) => update({ firstName: e.target.value })}
                maxLength={40}
                required
                autoComplete="given-name"
              />
            </Field>
            <Field label="Nom" htmlFor="lastName">
              <input
                id="lastName"
                className="cg-input"
                value={draft.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
                maxLength={40}
                required
                autoComplete="family-name"
              />
            </Field>
            <Field label="Surnom (facultatif)" htmlFor="nickname">
              <input
                id="nickname"
                className="cg-input"
                value={draft.nickname}
                onChange={(e) => update({ nickname: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Field label="Pays / région d’origine" htmlFor="origin">
              <select
                id="origin"
                className="cg-select"
                value={draft.originId}
                onChange={(e) => update({ originId: e.target.value })}
              >
                {origins.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label} — {o.region}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Année de naissance"
              htmlFor="birthYear"
              hint="Académie : 2004 à 2010 (calendrier fictionnel 2026)."
            >
              <input
                id="birthYear"
                type="number"
                min={2004}
                max={2010}
                className="cg-input"
                value={draft.birthYear}
                onChange={(e) => update({ birthYear: Number(e.target.value) })}
              />
            </Field>
          </>
        )}

        {STEPS[step].id === 'football' && (
          <>
            <Field label="Poste principal" htmlFor="primaryPosition">
              <select
                id="primaryPosition"
                className="cg-select"
                value={draft.primaryPosition}
                onChange={(e) => update({ primaryPosition: e.target.value })}
              >
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Poste secondaire (facultatif)" htmlFor="secondaryPosition">
              <select
                id="secondaryPosition"
                className="cg-select"
                value={draft.secondaryPosition}
                onChange={(e) => update({ secondaryPosition: e.target.value })}
              >
                <option value="">Aucun</option>
                {positions
                  .filter((p) => p.id !== draft.primaryPosition)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
              </select>
            </Field>
            <fieldset className="cg-fieldset">
              <legend className="cg-legend">Pied fort</legend>
              <div className="cg-chip-row">
                {Object.entries(FOOT_LABELS).map(([id, label]) => (
                  <label
                    key={id}
                    className={`cg-chip${draft.strongFoot === id ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="foot"
                      className="sr-only"
                      checked={draft.strongFoot === id}
                      onChange={() => update({ strongFoot: id })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label={`Taille : ${draft.heightCm} cm`} htmlFor="height">
              <input
                id="height"
                type="range"
                min={160}
                max={205}
                value={draft.heightCm}
                onChange={(e) => update({ heightCm: Number(e.target.value) })}
                className="cg-range"
              />
            </Field>
            <Field label="Profil de jeu" htmlFor="playstyle">
              <select
                id="playstyle"
                className="cg-select"
                value={draft.playstyleId}
                onChange={(e) => update({ playstyleId: e.target.value })}
              >
                {playstyles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.blurb}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset className="cg-fieldset">
              <legend className="cg-legend">Identité visuelle</legend>
              <div className="cg-chip-row">
                {visuals.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={draft.visualId === v.id}
                    onClick={() => update({ visualId: v.id })}
                    className={`cg-chip${draft.visualId === v.id ? ' is-selected' : ''}`}
                  >
                    <span
                      className="cg-chip__swatch"
                      style={{ background: v.accent }}
                      aria-hidden="true"
                    />
                    {v.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {STEPS[step].id === 'settings' && (
          <>
            <fieldset className="cg-fieldset">
              <legend className="cg-legend">Difficulté</legend>
              <div className="cg-chip-row">
                {DIFFICULTIES.map((id) => (
                  <label
                    key={id}
                    className={`cg-chip${draft.difficulty === id ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      className="sr-only"
                      checked={draft.difficulty === id}
                      onChange={() => update({ difficulty: id })}
                    />
                    {DIFF_LABELS[id]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="cg-fieldset">
              <legend className="cg-legend">Durée de carrière</legend>
              <div className="cg-chip-row">
                {CAREER_LENGTHS.map((id) => (
                  <label
                    key={id}
                    className={`cg-chip${draft.careerLength === id ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="length"
                      className="sr-only"
                      checked={draft.careerLength === id}
                      onChange={() => update({ careerLength: id })}
                    />
                    {LENGTH_LABELS[id]}
                  </label>
                ))}
              </div>
              <p className="cg-hint">
                Influence aussi la densité narrative (Express / Standard /
                Immersion).
              </p>
            </fieldset>
          </>
        )}

        {STEPS[step].id === 'founding' && foundingCategory && (
          <div>
            <p className="cg-hint" style={{ marginTop: 0 }}>
              Choix {foundingIndex + 1}/{foundingCategories.length}
            </p>
            <h3 className="cg-section__title" style={{ marginTop: '0.35rem' }}>
              {foundingCategory.title}
            </h3>
            <p className="cg-lead" style={{ marginTop: '0.45rem', fontSize: '1rem' }}>
              {foundingCategory.prompt}
            </p>
            <div style={{ marginTop: '1rem' }}>
              {foundingCategory.options.map((option) => (
                <ChoiceCard
                  key={option.id}
                  selected={
                    draft.foundingChoices[foundingCategory.id] === option.id
                  }
                  title={option.label}
                  summary={option.summary}
                  pros={option.pros}
                  cons={option.cons}
                  onSelect={() =>
                    update({
                      foundingChoices: {
                        ...draft.foundingChoices,
                        [foundingCategory.id]: option.id,
                      },
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {STEPS[step].id === 'summary' && summary && (
          <article className="cg-player-card" aria-label="Carte récapitulative">
            <div
              className="cg-player-card__stripe"
              style={{ background: visual?.accent ?? undefined }}
              aria-hidden="true"
            />
            <div className="cg-player-card__body">
              <p className="cg-player-card__kicker">Carte joueur</p>
              <h3 className="cg-player-card__name">{summary.displayName}</h3>
              <p className="cg-card__meta">
                {summary.positionLabel} · {summary.originLabel} · {summary.age}{' '}
                ans · {summary.heightCm} cm · {FOOT_LABELS[summary.strongFoot]}
              </p>
              <p style={{ marginTop: '0.85rem', fontWeight: 600 }}>
                Potentiel perçu : <Stars count={summary.potentialStars} />
              </p>
              <p className="cg-quote" style={{ marginTop: '0.5rem', fontSize: '0.925rem' }}>
                « {summary.recruiterBlurb} »
              </p>
              <div className="cg-choice__cols" style={{ marginTop: '1.15rem' }}>
                <div>
                  <h4 className="cg-label">Forces</h4>
                  <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem', color: 'var(--cg-ink-soft)' }}>
                    {summary.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="cg-label">Faiblesses</h4>
                  <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem', color: 'var(--cg-ink-soft)' }}>
                    {summary.weaknesses.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="cg-hint">
                Les traits cachés ne sont pas révélés — seulement ce rapport de
                recruteur.
              </p>
              <ul className="cg-hint" style={{ listStyle: 'none', padding: 0 }}>
                {summary.foundingLabels.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </article>
        )}
      </div>

      <div className="cg-actions" style={{ marginTop: '1.75rem' }}>
        <CareerButton
          type="button"
          variant="ghost"
          onClick={step === 0 ? onCancel : goBack}
        >
          {step === 0 ? 'Annuler' : 'Retour'}
        </CareerButton>
        {STEPS[step].id !== 'summary' ? (
          <CareerButton type="button" variant="primary" onClick={goNext}>
            Continuer
          </CareerButton>
        ) : (
          <CareerButton
            type="button"
            variant="primary"
            disabled={busy || !summary}
            onClick={handleConfirm}
          >
            {busy ? 'Création…' : 'Confirmer et lancer la carrière'}
          </CareerButton>
        )}
      </div>
    </section>
  )
}
