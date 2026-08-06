import { useState } from 'react'
import { MonovomyButton } from '../MonovomyShell'
import MvMapPicker from './MvMapPicker'
import { DIFFICULTY_IDS, DIFFICULTY_LABELS, DIFFICULTY_MULTIPLIER } from '../engine'

export default function MvOnlineLobby({
  configured,
  screen,
  role,
  roomCode,
  members,
  error,
  mapId,
  onSelectMap,
  presetCode = '',
  presetName = '',
  presetDrinkMode = 'alcohol',
  onCreate,
  onJoin,
  onStart,
  onShare,
  onExit,
}) {
  const [name, setName] = useState(presetName)
  const [drinkMode, setDrinkMode] = useState(presetDrinkMode)
  const [difficulty, setDifficulty] = useState('inter')
  const [joinCode, setJoinCode] = useState(presetCode)

  if (!configured) {
    return (
      <div className="mv-online">
        <section className="mv-hero">
          <p className="mv-eyebrow">En ligne</p>
          <h1 className="mv-hero__title">Presque prêt</h1>
        </section>
        <section className="mv-card">
          <h2 className="mv-card__title">Configuration requise</h2>
          <p className="mv-card__line">Le mode en ligne utilise Supabase Realtime. Pour l’activer :</p>
          <ol className="mv-steps">
            <li>Crée un projet gratuit sur supabase.com</li>
            <li><code>npm i @supabase/supabase-js</code></li>
            <li>Dans <code>.env.local</code> : <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code></li>
            <li>Relance <code>npm run dev</code></li>
          </ol>
        </section>
        <div className="mv-actions">
          <MonovomyButton variant="ghost" onClick={onExit}>← Menu</MonovomyButton>
        </div>
      </div>
    )
  }

  if (screen === 'lobby') {
    return (
      <div className="mv-online">
        <section className="mv-hero">
          <p className="mv-eyebrow">Salon</p>
          <h1 className="mv-hero__title">Code : {roomCode}</h1>
          <p className="mv-hero__sub">Partage ce code avec tes potes</p>
          {onShare && (
            <div className="mv-actions">
              <MonovomyButton variant="secondary" onClick={onShare}>📲 Inviter</MonovomyButton>
            </div>
          )}
        </section>
        <section className="mv-card">
          <h2 className="mv-card__title">Joueurs ({members.length})</h2>
          <ul className="mv-players">
            {members.map((m) => (
              <li key={m.clientId} className="mv-prow">
                <span className="mv-avatar">{m.avatar}</span>
                <span className="mv-prow__name">
                  {m.name} <small>{m.drinkMode === 'soft' ? '🥤' : '🍺'}</small>
                </span>
                <span className="mv-prow__pos">{m.isHost ? 'Hôte' : `Siège ${m.seat + 1}`}</span>
              </li>
            ))}
          </ul>
        </section>
        <MvMapPicker
          value={mapId}
          onSelect={onSelectMap}
          canEdit={role === 'host'}
          playerCount={members.length}
        />
        <div className="mv-actions">
          {role === 'host' ? (
            <MonovomyButton onClick={onStart}>Lancer la partie</MonovomyButton>
          ) : (
            <p className="mv-wait">En attente du lancement par l’hôte…</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mv-online">
      <section className="mv-hero">
        <p className="mv-eyebrow">En ligne</p>
        <h1 className="mv-hero__title">Rejoins la soirée</h1>
      </section>

      {error && <p className="mv-error">{error}</p>}

      <section className="mv-card">
        <h2 className="mv-card__title">Ton profil</h2>
        <div className="mv-playerrow">
          <input
            className="mv-input"
            placeholder="Ton pseudo"
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            className={`mv-mode ${drinkMode === 'alcohol' ? 'is-alcohol' : 'is-soft'}`}
            onClick={() => setDrinkMode(drinkMode === 'alcohol' ? 'soft' : 'alcohol')}
          >
            {drinkMode === 'alcohol' ? '🍺 Alcool' : '🥤 Soft'}
          </button>
        </div>
      </section>

      <section className="mv-card">
        <h2 className="mv-card__title">Créer une partie</h2>
        <div className="mv-choicerow">
          {DIFFICULTY_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`mv-choice ${difficulty === id ? 'is-active' : ''}`}
              onClick={() => setDifficulty(id)}
            >
              <span>{DIFFICULTY_LABELS[id]}</span>
              <small>×{DIFFICULTY_MULTIPLIER[id]}</small>
            </button>
          ))}
        </div>
        <div className="mv-actions">
          <MonovomyButton onClick={() => onCreate({ name, drinkMode }, difficulty)}>Créer</MonovomyButton>
        </div>
      </section>

      <section className="mv-card">
        <h2 className="mv-card__title">Rejoindre</h2>
        {presetCode && (
          <p className="mv-card__line">
            Invitation reçue pour la partie <strong>{presetCode}</strong> — entre ton pseudo puis rejoins.
          </p>
        )}
        <div className="mv-playerrow">
          <input
            className="mv-input"
            placeholder="Code (ex. AB2C)"
            value={joinCode}
            maxLength={6}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <MonovomyButton variant="secondary" onClick={() => onJoin({ name, drinkMode }, joinCode)}>
            Rejoindre
          </MonovomyButton>
        </div>
      </section>

      <div className="mv-actions">
        <MonovomyButton variant="ghost" onClick={onExit}>← Menu</MonovomyButton>
      </div>
    </div>
  )
}
