import { CareerButton } from '../CareerShell'
import { topCelebration } from '../../../game-engine'
import ProgressionDigest from './ProgressionDigest'
import { formatAnnualDelta, formatMoney } from './careerUiMaps'

/** Libellés des niveaux de célébration (Phase 10). */
const CELEBRATION_LABELS = {
  mineur: 'Récompense',
  national: 'Titre national',
  majeur: 'Titre majeur',
  continental: 'Sacre continental',
  international: 'Consécration internationale',
}
const CELEBRATION_EMOJI = {
  mineur: '🎖️',
  national: '🏆',
  majeur: '🏆',
  continental: '🌍',
  international: '👑',
}
/** Libellés des statuts de distinction (Phase 11). */
const DISTINCTION_STATUS = {
  vainqueur: '🥇 Vainqueur',
  deuxieme: '🥈 2e',
  troisieme: '🥉 3e',
  finaliste: '⭐ Finaliste',
  nomme: '• Nommé',
  non_retenu: 'Non retenu',
}
/** Portées majeures (Phase 12). */
const DISTINCTION_TIER = {
  national: 'National',
  continental: 'Continental',
  international: 'International',
  mondial: 'Mondial',
}
/** Raretés de record (Phase 12). */
const RECORD_RARITY = {
  accomplissement: 'Accomplissement',
  record_club: 'Record club',
  record_championnat: 'Record championnat',
  record_national: 'Record national',
  record_continental: 'Record continental',
  record_mondial: 'Record mondial',
}

/**
 * Bilan annuel compact et visuel (§9) — chiffres clés, évolutions, meilleur
 * moment de la saison, une action principale (« Saison suivante »).
 * Conserve le texte « Bilan saison N » (repère de test).
 */
export default function SeasonSummary({ bilan, summary, finished, onContinue }) {
  const stats = bilan.matchStats
  const isGk = summary?.macroPosition === 'gk'
  const hasTrophy = stats.trophies.length > 0
  const hasInjury = stats.injuryDays > 15
  const transferred = Boolean(bilan.autoTransfer)
  // Niveau de célébration le plus élevé de la saison (Phase 10).
  const celebration = hasTrophy ? topCelebration(stats.trophies) : null
  // Distinctions RÉELLEMENT obtenues : victoires + podium uniquement (on masque
  // les simples nominations où le joueur n'a rien remporté).
  const PODIUM = ['vainqueur', 'deuxieme', 'troisieme']
  const distinctions = (bilan.distinctions ?? []).filter((d) =>
    PODIUM.includes(d.result),
  )
  // Records notables de la saison (Phase 12).
  const records = bilan.records ?? []

  return (
    <section className="cg-section" aria-labelledby="bilan-heading">
      <p className="cg-kicker cg-anim-enter">Fin de saison</p>
      <h2 id="bilan-heading" className="cg-section__title">
        Bilan saison {bilan.seasonIndex}
      </h2>
      <div className="cg-panel cg-anim-enter">
        <p className="cg-card__meta">
          {bilan.ageAfter} ans · {summary?.clubName ?? 'Club'} ·{' '}
          {summary?.clubStatusLabel ?? ''}
        </p>

        <p
          className={`cg-bilan-key${hasTrophy ? ' cg-anim-trophy' : ''}${hasInjury && !hasTrophy ? ' cg-anim-shake' : ''}`}
          role="status"
        >
          {hasTrophy ? '🏆 ' : transferred ? '✈️ ' : ''}
          {bilan.keyEvent}
        </p>

        <ul className="cg-delta-row" aria-label="Chiffres de la saison">
          {bilan.club && (
            <li className="cg-delta">
              {bilan.club.leagueRank}ᵉ / {bilan.club.leagueSize}
              {bilan.club.division === 2 ? ' (D2)' : ''}
            </li>
          )}
          <li className="cg-delta">{stats.matches} matchs</li>
          <li className="cg-delta">Note {stats.averageRating.toFixed(1)}</li>
          {isGk ? (
            <li className="cg-delta">
              {stats.cleanSheets} CS · {stats.keySaves ?? 0} arrêts clés
            </li>
          ) : (
            <li className="cg-delta">
              {stats.goals} buts · {stats.assists} passes
            </li>
          )}
          {hasInjury && (
            <li className="cg-delta cg-delta--down">Blessé {stats.injuryDays} j</li>
          )}
        </ul>

        <ProgressionDigest progression={bilan.progression} />

        {summary?.finance && (
          <ul className="cg-delta-row" aria-label="Finances">
            <li className="cg-delta">
              Patrimoine {formatMoney(summary.finance.netWorth)}
            </li>
            {summary.finance.lastAnnualDelta !== 0 && (
              <li
                className={`cg-delta${summary.finance.lastAnnualDelta >= 0 ? ' cg-delta--up' : ' cg-delta--down'}`}
              >
                {formatAnnualDelta(summary.finance.lastAnnualDelta)}
              </li>
            )}
          </ul>
        )}

        {hasTrophy && (
          <div
            className={`cg-celebration cg-celebration--${celebration ?? 'mineur'} cg-anim-trophy`}
            data-celebration={celebration ?? 'mineur'}
            role="status"
          >
            <span className="cg-celebration__level">
              {CELEBRATION_EMOJI[celebration] ?? '🏆'}{' '}
              {CELEBRATION_LABELS[celebration] ?? 'Récompense'}
            </span>
            <p className="cg-bilan-trophies">{stats.trophies.join(' · ')}</p>
          </div>
        )}

        {distinctions.length > 0 && (
          <ul className="cg-distinctions" aria-label="Distinctions individuelles">
            {distinctions.map((d) => (
              <li
                key={d.awardId}
                className={`cg-distinction cg-distinction--${d.result}`}
              >
                <span className="cg-distinction__status">
                  {DISTINCTION_STATUS[d.result] ?? d.result}
                </span>
                {d.tier && d.tier !== 'championnat' && (
                  <span className={`cg-distinction__tier cg-tier--${d.tier}`}>
                    {DISTINCTION_TIER[d.tier] ?? d.tier}
                  </span>
                )}
                <span className="cg-distinction__name">{d.awardName}</span>
                {d.competitors.length > 0 && (
                  <span className="cg-distinction__podium">
                    {d.competitors
                      .map(
                        (c, i) =>
                          `${i + 1}. ${c.isPlayer ? 'Toi' : c.name}${c.isPlayer ? '' : ` (${c.clubName})`}`,
                      )
                      .join(' · ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {records.length > 0 && (
          <ul className="cg-records" aria-label="Records">
            {records.map((r) => (
              <li key={r.id} className={`cg-record cg-record--${r.rarity}`}>
                <span className="cg-record__badge">
                  📕 {RECORD_RARITY[r.rarity] ?? r.rarity}
                </span>
                <span className="cg-record__label">{r.label}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="cg-quote" style={{ marginTop: '0.85rem' }}>
          {bilan.narrativeSummary}
        </p>
      </div>
      <div className="cg-actions">
        <CareerButton
          type="button"
          variant="primary"
          className="cg-btn--hero"
          onClick={onContinue}
        >
          {finished ? 'Voir le bilan de carrière' : 'Saison suivante'}
        </CareerButton>
      </div>
    </section>
  )
}
