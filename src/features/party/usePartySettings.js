import { useCallback, useEffect, useState } from 'react'
import { isLevel, sanitizePlayers } from './engine'
import { setPartySound } from './components/useCountdown'

const STORAGE_KEY = 'party-settings-v1'

export const LEVEL_META = {
  soft: { label: 'Soft', emoji: '😇', hint: 'Tout public' },
  spicy: { label: 'Épicé', emoji: '🌶️', hint: 'Entre potes' },
  hot: { label: 'Hot', emoji: '🔥', hint: '+18' },
}

const DEFAULTS = { level: 'soft', adult: false, players: [], sound: true }

/** Lecture défensive : le stockage peut être vide, bloqué ou corrompu. */
function readSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return DEFAULTS
    const adult = raw.adult === true
    const level = isLevel(raw.level) && (raw.level !== 'hot' || adult) ? raw.level : 'soft'
    const players = Array.isArray(raw.players) ? sanitizePlayers(raw.players) : []
    const sound = raw.sound !== false
    return { level, adult, players, sound }
  } catch {
    return DEFAULTS
  }
}

/** Réglages partagés par tous les jeux : niveau, confirmation +18, joueurs, son. */
export function usePartySettings() {
  const [settings, setSettings] = useState(readSettings)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Stockage indisponible (navigation privée) : les réglages restent en mémoire.
    }
  }, [settings])

  useEffect(() => {
    setPartySound(settings.sound)
  }, [settings.sound])

  const setLevel = useCallback((level) => {
    setSettings((s) => (isLevel(level) && (level !== 'hot' || s.adult) ? { ...s, level } : s))
  }, [])

  const confirmAdult = useCallback(() => {
    setSettings((s) => ({ ...s, adult: true, level: 'hot' }))
  }, [])

  const setPlayers = useCallback((players) => {
    setSettings((s) => ({ ...s, players: sanitizePlayers(players) }))
  }, [])

  const toggleSound = useCallback(() => {
    setSettings((s) => ({ ...s, sound: !s.sound }))
  }, [])

  return { ...settings, setLevel, confirmAdult, setPlayers, toggleSound }
}
