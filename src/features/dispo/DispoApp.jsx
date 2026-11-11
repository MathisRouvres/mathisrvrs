import { useEffect, useState } from 'react'
import { ThemeProvider } from '../../context/ThemeProvider'
import { listPeople } from './api'
import Calendar from './Calendar'
import ProfilePicker from './ProfilePicker'
import { Spinner, card, primaryButton } from './ui'

/** Profil choisi sur cet appareil (id), retenu pour les visites suivantes. */
const ME_KEY = 'dispo-me'

function readMe() {
  try {
    return localStorage.getItem(ME_KEY)
  } catch {
    return null
  }
}

function storeMe(id) {
  try {
    if (id) localStorage.setItem(ME_KEY, id)
    else localStorage.removeItem(ME_KEY)
  } catch {
    // stockage indisponible : le profil sera redemandé à la prochaine visite
  }
}

/** Page partagée par lien : titre dédié, jamais indexée. */
function usePageMeta() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Dispos | Mathis Rouvres'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => {
      document.title = previousTitle
      robots.remove()
    }
  }, [])
}

/**
 * /dispo : calendrier de disponibilités partagé, sans compte. On choisit (ou crée) son
 * profil, puis on coche ses créneaux ; les données vivent dans MySQL (public/dispo-api.php).
 */
export default function DispoApp() {
  usePageMeta()
  const [people, setPeople] = useState(null)
  const [error, setError] = useState(null)
  const [meId, setMeId] = useState(readMe)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listPeople(controller.signal)
      .then(setPeople)
      .catch((err) => {
        if (!controller.signal.aborted) setError(err)
      })
    return () => controller.abort()
  }, [attempt])

  const me = people?.find((person) => person.id === meId) ?? null

  function choose(person) {
    setPeople((list) => (list.some((p) => p.id === person.id) ? list : [...list, person]))
    setMeId(person.id)
    storeMe(person.id)
    window.scrollTo({ top: 0 })
  }

  function switchProfile() {
    setMeId(null)
    storeMe(null)
  }

  function setMyAvatar(avatar) {
    setPeople((list) => list.map((p) => (p.id === meId ? { ...p, avatar } : p)))
  }

  let content
  if (error) {
    content = (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
        <div className={card} role="alert">
          <h1 className="font-display text-xl font-bold">Calendrier indisponible</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{error.message}</p>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setAttempt((n) => n + 1)
            }}
            className={`${primaryButton} mt-5`}
          >
            Réessayer
          </button>
        </div>
      </main>
    )
  } else if (!people) {
    content = <Spinner />
  } else if (!me) {
    content = <ProfilePicker people={people} onPick={choose} />
  } else {
    content = <Calendar me={me} people={people} onSwitch={switchProfile} onAvatarChange={setMyAvatar} />
  }

  return (
    <ThemeProvider>
      <div className="min-h-dvh bg-[var(--bg-primary)] text-[var(--text-primary)]">{content}</div>
    </ThemeProvider>
  )
}
