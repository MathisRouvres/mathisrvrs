import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import Scene3D from './Scene3D'
import { PLAYER_COLORS } from './playerColors'
import { soireeBoard } from '../../content'
import { completeGroups } from '../../game/boardInsights'
import { useDeviceProfile } from '../../game/useDeviceProfile'
import { ambianceFor } from './ambiance'
import { propertyManagement } from '../../engine'
import MvCaseDetail from '../MvCaseDetail'

export default function MvBoard3D({ state, dice, reducedMotion = false, onManage, canManage = false, managePlayerId = null, justOwned = null, centerSlot = null }) {
  const [selected, setSelected] = useState(null)
  const controlsRef = useRef(null)
  const { isMobile, lowPerf } = useDeviceProfile()
  // Rendu allégé (reflets/bloom/ombres off, dpr bas) : mouvement réduit OU faible perf.
  const lite = reducedMotion || lowPerf
  // Mobile : caméra plus haute / moins inclinée → cases lisibles sur petit écran.
  const camera = isMobile ? { position: [0, 15, 8], fov: 46 } : { position: [0, 11.2, 10.8], fov: 40 }
  // Ambiance visuelle pilotée par l'intensité de soirée (Warm-up → Finale).
  const amb = ambianceFor(state.partyIntensity)
  const selectedSpace = selected != null ? soireeBoard.spaces[selected] : null
  const active = state.players[state.currentPlayerIndex]

  // Monopoles (groupes complets) — recalculés seulement quand la propriété change.
  const monopolySpaces = useMemo(
    () => new Set(Object.keys(completeGroups(state, soireeBoard).monopolySpaces)),
    [state],
  )

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
          dpr={[1, lite ? 1.25 : 2]}
          camera={camera}
          gl={{ antialias: !lite, powerPreference: 'high-performance' }}
          onPointerMissed={() => setSelected(null)}
        >
          <color attach="background" args={[amb.bg]} />
          <fog attach="fog" args={[amb.fog, 19, 40]} />
          <Suspense fallback={null}>
            <Scene3D
              state={state}
              onSelect={setSelected}
              dice={dice}
              reducedMotion={reducedMotion}
              lite={lite}
              topDown={isMobile}
              ambiance={amb}
              monopolySpaces={monopolySpaces}
              buildings={state.buildings}
              mortgaged={state.mortgaged}
              justOwned={justOwned}
              targetSpace={active ? active.position : null}
              controlsRef={controlsRef}
            />
          </Suspense>
          {/* Bloom = flou coûteux : coupé en rendu allégé (mobile / faible perf). */}
          {!lite && (
            <EffectComposer disableNormalPass>
              <Bloom intensity={amb.bloom} luminanceThreshold={0.5} luminanceSmoothing={0.25} radius={0.5} mipmapBlur />
            </EffectComposer>
          )}
        </Canvas>

        <div className="mv-board3d__vignette" aria-hidden="true" />

        {/* Scène centrale dynamique (info par défaut, panneaux d'action, événements). */}
        {centerSlot && <div className="mv-center">{centerSlot}</div>}

        <button type="button" className="mv-board3d__recenter" onClick={recenter} aria-label="Recentrer sur le plateau">
          🎯 Recentrer
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
