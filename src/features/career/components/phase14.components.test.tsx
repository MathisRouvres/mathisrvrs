// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import ProgressionDigest from './ProgressionDigest'
import StatChangeToast from './StatChangeToast'
import TimelineCard from './TimelineCard'
import SeasonSummary from './SeasonSummary'
import CountUp from './CountUp'

const HERE = dirname(fileURLToPath(import.meta.url))

function stubMatchMedia(reduced: boolean) {
  // @ts-expect-error test stub
  window.matchMedia = (q: string) => ({
    matches: reduced && q.includes('reduce'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent() {
      return false
    },
  })
}

beforeEach(() => stubMatchMedia(false))
afterEach(() => cleanup())

const digest = {
  niveau: { before: 68, after: 72, delta: 4 },
  reputation: { before: 40, after: 58, delta: 18 },
  status: { before: 'rotation', after: 'starter' },
  salary: { before: 480000, after: 750000 },
  skills: [
    { id: 'finition', label: 'Finition', before: 71, after: 75, delta: 4, direction: 'up', cause: 'temps_de_jeu' },
    { id: 'vitesse', label: 'Vitesse', before: 80, after: 78, delta: -2, direction: 'down', cause: 'declin_physique' },
  ],
  level: {
    previous: { id: 'rotation', label: 'Joueur de rotation', rank: 2, min: 54 },
    current: { id: 'titulaire', label: 'Titulaire', rank: 3, min: 60 },
    next: { id: 'important', label: 'Joueur important', rank: 4, min: 66 },
    progressToNext: 0.5,
    promoted: true,
    trajectory: { id: 'reguliere', label: 'En progression' },
  },
  palmares: ['Champion national'],
}

describe('Phase 14 — ProgressionDigest', () => {
  // Valeur finale déterministe : on teste le contenu, pas l'animation.
  beforeEach(() => stubMatchMedia(true))

  it('gain de niveau : avant → après + delta lisible sans couleur', () => {
    render(<ProgressionDigest progression={digest} />)
    expect(screen.getByText('68')).toBeTruthy()
    expect(screen.getByText('72')).toBeTruthy()
    // Signe + flèche → compréhensible sans couleur.
    expect(screen.getByText('▲ +4 cette saison')).toBeTruthy()
  })

  it('perte de niveau affichée avec ▼ et signe', () => {
    render(<ProgressionDigest progression={{ ...digest, niveau: { before: 72, after: 69, delta: -3 } }} />)
    expect(screen.getByText(/▼ -3 cette saison/)).toBeTruthy()
  })

  it('changement de statut, salaire et palier', () => {
    render(<ProgressionDigest progression={digest} />)
    expect(screen.getAllByText('Titulaire').length).toBeGreaterThan(0)
    expect(screen.getByText(/480/)).toBeTruthy()
    expect(screen.getByText(/750/)).toBeTruthy()
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('50')
  })

  it('compétences modifiées avec cause, up et down distincts', () => {
    render(<ProgressionDigest progression={digest} />)
    expect(screen.getByText('Finition')).toBeTruthy()
    expect(screen.getByText('Vitesse')).toBeTruthy()
    expect(screen.getByText('Temps de jeu régulier')).toBeTruthy()
    // La régression est distincte (flèche bas + signe), sans dépendre de la couleur.
    expect(screen.getByText('▼ -2')).toBeTruthy()
    expect(screen.getByText('Déclin physique')).toBeTruthy()
    // Le gain apparaît (niveau + compétence partagent « ▲ +4 »).
    expect(screen.getAllByText('▲ +4').length).toBeGreaterThanOrEqual(1)
  })

  it('aucune progression → null (pas de crash, rien à montrer)', () => {
    const { container } = render(<ProgressionDigest progression={null} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('Phase 14 — CountUp & reduced-motion', () => {
  it('prefers-reduced-motion : affiche la valeur finale immédiatement', () => {
    stubMatchMedia(true)
    render(<CountUp from={68} to={72} />)
    expect(screen.getByText('72')).toBeTruthy()
  })

  it('sans changement : affiche directement la valeur', () => {
    render(<CountUp from={72} to={72} />)
    expect(screen.getByText('72')).toBeTruthy()
  })
})

describe('Phase 14 — StatChangeToast (après un dilemme)', () => {
  it('affiche les variations visibles + indice de conséquence cachée', () => {
    render(
      <StatChangeToast
        toast={{ deltas: [{ id: 'reputation', delta: 3 }, { id: 'sante', delta: -4 }], hasHidden: true }}
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByText(/Réputation \+3/)).toBeTruthy()
    expect(screen.getByText(/Santé -4/)).toBeTruthy()
    expect(screen.getByText(/plus tard/)).toBeTruthy()
  })

  it('aucune variation → « Choix enregistré »', () => {
    render(<StatChangeToast toast={{ deltas: [], hasHidden: false }} onDismiss={() => {}} />)
    expect(screen.getByText('Choix enregistré')).toBeTruthy()
  })
})

function makeBilan(over = {}) {
  return {
    seasonIndex: 8,
    ageAfter: 23,
    keyEvent: 'Belle saison',
    matchStats: {
      matches: 34, starts: 30, minutes: 2700, goals: 18, assists: 8, cleanSheets: 0,
      keySaves: 0, averageRating: 7.4, yellowCards: 2, redCards: 0, injuryDays: 0, trophies: [],
    },
    narrativeSummary: 'Une saison solide.',
    overallBefore: 68, overallAfter: 72, reputationBefore: 40, reputationAfter: 58,
    progression: digest,
    distinctions: [],
    records: [],
    club: { leagueRank: 3, leagueSize: 16, division: 1 },
    ...over,
  }
}
const summary = {
  macroPosition: 'attacker',
  clubName: 'FC Test',
  clubStatusLabel: 'Titulaire',
  finance: { netWorth: 1_000_000, lastAnnualDelta: 200_000 },
}

describe('Phase 14 — SeasonSummary : récompenses différenciées', () => {
  it('podium et victoire distincts ; simples nominations masquées', () => {
    const distinctions = [
      { awardId: 'a1', awardName: 'Soulier d’Or – Ligue', result: 'vainqueur', tier: 'championnat', competitors: [] },
      { awardId: 'a2', awardName: 'Ballon National – France', result: 'troisieme', tier: 'national', competitors: [] },
      // Simple nomination sans placement : ne doit PAS apparaître au bilan.
      { awardId: 'a3', awardName: 'Prix – Ligue', result: 'nomme', tier: 'championnat', competitors: [] },
    ]
    const { container } = render(
      <SeasonSummary bilan={makeBilan({ distinctions })} summary={summary} finished={false} onContinue={() => {}} />,
    )
    expect(container.querySelector('.cg-distinction--vainqueur')).toBeTruthy()
    expect(container.querySelector('.cg-distinction--troisieme')).toBeTruthy()
    // Une simple nomination (non-podium) n'est pas affichée.
    expect(container.querySelector('.cg-distinction--nomme')).toBeNull()
    expect(screen.getByText('National')).toBeTruthy()
  })

  it('trophée majeur (mondial) plus prestigieux visuellement', () => {
    const distinctions = [
      { awardId: 'w', awardName: 'Sphère d’Or', result: 'vainqueur', tier: 'mondial', competitors: [] },
    ]
    render(<SeasonSummary bilan={makeBilan({ distinctions })} summary={summary} finished={false} onContinue={() => {}} />)
    expect(screen.getByText('Mondial')).toBeTruthy()
  })

  it('record affiché avec sa rareté', () => {
    const records = [{ id: 'r1', label: 'Meilleur total de buts', rarity: 'record_national' }]
    const { container } = render(
      <SeasonSummary bilan={makeBilan({ records })} summary={summary} finished={false} onContinue={() => {}} />,
    )
    expect(screen.getByText('Meilleur total de buts')).toBeTruthy()
    expect(container.querySelector('.cg-record--record_national')).toBeTruthy()
  })

  it('trophée collectif célébré', () => {
    const bilan = makeBilan({
      matchStats: { ...makeBilan().matchStats, trophies: ['Champion national'] },
    })
    render(<SeasonSummary bilan={bilan} summary={summary} finished={false} onContinue={() => {}} />)
    // Célébration + palmarès du digest peuvent le citer tous deux.
    expect(screen.getAllByText(/Champion national/).length).toBeGreaterThan(0)
  })

  it('aucune récompense → pas de liste de distinctions/records', () => {
    const { container } = render(
      <SeasonSummary bilan={makeBilan()} summary={summary} finished={false} onContinue={() => {}} />,
    )
    expect(container.querySelector('.cg-distinctions')).toBeNull()
    expect(container.querySelector('.cg-records')).toBeNull()
  })

  it('le bouton « Saison suivante » reste actif (non bloqué par l’animation)', () => {
    const onContinue = vi.fn()
    render(<SeasonSummary bilan={makeBilan()} summary={summary} finished={false} onContinue={onContinue} />)
    const btn = screen.getByRole('button', { name: /Saison suivante/ })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(btn)
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})

describe('Phase 14 — TimelineCard', () => {
  it('carte synthétique : saison, club, niveau, trophées, distinctions, records', () => {
    const card = {
      seasonIndex: 8, age: 25, clubName: 'FC Test', clubId: 'c1', level: 79,
      rank: 2, leagueSize: 16, division: 1, trophies: ['Champion national'], awards: 2, records: 1, keyEvent: 'Titre',
    }
    render(<ul><TimelineCard card={card} /></ul>)
    expect(screen.getByText('S8')).toBeTruthy()
    expect(screen.getByText('FC Test')).toBeTruthy()
    expect(screen.getByText('Niv 79')).toBeTruthy()
    expect(screen.getByText(/Champion national/)).toBeTruthy()
    expect(screen.getByText(/2 distinctions/)).toBeTruthy()
    expect(screen.getByText(/1 record/)).toBeTruthy()
  })
})

describe('Phase 14 — accessibilité / hygiène', () => {
  it('le bouton de toast est focusable au clavier (rôle bouton)', () => {
    render(<StatChangeToast toast={{ deltas: [], hasHidden: false }} onDismiss={() => {}} />)
    const close = screen.getByRole('button', { name: /Masquer/ })
    close.focus()
    expect(document.activeElement).toBe(close)
  })

  it('aucune logique métier dans les composants de présentation', () => {
    const forbidden = [
      'simulateSeason', 'applySeasonResult', 'advanceCareerSeason', 'completeSeason',
      'computeSeasonDistinctions', 'computeMajorDistinctions', 'computeSeasonRecords',
      'buildSeasonProgression', 'buildTimelineCards', 'positionOverall',
    ]
    for (const file of ['ProgressionDigest.jsx', 'TimelineCard.jsx', 'CountUp.jsx', 'StatChangeToast.jsx']) {
      const src = readFileSync(join(HERE, file), 'utf8')
      for (const id of forbidden) expect(src.includes(id), `${file} ne doit pas appeler ${id}`).toBe(false)
    }
  })
})
