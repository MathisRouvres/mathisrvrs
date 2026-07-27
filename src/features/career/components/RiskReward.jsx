const LEVEL_WORDS = {
  0: 'négligeable',
  1: 'faible',
  2: 'modéré',
  3: 'élevé',
  4: 'très élevé',
}

/** Jauge relative à 4 crans — aucune valeur ni nom de stat révélé. */
function LevelMeter({ level, kind }) {
  const word = LEVEL_WORDS[level] ?? 'faible'
  return (
    <span className="cg-rr__meter" role="img" aria-label={word}>
      <span className="cg-rr__dots" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`cg-dot${i <= level ? ` is-on-${kind}` : ''}`}
          />
        ))}
      </span>
      <span className="cg-rr__word">{word}</span>
    </span>
  )
}

/**
 * Indication RELATIVE de récompense / risque (§8) — volontairement floue :
 * on montre seulement l'ampleur globale (faible → très élevé), jamais les
 * stats concernées ni les valeurs exactes. Le joueur pressent, sans savoir.
 */
export default function RiskReward({ rewardLevel = 0, riskLevel = 0 }) {
  return (
    <div className="cg-rr">
      <div className="cg-rr__row">
        <span className="cg-rr__head">Récompense potentielle</span>
        <LevelMeter level={rewardLevel} kind="reward" />
      </div>
      <div className="cg-rr__row">
        <span className="cg-rr__head">Risque</span>
        <LevelMeter level={riskLevel} kind="risk" />
      </div>
    </div>
  )
}
