// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import PlayerHeroCard from './PlayerHeroCard'
import SecondaryRail from './SecondaryRail'
import SeasonProgress from './SeasonProgress'
import AttributesPanel from './AttributesPanel'
import ChoiceCard from './ChoiceCard'
import DilemmaCard from './DilemmaCard'
import CareerMilestoneModal from './CareerMilestoneModal'
import RiskReward from './RiskReward'

/** Résumé de carrière factice minimal pour l'affichage. */
const summary = {
  displayName: 'Lucas Martin',
  countryId: 'cote-brumeuse',
  countryLabel: 'France',
  macroPosition: 'attacker',
  preciseRole: 'st',
  preciseRoleLabel: 'Avant-centre',
  age: 23,
  seasonIndex: 8,
  clubName: 'RC Lens',
  clubStatus: 'starter',
  clubStatusLabel: 'Titulaire',
  careerStage: 'debuts_professionnels',
  careerStageLabel: 'Débuts professionnels',
  provisionalLegacyScore: 24,
  potentialStars: 5,
  potentialLabel: 'Potentiel d’élite',
  recruiterBlurb: 'Un profil qui fait rêver les recruteurs.',
  trajectory: { id: 'reguliere', label: 'En progression' },
  niveauDeltaSeason: 3,
  reputationDeltaSeason: 4,
  visible: {
    niveau: 48,
    forme: 82,
    sante: 89,
    mental: 70,
    reputation: 24,
    confianceCoach: 78,
    discipline: 60,
    argent: 1000,
  },
  attributes: [
    { id: 'finition', label: 'Finition', value: 77 },
    { id: 'tir', label: 'Tir', value: 70 },
    { id: 'placement', label: 'Placement', value: 66 },
    { id: 'vitesse', label: 'Vitesse', value: 72 },
    { id: 'sangFroid', label: 'Sang-froid', value: 64 },
    { id: 'puissance', label: 'Puissance', value: 61 },
  ],
}

afterEach(() => cleanup())

describe('PlayerHeroCard', () => {
  it('affiche identité, club, poste, palier et statuts', () => {
    render(<PlayerHeroCard summary={summary} saved={false} />)
    expect(document.querySelector('.cg-hud__name')?.textContent).toBe('Lucas Martin')
    expect(screen.getByText(/RC Lens · Avant-centre/)).toBeTruthy()
    expect(screen.getByText(/Débuts professionnels · Titulaire/)).toBeTruthy()
  })

  it('montre les 4 statistiques principales avec évolution contextualisée', () => {
    render(<PlayerHeroCard summary={summary} saved={false} />)
    for (const label of ['Âge', 'Niveau', 'Santé', 'Réputation']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    // Delta contextualisé (jamais une valeur froide).
    expect(screen.getByText('+3 cette saison')).toBeTruthy()
    // Santé qualifiée.
    expect(screen.getByText('Excellente')).toBeTruthy()
  })

  it('révèle « Sauvegardé » uniquement quand sauvé', () => {
    const { rerender } = render(<PlayerHeroCard summary={summary} saved={false} />)
    expect(screen.getByText('✓ Sauvegardé').className).not.toContain('is-visible')
    rerender(<PlayerHeroCard summary={summary} saved />)
    expect(screen.getByText('✓ Sauvegardé').className).toContain('is-visible')
  })
})

describe('SecondaryRail — potentiel jamais exact', () => {
  it('affiche le potentiel en étoiles + libellé, sans valeur cachée', () => {
    render(<SecondaryRail summary={summary} />)
    expect(screen.getByLabelText('Potentiel estimé 5 sur 5')).toBeTruthy()
    expect(screen.getByText('Potentiel d’élite')).toBeTruthy()
    // Aucune valeur de potentiel à deux chiffres n'est révélée.
    expect(screen.queryByText(/potentiel\s*:?\s*\d{2}/i)).toBeNull()
    expect(screen.getByText('En progression')).toBeTruthy()
  })
})

describe('SeasonProgress — exactement deux dilemmes', () => {
  it('affiche « Dilemme 1 sur 2 »', () => {
    render(
      <SeasonProgress seasonIndex={8} stageLabel="Débuts professionnels" dilemmaNumber={1} />,
    )
    expect(screen.getByText('Dilemme 1 sur 2')).toBeTruthy()
  })

  it('affiche « Dilemme 2 sur 2 » et jamais un troisième palier', () => {
    render(
      <SeasonProgress seasonIndex={8} stageLabel="Progression" dilemmaNumber={2} />,
    )
    expect(screen.getByText('Dilemme 2 sur 2')).toBeTruthy()
    expect(screen.queryByText(/sur 3/)).toBeNull()
    expect(screen.queryByText('3')).toBeNull()
  })
})

describe('AttributesPanel — dépend du poste, repliable', () => {
  it('est replié par défaut puis révèle ~6 attributs du poste', () => {
    render(<AttributesPanel attributes={summary.attributes} />)
    expect(screen.queryByText('Finition')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Compétences & attributs/ }))
    expect(screen.getByText('Finition')).toBeTruthy()
    expect(screen.getByText('Sang-froid')).toBeTruthy()
    expect(document.querySelectorAll('.cg-attr')).toHaveLength(6)
  })

  it('met en évidence un attribut modifié après un choix', () => {
    render(
      <AttributesPanel
        attributes={summary.attributes}
        statDeltas={[{ id: 'finition', delta: 2 }]}
        defaultOpen
      />,
    )
    expect(screen.getByText('+2')).toBeTruthy()
    expect(document.querySelector('.cg-attr.is-changed')).toBeTruthy()
  })
})

