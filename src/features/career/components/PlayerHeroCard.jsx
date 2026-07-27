import MainStatCard from './MainStatCard'
import {
  ageRingFraction,
  clubAccent,
  healthQualifier,
  healthRingColor,
  levelQualifier,
  reputationQualifier,
  squadNumber,
} from './careerUiMaps'

/** Silhouette de joueur fictive (fallback graphique — aucune image distante). */
function PlayerSilhouette() {
  return (
    <svg
      className="cg-hero__silhouette"
      viewBox="0 0 120 150"
      preserveAspectRatio="xMidYMax meet"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="60" cy="24" r="15" />
      <path d="M60 42c-13 0-22 7-22 20 0 8 3 15 7 28l-14 30 11 6 16-30c2 9 3 16 3 22l-3 12 12 0 3-14 4-26 5 26 4 16 12-2-5-18-2-26c4-11 8-19 8-26 0-14-9-20-22-20z" />
    </svg>
  )
}

/**
 * Carte de carrière premium (§3) : identité, club, poste, palier + anneaux
 * des statistiques principales (âge, niveau, santé, réputation).
 * Le nom garde la classe `.cg-hud__name` et la sauvegarde `.cg-hud__save`
 * (repères de test et d'accessibilité).
 */
export default function PlayerHeroCard({ summary, saved }) {
  const v = summary.visible
  const accent = clubAccent(summary.clubName + summary.countryId)
  const number = squadNumber(summary.displayName)

  return (
    <article
      className="cg-hero cg-anim-enter"
      style={{ '--cg-club': accent }}
      aria-label={`Carte de ${summary.displayName}`}
    >
      <div className="cg-hero__top">
        <div className="cg-hero__figure">
          <span className="cg-hero__number" aria-hidden="true">
            {number}
          </span>
          <PlayerSilhouette />
        </div>
        <div className="cg-hero__body">
          <div className="cg-hero__ident">
            <div>
              <p className="cg-hero__kicker">Ta carrière</p>
              <p className="cg-hud__name">{summary.displayName}</p>
              <p className="cg-hero__meta">
                {summary.clubName} · {summary.preciseRoleLabel}
              </p>
              <span className="cg-hero__stage">
                {summary.careerStageLabel} · {summary.clubStatusLabel}
              </span>
            </div>
            <p
              className={`cg-hud__save${saved ? ' is-visible' : ''}`}
              role="status"
              aria-label={saved ? 'Progression sauvegardée' : undefined}
            >
              ✓ Sauvegardé
            </p>
          </div>
        </div>
      </div>

      <div className="cg-rings">
        <MainStatCard
          label="Âge"
          value={summary.age}
          fraction={ageRingFraction(summary.age)}
          color="var(--cg-gold)"
          qualifier="ans"
        />
        <MainStatCard
          label="Niveau"
          value={v.niveau}
          fraction={v.niveau / 100}
          color="var(--cg-lime)"
          qualifier={levelQualifier(v.niveau)}
          delta={summary.niveauDeltaSeason}
        />
        <MainStatCard
          label="Santé"
          value={v.sante}
          fraction={v.sante / 100}
          color={healthRingColor(v.sante)}
          qualifier={healthQualifier(v.sante)}
        />
        <MainStatCard
          label="Réputation"
          value={v.reputation}
          fraction={v.reputation / 100}
          color="var(--cg-lime)"
          qualifier={reputationQualifier(v.reputation)}
          delta={summary.reputationDeltaSeason}
        />
      </div>
    </article>
  )
}
