import { useState } from 'react'
import { MonovomyButton } from '../MonovomyShell'
import MvBackdrop from './MvBackdrop'
import { PAWNS, PAWN_COUNT } from './board3d/pawnCatalog'
import { playerColor } from './board3d/playerColors'
import {
  DIFFICULTY_IDS,
  DIFFICULTY_LABELS,
  DIFFICULTY_MULTIPLIER,
  DURATION_MINUTES,
  TURN_SECONDS_OPTIONS,
  PLAYER_MIN,
  PLAYER_MAX,
} from '../engine'

function makeSeed() {
  return `mv-${Date.now()}-${Math.round(Math.random() * 1e9)}`
}

export default function MvLobby({ onStart, version, onExit }) {
  const [difficulty, setDifficulty] = useState('inter')
  const [duration, setDuration] = useState(60)
  const [turnSeconds, setTurnSeconds] = useState(null)
  const [fair, setFair] = useState(true)
  const [auction, setAuction] = useState(true)
  const [players, setPlayers] = useState([
    { name: '', mode: 'alcohol', pawn: 0 },
    { name: '', mode: 'alcohol', pawn: 1 },
    { name: '', mode: 'alcohol', pawn: 2 },
    { name: '', mode: 'alcohol', pawn: 3 },
  ])

  const setCount = (count) => {
    setPlayers((prev) => {
      const nextPlayers = prev.slice(0, count)
      while (nextPlayers.length < count) {
        nextPlayers.push({ name: '', mode: 'alcohol', pawn: nextPlayers.length % PAWN_COUNT })
      }
      return nextPlayers
    })
  }

  const updatePlayer = (index, patch) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  const handleStart = () => {
    const config = {
      difficulty,
      durationMinutes: duration,
      turnSeconds,
      bankruptcy: 'none',
      shuffleOrder: fair,
      startCompensation: fair,
      auctionOnPass: auction,
      themeId: 'soiree',
      seed: makeSeed(),
    }
    const setups = players.map((p, i) => {
      const name = p.name.trim() || `Joueur ${i + 1}`
      return { id: `p${i + 1}`, name, avatar: name.charAt(0).toUpperCase(), drinkMode: p.mode, pawn: p.pawn ?? i % PAWN_COUNT }
    })
    onStart(config, setups)
  }

  return (
    <div className="mv-lobby">
      <MvBackdrop />

      <section className="mv-hero mv-hero--home">
        <p className="mv-eyebrow mv-eyebrow--pill">Partie locale</p>
        <h1 className="mv-hero__title mv-hero__title--neon">
          <span className="mv-mono">MONO</span>
          <span className="mv-vomy">VOMY</span>
        </h1>
        <p className="mv-hero__sub">Hot-seat · un téléphone qui tourne · contenu v{version}</p>
      </section>

      <section className="mv-card">
        <h2 className="mv-card__title"><span className="mv-card__ic">🎯</span> Difficulté</h2>
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
      </section>

      <section className="mv-card">
        <h2 className="mv-card__title"><span className="mv-card__ic">⏱️</span> Durée de partie</h2>
        <div className="mv-choicerow">
          {DURATION_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              className={`mv-choice ${duration === m ? 'is-active' : ''}`}
              onClick={() => setDuration(m)}
            >
              <span>{m} min</span>
            </button>
          ))}
        </div>
        <h2 className="mv-card__title mv-card__title--sub"><span className="mv-card__ic">⌛</span> Temps par tour</h2>
        <div className="mv-choicerow">
          {TURN_SECONDS_OPTIONS.map((s) => (
            <button
              key={String(s)}
              type="button"
              className={`mv-choice ${turnSeconds === s ? 'is-active' : ''}`}
              onClick={() => setTurnSeconds(s)}
            >
              <span>{s === null ? '∞' : `${s} s`}</span>
            </button>
          ))}
        </div>
        <div className="mv-togglerow">
          <button
            type="button"
            className={`mv-toggle ${fair ? 'is-on' : ''}`}
            aria-pressed={fair}
            onClick={() => setFair((v) => !v)}
          >
            <span className="mv-toggle__ic">⚖️</span>
            <span className="mv-toggle__label">Ordre équitable</span>
            <span className="mv-toggle__state">{fair ? 'ON' : 'OFF'}</span>
          </button>
          <button
            type="button"
            className={`mv-toggle ${auction ? 'is-on' : ''}`}
            aria-pressed={auction}
            onClick={() => setAuction((v) => !v)}
          >
            <span className="mv-toggle__ic">🔨</span>
            <span className="mv-toggle__label">Enchères</span>
            <span className="mv-toggle__state">{auction ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </section>

      <section className="mv-card">
        <h2 className="mv-card__title"><span className="mv-card__ic">🧑‍🤝‍🧑</span> Joueurs</h2>
        <div className="mv-counter">
          <MonovomyButton
            variant="ghost"
            className="mv-counter__btn"
            aria-label="Retirer un joueur"
            onClick={() => setCount(Math.max(PLAYER_MIN, players.length - 1))}
          >
            −
          </MonovomyButton>
          <span className="mv-counter__value">{players.length}</span>
          <MonovomyButton
            variant="ghost"
            className="mv-counter__btn"
            aria-label="Ajouter un joueur"
            onClick={() => setCount(Math.min(PLAYER_MAX, players.length + 1))}
          >
            +
          </MonovomyButton>
        </div>
        <ul className="mv-players">
          {players.map((p, i) => (
            <li key={i} className="mv-playerrow">
              <div className="mv-playerrow__top">
                <span className="mv-playerrow__dot" style={{ background: playerColor(i), color: playerColor(i) }} />
                <input
                  className="mv-input"
                  placeholder={`Joueur ${i + 1}`}
                  value={p.name}
                  maxLength={16}
                  onChange={(e) => updatePlayer(i, { name: e.target.value })}
                />
                <button
                  type="button"
                  className={`mv-mode ${p.mode === 'alcohol' ? 'is-alcohol' : 'is-soft'}`}
                  onClick={() => updatePlayer(i, { mode: p.mode === 'alcohol' ? 'soft' : 'alcohol' })}
                >
                  {p.mode === 'alcohol' ? '🍺 Alcool' : '🥤 Soft'}
                </button>
              </div>
              <div className="mv-pawnpick" role="radiogroup" aria-label={`Pion du joueur ${i + 1}`}>
                {PAWNS.map((pawn, k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={p.pawn === k}
                    title={pawn.label}
                    className={`mv-pawnpick__opt ${p.pawn === k ? 'is-active' : ''}`}
                    style={p.pawn === k ? { '--pc': playerColor(i) } : undefined}
                    onClick={() => updatePlayer(i, { pawn: k })}
                  >
                    {pawn.emoji}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mv-actions mv-actions--row">
        {onExit && (
          <MonovomyButton variant="ghost" className="mv-btn--shine" onClick={onExit}>
            ← Menu
          </MonovomyButton>
        )}
        <MonovomyButton className="mv-btn--shine mv-btn--lg" onClick={handleStart}>
          🎲 Lancer la partie
        </MonovomyButton>
      </div>
    </div>
  )
}
