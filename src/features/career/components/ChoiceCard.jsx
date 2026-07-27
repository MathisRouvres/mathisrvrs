import RiskReward from './RiskReward'

/**
 * Carte de choix interactive (§8) : type de stratégie, titre, explication,
 * récompenses / risques qualitatifs, action claire. Toute la carte est un
 * bouton. Les deux options paraissent réellement intéressantes (aucune
 * présentée comme « la bonne réponse » — couleurs modérées par ton).
 */
export default function ChoiceCard({
  choice,
  description,
  isChosen = false,
  isArmed = false,
  isDimmed = false,
  disabled = false,
  onChoose,
}) {
  const classes = [
    'cg-choicecard',
    `cg-choicecard--${description.tone}`,
    isChosen ? 'is-chosen' : '',
    isArmed ? 'is-armed' : '',
    isDimmed ? 'is-dimmed' : '',
    disabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      aria-pressed={isChosen}
      onClick={() => onChoose(choice.id)}
    >
      <span className="cg-choicecard__type">{description.strategyLabel}</span>
      <span className="cg-choicecard__title">
        {isArmed ? `Confirmer : ${choice.label}` : choice.label}
      </span>
      <span className="cg-choicecard__desc">
        {isArmed
          ? 'Décision irréversible. Appuie encore pour confirmer.'
          : description.riskPreview}
      </span>

      {!isArmed && (
        <RiskReward
          rewardLevel={description.rewardLevel}
          riskLevel={description.riskLevel}
        />
      )}

      <span className="cg-choicecard__cta" aria-hidden="true">
        {isArmed ? 'Confirmer' : isChosen ? 'Voie choisie' : 'Choisir cette voie'}
      </span>
    </button>
  )
}
