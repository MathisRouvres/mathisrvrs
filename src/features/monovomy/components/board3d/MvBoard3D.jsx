import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import Scene3D from './Scene3D'
import { PLAYER_COLORS } from './playerColors'
import { soireeBoard } from '../../content'
import { completeGroups } from '../../game/boardInsights'
import { useDeviceProfile } from '../../game/useDeviceProfile'
import { ambianceFor } from './ambiance'
import { propertyManagement, ranking } from '../../engine'
import CameraDirector from './CameraDirector'
import MvCaseDetail from '../MvCaseDetail'

const INTRO_MS = 1800
const DICE_MS = 1400

// Demi-largeur à cadrer. Avec le rail des titres (RAIL_WIDTH = 15) c'est lui, et
// non le plateau, qui dicte le cadrage. Sans rail, on serre sur le plateau seul
// (11 cases de 1 unité + une marge) : sur téléphone il gagne ainsi ~25 % de taille.
const FIT_HALF_WIDTH = 7.6
const FIT_HALF_WIDTH_BARE = 6
const FOV_MIN = 26
const FOV_MAX = 62

/**
 * Cadrage adaptatif : un FOV vertical figé cadre bien un canvas 4/3 et gaspille la
 * moitié de l'écran sur un canvas portrait (le champ horizontal, lui, dépend du
 * ratio). On dérive donc le FOV du ratio réel pour que la scène remplisse toujours
 * la LARGEUR utile. La distance de référence est celle du cadrage de départ, pas
 * la distance courante : les zooms du joueur ne doivent pas recadrer la scène.
 */
function CameraFit({ dist, halfWidth = FIT_HALF_WIDTH }) {
  const last = useRef({ w: 0, h: 0 })

  useFrame((s) => {
    const { width, height } = s.size
    if (last.current.w === width && last.current.h === height) return
    last.current = { w: width, h: height }
    const aspect = width / Math.max(1, height)
    const fov = 2 * THREE.MathUtils.radToDeg(Math.atan(halfWidth / dist / aspect))
    s.camera.fov = THREE.MathUtils.clamp(fov, FOV_MIN, FOV_MAX)
    s.camera.updateProjectionMatrix()
  })

  return null
}

