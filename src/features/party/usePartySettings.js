import { useCallback, useEffect, useState } from 'react'
import { isLevel, sanitizePlayers } from './engine'

const STORAGE_KEY = 'party-settings-v1'

export const LEVEL_META = {
  soft: { label: 'Soft', emoji: '😇', hint: 'Tout public' },
  spicy: { label: 'Épicé', emoji: '🌶️', hint: 'Entre potes' },
  hot: { label: 'Hot', emoji: '🔥', hint: '+18' },
}

const DEFAULTS = { level: 'soft', adult: false, players: [] }

/** Lecture défensive : le stockage peut être vide, bloqué ou corrompu. */
function readSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return DEFAULTS
    const adult = raw.adult === true
    const level = isLevel(raw.level) && (raw.level !== 'hot' || adult) ? raw.level : 'soft'
    const players = Array.isArray(raw.players) ? sanitizePlayers(raw.players) : []
    return { level, adult, players }
  } catch {
    return DEFAULTS
  }
}

/** Réglages partagés par tous les jeux : niveau, confirmation +18, joueurs. */
export function usePartySettings() {
  const [settings, setSettings] = useState(readSettings)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Stockage indisponible (navigation privée) : les réglages restent en mémoire.
    }
  }, [settings])

  const setLevel = useCallback((level) => {
    setSettings((s) => (isLevel(level) && (level !== 'hot' || s.adult) ? { ...s, level } : s))
  }, [])

  const confirmAdult = useCallback(() => {
    setSettings((s) => ({ ...s, adult: true, level: 'hot' }))
  }, [])

  const setPlayers = useCallback((players) => {
    setSettings((s) => ({ ...s, players: sanitizePlayers(players) }))
  }, [])

  return { ...settings, setLevel, confirmAdult, setPlayers }
}