describe('ChoiceCard + RiskReward — risques/récompenses qualitatifs', () => {
  const description = {
    stance: 'ambitious',
    strategyLabel: 'Ambitieux',
    tone: 'ambitious',
    rewards: [{ label: 'Réputation', level: 3 }],
    risks: [{ label: 'Santé', level: 2 }],
    rewardLevel: 3,
    riskLevel: 2,
    riskPreview: 'Gloire possible, échec public possible.',
  }
  const choice = { id: 'prendre', label: 'Prendre le ballon', stance: 'ambitious' }

  it('rend type, titre, indication relative et action, sans détail exact', () => {
    const onChoose = vi.fn()
    render(
      <div role="group" aria-label="Tes options">
        <ChoiceCard choice={choice} description={description} onChoose={onChoose} />
      </div>,
    )
    expect(screen.getByText('Ambitieux')).toBeTruthy()
    expect(screen.getByText('Prendre le ballon')).toBeTruthy()
    expect(screen.getByText('Récompense potentielle')).toBeTruthy()
    expect(screen.getByText('Risque')).toBeTruthy()
    expect(screen.getByText('Choisir cette voie')).toBeTruthy()
    // Détail caché : aucun nom de stat ni valeur/pourcentage exact affiché.
    expect(screen.queryByText('Réputation')).toBeNull()
    expect(screen.queryByText('Santé')).toBeNull()
    expect(screen.queryByText(/%/)).toBeNull()
    fireEvent.click(screen.getByRole('button'))
    expect(onChoose).toHaveBeenCalledWith('prendre')
  })

  it('exprime une indication relative (mot + jauge), toujours présente', () => {
    render(<RiskReward rewardLevel={3} riskLevel={0} />)
    // Niveau restitué en texte (pas seulement la couleur), toujours affiché.
    expect(screen.getByText('élevé')).toBeTruthy()
    expect(screen.getByText('négligeable')).toBeTruthy()
  })
})

describe('DilemmaCard', () => {
  it('rend catégorie, titre, corps et accroche', () => {
    render(
      <DilemmaCard
        event={{
          title: 'Huit matchs sans marquer',
          body: 'La malédiction du buteur.',
          category: 'match',
        }}
        echo={null}
      />,
    )
    expect(screen.getByText('Pression sportive')).toBeTruthy()
    expect(screen.getByText('Huit matchs sans marquer')).toBeTruthy()
    expect(document.getElementById('dilemma-heading')?.textContent).toContain(
      'Huit matchs',
    )
  })
})

describe('CareerMilestoneModal', () => {
  it('présente le palier et se ferme (Échap + bouton)', () => {
    const onClose = vi.fn()
    render(
      <CareerMilestoneModal
        milestone={{ icon: '⭐', title: 'Tu passes pro', text: 'Bravo.' }}
        onClose={onClose}
      />,
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Tu passes pro')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
