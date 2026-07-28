import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { cellPos } from './boardCells'

const INTRO_DUR = 1.8    // fly-in d'ouverture
const IDLE_MS = 4000     // silence requis avant de suivre le pion actif
const GRACE_MS = 900     // silence requis avant un recadrage de phase
const FOLLOW_LERP = 1.5  // suivi volontairement mou
const DOLLY_LERP = 2.2
const ORBIT_SPEED = 0.12 // rad/s : un tour complet en ~52 s

// Facteur de distance par plan : on se rapproche des dés, on recule à l'enchère.
const DOLLY = { intro: 1, idle: 1, dice: 0.88, auction: 1.18, outro: 1.1 }
// Les dés tombent légèrement devant le centre du plateau.
const DICE_FOCUS = [0, 0.4]

const TMP = new THREE.Vector3()
const TMP_DIR = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Réalisateur caméra : SEUL endroit qui touche à la caméra. Piloté par une unique
 * prop `shot` ('intro' | 'idle' | 'dice' | 'auction' | 'outro').
 *
 * Règle d'or : le joueur reste maître. Tout geste sur le canvas (pointeur ou
 * molette) coupe net le mouvement en cours ; le suivi du pion ne reprend qu'après
 * 4 s de silence, un recadrage de phase après 0,9 s. OrbitControls garde la main
 * sur l'orbite : on ne fait que déplacer sa cible et ajuster la distance, jamais
 * remplacer ses contraintes (pan, min/maxDistance, angles polaires).
 */
export default function CameraDirector({ shot = 'idle', reducedMotion = false, controlsRef, focusCell = null, free = false }) {
  const gl = useThree((s) => s.gl)
  const input = useRef({ last: 0, dragging: false })
  const intro = useRef({ t: 0, from: null, to: null, active: false, armed: false })
  const rest = useRef(0) // distance choisie par le joueur, base des dollys

  useEffect(() => {
    const el = gl.domElement
    const grab = () => {
      input.current.last = performance.now()
      input.current.dragging = true
      // Reprise en main immédiate : le fly-in en cours est abandonné sur place.
      intro.current.active = false
    }
    const release = () => {
      input.current.last = performance.now()
      input.current.dragging = false
    }
    const wheel = () => { input.current.last = performance.now() }
    el.addEventListener('pointerdown', grab)
    el.addEventListener('pointerup', release)
    el.addEventListener('pointercancel', release)
    el.addEventListener('wheel', wheel, { passive: true })
    return () => {
      el.removeEventListener('pointerdown', grab)
      el.removeEventListener('pointerup', release)
      el.removeEventListener('pointercancel', release)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  useFrame((s, dt) => {
    const controls = controlsRef?.current
    const cam = s.camera
    if (!controls) return
    const it = intro.current

    // Caméra libre : le réalisateur se tait complètement — ni fly-in, ni suivi du
    // pion, ni dolly de phase, ni orbite finale. On garde la distance de repos à
    // jour pour que la reprise en main automatique reparte du cadrage du joueur.
    if (free) {
      it.armed = true
      it.active = false
      rest.current = cam.position.distanceTo(controls.target)
      return
    }

    // Première frame : la position posée par <Canvas camera> EST la position de jeu.
    if (!it.armed) {
      it.armed = true
      it.to = cam.position.clone()
      rest.current = cam.position.distanceTo(controls.target)
      if (shot === 'intro' && !reducedMotion) {
        // Départ loin et haut, légèrement décalé : le plateau « arrive » vers nous.
        it.from = new THREE.Vector3(it.to.x * 0.4, it.to.y * 2.3 + 7, it.to.z * 2.1 + 7)
        it.t = 0
        it.active = true
        cam.position.copy(it.from)
      }
    }
    if (it.active && shot !== 'intro') it.active = false

    if (it.active) {
      it.t += dt
      const k = Math.min(1, it.t / INTRO_DUR)
      cam.position.lerpVectors(it.from, it.to, easeInOutCubic(k))
      controls.update()
      if (k >= 1) it.active = false
      return // pendant le fly-in, aucun autre mouvement ne se superpose
    }

    const now = performance.now()
    const silence = now - input.current.last
    const busy = input.current.dragging
    const canFrame = !busy && silence > GRACE_MS
    const canFollow = !busy && silence > IDLE_MS

    if (reducedMotion) return

    // Orbite finale : rotation manuelle autour de la cible plutôt que l'autoRotate
    // d'OrbitControls — rien à remettre à zéro quand le plan change.
    if (shot === 'outro' && canFrame) {
      TMP_DIR.copy(cam.position).sub(controls.target).applyAxisAngle(UP, ORBIT_SPEED * dt)
      cam.position.copy(controls.target).add(TMP_DIR)
    }

    // ── Cible ──────────────────────────────────────────────────────────────────
    // Dés : on vise là où ils tombent. Repos : le pion actif, mais seulement après
    // 4 s sans geste. Enchère et fin de partie : plein cadre, donc centre.
    let want = null
    if (shot === 'dice' && canFrame) want = DICE_FOCUS
    else if (shot === 'auction' || shot === 'outro') { if (canFrame) want = [0, 0] }
    else if (shot === 'idle' && focusCell != null && canFollow) want = cellPos(focusCell)

    if (want) {
      TMP.set(want[0], controls.target.y, want[1])
      controls.target.lerp(TMP, Math.min(1, dt * FOLLOW_LERP))
    }

    // ── Distance ───────────────────────────────────────────────────────────────
    const dist = cam.position.distanceTo(controls.target)
    if (!canFrame) {
      // Le joueur zoome : sa distance devient la nouvelle référence.
      rest.current = dist
    } else {
      const factor = DOLLY[shot] ?? 1
      const desired = THREE.MathUtils.clamp(rest.current * factor, controls.minDistance, controls.maxDistance)
      if (Math.abs(dist - desired) > 0.005) {
        const next = THREE.MathUtils.lerp(dist, desired, Math.min(1, dt * DOLLY_LERP))
        TMP_DIR.copy(cam.position).sub(controls.target).setLength(next)
        cam.position.copy(controls.target).add(TMP_DIR)
      }
    }
    controls.update()
  })

  return null
}