export default function MvBoard3D({ state, dice, reducedMotion = false, onManage, canManage = false, managePlayerId = null, justOwned = null, centerSlot = null, center = null, fx = null }) {
  const [selected, setSelected] = useState(null)
  const controlsRef = useRef(null)
  const { isMobile, lowPerf, weak } = useDeviceProfile()
  // Rendu allégé (reflets, bloom, ombres) : mouvement réduit OU faible perf.
  const lite = reducedMotion || lowPerf
  // La DÉFINITION, elle, ne suit plus le rendu allégé. Un écran à 3 dpr rendu à
  // 1,25 affiche une image agrandie 2,4× : c'est ce qui rendait les cases floues
  // et crénelées sur téléphone. Seuls les appareils vraiment limités restent bas.
  const maxDpr = weak ? 1.5 : isMobile ? 2.5 : 2
  // Rail des titres : illisible sous ~800 px de large, et il impose un cadrage
  // large qui écrase le plateau. Sur téléphone il cède la place ; les propriétés
  // restent consultables (et de tous les joueurs) dans la feuille « Biens ».
  const showEstates = !isMobile
  // Mobile : caméra plus haute / moins inclinée → cases lisibles sur petit écran.
  // Le cadrage doit inclure la BANDE PROCHE de la table (z ≈ 7,5 à 8,4) : c'est là
  // que vit le rail des titres de propriété, qui doit rester à portée sans reculer.
  const camera = isMobile ? { position: [0, 12.5, 13.5], fov: 54 } : { position: [0, 10.8, 16], fov: 47 }
  // Distance de repos (caméra → centre du plateau), base du cadrage adaptatif.
  const camDist = Math.hypot(...camera.position)
  // Ambiance visuelle pilotée par l'intensité de soirée (Warm-up → Finale).
  const amb = ambianceFor(state.partyIntensity)
  const selectedSpace = selected != null ? soireeBoard.spaces[selected] : null
  const active = state.players[state.currentPlayerIndex]

  // Monopoles (groupes complets) — recalculés seulement quand la propriété change.
  const monopolySpaces = useMemo(
    () => new Set(Object.keys(completeGroups(state, soireeBoard).monopolySpaces)),
    [state],
  )

  // ── Direction caméra ─────────────────────────────────────────────────────────
  // Un seul plan à la fois, déduit de l'état de jeu. Le fly-in ne joue qu'une fois
  // par montage du plateau, et jamais en mouvement réduit.
  const [introDone, setIntroDone] = useState(reducedMotion)
  useEffect(() => {
    if (reducedMotion) return undefined
    const h = setTimeout(() => setIntroDone(true), INTRO_MS)
    return () => clearTimeout(h)
  }, [reducedMotion])

  // Fenêtre « les dés roulent » : ouverte à chaque nouveau lancer, refermée seule.
  const [diceShot, setDiceShot] = useState(null)
  const diceId = dice?.id ?? null
  useEffect(() => {
    if (diceId == null) return undefined
    const on = setTimeout(() => setDiceShot(diceId), 0)
    const off = setTimeout(() => setDiceShot(null), DICE_MS)
    return () => { clearTimeout(on); clearTimeout(off) }
  }, [diceId])

  const shot = state.finished
    ? 'outro'
    : !introDone
      ? 'intro'
      : state.phase === 'awaiting_auction'
        ? 'auction'
        : diceShot != null
          ? 'dice'
          : 'idle'

  // Classement affiché en surimpression pendant l'orbite finale.
  const finalRanking = useMemo(
    () => (state.finished ? ranking(state, soireeBoard) : []),
    [state],
  )

  // ── File d'effets ────────────────────────────────────────────────────────────
  // Toutes les sources convergent vers un seul état : la prop `fx` (loyer, faillite
  // — seul le jeu les connaît) et les transitions observables ici (achat, monopole,
  // montée d'intensité). Les événements sans `id` en reçoivent un séquentiel ;
  // <Effects> déduplique dessus, donc un doublon est sans effet.
  //
  // `set-state-in-effect` est désactivé ci-dessous en connaissance de cause : il
  // s'agit de convertir un changement d'état de jeu en ÉVÉNEMENT ponctuel, ce qu'une
  // valeur dérivée ne sait pas faire (il faut la valeur précédente). Le rendu
  // supplémentaire est borné à un par coup joué, et n'entraîne aucune cascade :
  // `fxEvent` n'est lu par aucune des dépendances de ces effets.
  /* eslint-disable react-hooks/set-state-in-effect */
  const [fxEvent, setFxEvent] = useState(null)

  useEffect(() => {
    if (!fx) return
    setFxEvent((prev) => (prev?.id === fx.id ? prev : { ...fx, seq: (prev?.seq ?? 0) + 1 }))
  }, [fx])

  // Achat : `justOwned` porte déjà la case fraîchement acquise.
  useEffect(() => {
    if (!justOwned) return
    setFxEvent((prev) => {
      const seq = (prev?.seq ?? 0) + 1
      return { type: 'buy', spaceId: justOwned, id: `buy-${seq}`, seq }
    })
  }, [justOwned])

  // Monopole : une case qui rejoint l'ensemble des monopoles = groupe complété.
  const prevMonopoly = useRef(null)
  useEffect(() => {
    const prev = prevMonopoly.current
    prevMonopoly.current = monopolySpaces
    if (!prev) return
    let fresh = null
    for (const id of monopolySpaces) { if (!prev.has(id)) { fresh = id; break } }
    if (!fresh) return
    setFxEvent((p) => {
      const seq = (p?.seq ?? 0) + 1
      return { type: 'monopoly', spaceId: fresh, id: `mono-${seq}`, seq }
    })
  }, [monopolySpaces])

  // Montée en intensité : seuls chaos et finale méritent le flash + la secousse.
  const prevIntensity = useRef(state.partyIntensity)
  useEffect(() => {
    const now = state.partyIntensity
    if (now === prevIntensity.current) return
    prevIntensity.current = now
    if (now !== 'chaos' && now !== 'finale') return
    setFxEvent((prev) => {
      const seq = (prev?.seq ?? 0) + 1
      return { type: 'intensity', id: `int-${seq}`, seq }
    })
  }, [state.partyIntensity])
  /* eslint-enable react-hooks/set-state-in-effect */


  const ownerInfo = (spaceId) => {
    const id = state.ownership[spaceId]
    if (!id) return { name: null, color: null }
    const idx = state.players.findIndex((p) => p.id === id)
    if (idx < 0) return { name: null, color: null }
    return { name: state.players[idx].name, color: PLAYER_COLORS[idx % PLAYER_COLORS.length] }
  }

  const recenter = () => controlsRef.current?.reset?.()

  return (
    <div className="mv-board3d">
      <div className="mv-board3d__stage" onDoubleClick={recenter}>
        <Canvas
          shadows={!lite}
          dpr={[1, maxDpr]}
          camera={camera}
          gl={{
            // À 2 dpr l'escalier est déjà discret : le MSAA ne paie plus son prix
            // sur mobile, il reste sur les rendus complets.
            antialias: !lite,
            powerPreference: 'high-performance',
            // ACES : compresse les hautes lumières des néons au lieu de les cramer.
            // L'exposition suit ensuite l'ambiance (fondu piloté par AmbianceLights).
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: amb.exposure,
          }}
          onPointerMissed={() => setSelected(null)}
        >
          <Suspense fallback={null}>
            <Scene3D
              state={state}
              onSelect={setSelected}
              dice={dice}
              reducedMotion={reducedMotion}
              lite={lite}
              topDown={isMobile}
              showEstates={showEstates}
              ambiance={amb}
              monopolySpaces={monopolySpaces}
              buildings={state.buildings}
              mortgaged={state.mortgaged}
              justOwned={justOwned}
              targetSpace={active ? active.position : null}
              controlsRef={controlsRef}
              fx={fxEvent}
              center={center}
              centerSlot={centerSlot}
            />
          </Suspense>
          {/* Cadrage : ajuste le FOV au ratio du canvas (jamais la position). */}
          <CameraFit dist={camDist} halfWidth={showEstates ? FIT_HALF_WIDTH : FIT_HALF_WIDTH_BARE} />
          {/* Seul composant autorisé à bouger la caméra. */}
          <CameraDirector
            shot={shot}
            reducedMotion={reducedMotion}
            controlsRef={controlsRef}
            focusCell={active ? active.position : null}
          />
          {/* Bloom = flou coûteux : coupé en rendu allégé (mobile / faible perf). */}
          {!lite && (
            <EffectComposer disableNormalPass>
              <Bloom intensity={amb.bloom} luminanceThreshold={0.5} luminanceSmoothing={0.25} radius={0.5} mipmapBlur />
            </EffectComposer>
          )}
        </Canvas>

        {/* Voile DOM : même courbe de vignettage que le sol 3D, y compris en rendu
            allégé où la vignette au sol n'existe pas. */}
        <div className="mv-board3d__vignette" aria-hidden="true" style={{ '--mv-vig': amb.vignette }} />

        {/* Orbite finale : classement en surimpression, le plateau tourne derrière. */}
        {shot === 'outro' && finalRanking.length > 0 && (
          <div className="mv-board3d__outro">
            <p className="mv-board3d__outro-title">Classement</p>
            <ol className="mv-board3d__outro-list">
              {finalRanking.map((entry, i) => (
                <li key={entry.playerId} className={i === 0 ? 'is-first' : undefined}>
                  <span>{i + 1}</span>
                  <strong>{entry.name}</strong>
                  <em>{entry.netWorth}€</em>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* La scène centrale n'est plus un calque HTML posé sur le canvas : elle vit
            dans la 3D (podium + carte), et son texte long est ancré sur la carte. */}

        <button type="button" className="mv-board3d__recenter" onClick={recenter} aria-label="Recentrer sur le plateau">
          🎯<span className="mv-lbl-lg"> Recentrer</span>
        </button>
      </div>

      <p className="mv-board3d__hint">↻ Glisse pour tourner · pince pour zoomer · double-tap pour recentrer · tape une case</p>

      {selectedSpace && (() => {
        const owner = ownerInfo(selectedSpace.id)
        const mgmt = propertyManagement(state, soireeBoard, canManage ? managePlayerId : null, selectedSpace.id)
        const emit = (type) => () => { onManage?.({ type, spaceId: selectedSpace.id }) }
        return (
          <MvCaseDetail
            space={selectedSpace}
            ownerName={owner.name}
            ownerColor={owner.color}
            management={mgmt}
            onBuild={emit('build')}
            onSell={emit('sellBuilding')}
            onMortgage={emit('mortgage')}
            onUnmortgage={emit('unmortgage')}
            onClose={() => setSelected(null)}
          />
        )
      })()}
    </div>
  )
}
