import { useMemo } from 'react'
import RoomShell from './components/RoomShell'
import Spotbeams from './components/Spotbeams'
import PlayerSeats from './components/PlayerSeats'
import Atmosphere from './components/Atmosphere'
import ClubPrivateEnvironment from './themes/ClubPrivateEnvironment'
import ApartmentPartyEnvironment from './themes/ApartmentPartyEnvironment'
import UndergroundEnvironment from './themes/UndergroundEnvironment'
import { resolveEnvironment } from './environmentPresets'
import { seatLayout } from './seatLayout'
import { FLOOR_Y } from './stage'

/**
 * Environnement du plateau — l'orchestrateur.
 *
 * Il ENTOURE le plateau, il ne le recrée jamais : le plateau arrive en
 * `children` et n'est rendu qu'une seule fois, quel que soit le thème. Changer
 * de décor ne remonte donc ni les cases, ni les pions, ni la caméra — et n'a
 * évidemment aucun effet sur le moteur.
 *
 * Couches, dans l'ordre de lecture (l'ordre JSX n'a pas de sens en 3D, mais il
 * dit ce que fait quoi) :
 *
 *   background   dôme                       ─┐
 *   floor        sol + tapis                 ├─ <RoomShell>, commun aux 3 thèmes
 *   boardShadow  ombres portée et de contact ─┘
 *   furniture    table, sièges, structure    ─┐
 *   decorations  verres, snacks, caisses      ├─ thème
 *   lighting     faisceaux                   ─┘ + <Spotbeams>, paramétré
 *   playerSeats  plaques joueurs             ── <PlayerSeats>, seule couche interactive
 *   foreground   lueurs et fumée             ── <Atmosphere>
 *
 * Toutes les couches décoratives ont `raycast = () => null` et les plaques DOM
 * sont en `pointer-events: none` : rien ici ne peut voler un clic au plateau.
 */

const THEMES = {
  club_private: ClubPrivateEnvironment,
  apartment_party: ApartmentPartyEnvironment,
  underground: UndergroundEnvironment,
}

export default function BoardEnvironment({
  environmentId,
  state,
  ambiance,
  intensity,
  lite = false,
  reducedMotion = false,
  compact = false,
  presence = null,
  children,
}) {
  const preset = useMemo(() => resolveEnvironment(environmentId), [environmentId])
  const Theme = THEMES[preset.id] ?? ClubPrivateEnvironment

  const seats = useMemo(
    () => seatLayout(state, {
      radius: preset.playerLayout.radius,
      compactRadius: preset.playerLayout.compactRadius,
      compact,
      presence,
    }),
    [state, preset.playerLayout.radius, preset.playerLayout.compactRadius, compact, presence],
  )

  const L = preset.lighting
  // Rendu allégé : les faisceaux tombent en premier (ce sont des transparents
  // plein cadre), et l'atmosphère avec eux.
  const beamCount = !L.spotlightEnabled || lite ? 0 : L.beamCount

  return (
    <>
      {/* ── background · floor · boardShadow ─────────────────────────────── */}
      <RoomShell
        palette={preset.palette}
        ambiance={ambiance}
        lite={lite}
        haze={preset.atmosphere.haze}
      />

      {/* ── furniture · decorations ──────────────────────────────────────── */}
      <Theme
        preset={preset}
        seats={seats}
        ambiance={ambiance}
        intensity={intensity}
        lite={lite}
        compact={compact}
        reducedMotion={reducedMotion}
      />

      {/* ── lighting ─────────────────────────────────────────────────────── */}
      <Spotbeams
        count={beamCount}
        opacity={L.beamOpacity}
        radius={L.beamRadius}
        color={ambiance.lightB}
        speed={ambiance.speed}
        pulse={ambiance.pulse}
        reducedMotion={reducedMotion}
      />

      {/* ── playerSeats ──────────────────────────────────────────────────── */}
      <PlayerSeats
        seats={seats}
        palette={preset.palette}
        compact={compact}
        reducedMotion={reducedMotion}
      />

      {/* ── foreground ───────────────────────────────────────────────────── */}
      {!lite && (
        <Atmosphere
          ambiance={ambiance}
          bokeh={preset.atmosphere.bokeh}
          smoke={preset.atmosphere.smoke}
          reducedMotion={reducedMotion}
          floorY={FLOOR_Y}
        />
      )}

      {/* Le plateau, rendu UNE fois : c'est lui le sujet. */}
      {children}
    </>
  )
}

/*
 * Note de perf : ce composant n'est PAS mémoïsé, et ce serait inutile — il reçoit
 * le plateau en `children`, donc un élément neuf à chaque rendu de <Scene3D>, que
 * `memo` ne saurait comparer. La mémoïsation qui compte est ailleurs, et elle est
 * réelle : chaque thème reconstruit sa géométrie fusionnée uniquement sur sa clé
 * de forme (nombre de places, rendu allégé, cadrage compact), et les places sur
 * le nombre de places. Un loyer payé, un dé lancé ou un tour qui change ne
 * reconstruit AUCUNE géométrie de décor — seuls les textes des plaques (du DOM)
 * sont mis à jour.
 */
