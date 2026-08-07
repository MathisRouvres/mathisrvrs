import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'

const PODIUM_R = 3.9
const PODIUM_H = 0.04      // les 4 cm de surélévation
const PODIUM_Y = 0.02      // au-dessus de la plaque centrale du plateau
const GAUGE_SEG = 96
const LOGO_Y = 1.35        // au repos, en l'air ; à plat quand un panneau s'ouvre
const CARD_Y = 1.55

const FLAT_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
const TMP_Q = new THREE.Quaternion()

// Le logo est doré au warm-up puis vire au rose à mesure que la soirée chauffe.
const LOGO_TONE = {
  warmup: ['#f5b21a', '#ffd98a'],
  party: ['#f5b21a', '#ec1e79'],
  chaos: ['#f97316', '#ec1e79'],
  finale: ['#ec1e79', '#9b3cff'],
}
const INTENSITY_LABEL = { warmup: 'WARM-UP', party: 'PARTY', chaos: 'CHAOS', finale: 'FINALE' }

/** Texture du logo, fond transparent : un plan billboardé la porte. */
function createLogoTexture(intensity) {
  const [a, b] = LOGO_TONE[intensity] || LOGO_TONE.warmup
  const W = 1024
  const H = 320
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = "800 150px 'Fredoka', 'Poppins', sans-serif"
  const mono = 'MONO'
  const vomy = 'VOMY'
  const wm = ctx.measureText(mono).width
  const wv = ctx.measureText(vomy).width
  const x0 = (W - (wm + wv)) / 2
  const y = H / 2 - 22
  ctx.shadowBlur = 26
  ctx.shadowColor = a
  ctx.fillStyle = a
  ctx.fillText(mono, x0, y)
  ctx.shadowColor = b
  ctx.fillStyle = b
  ctx.fillText(vomy, x0 + wm, y)
  // Ruban signature, sous le logo.
  ctx.shadowBlur = 14
  ctx.shadowColor = b
  ctx.fillStyle = b
  const rw = 420
  const rh = 56
  const rx = (W - rw) / 2
  const ry = y + 86
  ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, rh / 2); ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '3px'
  ctx.font = "700 28px 'Fredoka', 'Poppins', sans-serif"
  ctx.fillText('LE MONOPOLY À BOIRE', W / 2, ry + rh / 2 + 1)
  ctx.letterSpacing = '0px'
  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Bandeau d'état (tour + intensité), billboardé sous le logo. */
function createStatusTexture(turn, intensity) {
  const W = 640
  const H = 96
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '3px'
  ctx.font = "800 52px 'Fredoka', 'Poppins', sans-serif"
  ctx.shadowBlur = 12
  ctx.shadowColor = 'rgba(0,0,0,0.85)'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`TOUR ${turn} · ${INTENSITY_LABEL[intensity] || ''}`.trim(), W / 2, H / 2)
  ctx.letterSpacing = '0px'
  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Carte de l'événement : cadre néon dessiné une fois, le texte vient en HTML. */
function createCardTexture(color) {
  const W = 512
  const H = 700
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1a1030')
  g.addColorStop(1, '#08040f')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.roundRect(10, 10, W - 20, H - 20, 42); ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 8
  ctx.shadowColor = color
  ctx.shadowBlur = 26
  ctx.beginPath(); ctx.roundRect(14, 14, W - 28, H - 28, 38); ctx.stroke()
  ctx.shadowBlur = 0
  ctx.globalAlpha = 0.14
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.roundRect(30, 30, W - 60, 120, 28); ctx.fill()
  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Centre du plateau, en volume.
 *
 * - un podium surélevé de 4 cm qui porte le décor imprimé (`centerArt`) et un bord
 *   néon — c'est la piste de danse, tout se joue dessus ;
 * - le logo n'est plus imprimé au sol : c'est un panneau qui fait face à la caméra
 *   en permanence, et qui se couche à plat sur le podium dès qu'un panneau s'ouvre ;
 * - le minuteur est une jauge circulaire au bord du podium (aucun texte à lire) ;
 * - un événement (carte, enchère) fait surgir une carte 3D qui se retourne et
 *   s'incline vers la caméra ; seul le texte long reste en HTML, ancré dessus en
 *   `<Html transform>` pour suivre la perspective.
 *
 * Le texte 3D passe par des textures canvas et non par troika/`<Text>` : la police
 * par défaut de troika se télécharge depuis un CDN, inacceptable pour une PWA.
 */
export default function CenterStage({
  texture,
  ambiance,
  intensity = 'warmup',
  reducedMotion = false,
  panel = null,     // null | 'card' | 'auction'
  turn = 1,
  timerLeft = -1,
  timerTotal = 0,
  centerSlot = null,
  stage = { x: 0, z: 0, scale: 1 },
}) {
  const discRef = useRef()
  const edgeRef = useRef()
  const gaugeRef = useRef()
  const logoRef = useRef()
  const cardRef = useRef()
  const cardMat = useRef()
  const flip = useRef(0)

  const logoTex = useMemo(() => createLogoTexture(intensity), [intensity])
  useEffect(() => () => logoTex.dispose(), [logoTex])
  const statusTex = useMemo(() => createStatusTexture(turn, intensity), [turn, intensity])
  useEffect(() => () => statusTex.dispose(), [statusTex])
  const cardColor = panel === 'auction' ? '#f5b21a' : '#ec1e79'
  const cardTex = useMemo(() => createCardTexture(cardColor), [cardColor])
  useEffect(() => () => cardTex.dispose(), [cardTex])

  // Jauge : un anneau complet dessiné une fois, dont on ne rend qu'une portion via
  // `drawRange` — zéro reconstruction de géométrie quand le temps s'écoule.
  const gaugeGeo = useMemo(() => {
    const g = new THREE.RingGeometry(PODIUM_R - 0.13, PODIUM_R - 0.04, GAUGE_SEG, 1)
    g.rotateZ(Math.PI / 2) // départ à midi
    return g
  }, [])
  useEffect(() => () => gaugeGeo.dispose(), [gaugeGeo])

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const pulse = reducedMotion ? 0 : ambiance.pulse

    // Bord néon : calme au warm-up, battement net en finale.
    const edge = edgeRef.current
    if (edge) edge.emissiveIntensity = 0.5 + Math.sin(t * ambiance.speed) * 0.45 * pulse + pulse * 0.5

    // Le podium tourne de plus en plus vite avec l'intensité (immobile au warm-up).
    const disc = discRef.current
    if (disc && !reducedMotion) disc.rotation.y += dt * 0.02 * ambiance.speed * ambiance.pulse

    // Jauge : portion visible = temps restant.
    const gauge = gaugeRef.current
    if (gauge) {
      const frac = timerTotal > 0 && timerLeft >= 0 ? Math.min(1, Math.max(0, timerLeft / timerTotal)) : 0
      gauge.visible = frac > 0
      gauge.geometry.setDrawRange(0, Math.max(0, Math.round(frac * GAUGE_SEG)) * 6)
    }

    // Logo : face caméra au repos, couché sur le podium quand un panneau s'ouvre.
    const logo = logoRef.current
    if (logo) {
      const lay = panel != null
      TMP_Q.copy(lay ? FLAT_Q : s.camera.quaternion)
      logo.quaternion.slerp(TMP_Q, reducedMotion ? 1 : Math.min(1, dt * 4))
      const wantY = lay ? PODIUM_Y + PODIUM_H + 0.02 : LOGO_Y
      logo.position.y += (wantY - logo.position.y) * (reducedMotion ? 1 : Math.min(1, dt * 4))
      // Compensation de distance : à 26 (maxDistance) le bandeau ne ferait plus que
      // 7 px par caractère. On grossit le billboard jusqu'à 1,5× quand la caméra
      // recule, sans qu'il écrase le plateau de près.
      const dist = s.camera.position.distanceTo(logo.position)
      const far = Math.min(1, Math.max(0, (dist - 15.5) / 10.5))
      const wantS = (lay ? 0.7 : 1) * (1 + 0.5 * far)
      const k = reducedMotion ? 1 : Math.min(1, dt * 4)
      logo.scale.x += (wantS - logo.scale.x) * k
      logo.scale.y = logo.scale.x
      logo.scale.z = logo.scale.x
    }

    // Carte : retournement puis inclinaison vers la caméra.
    const card = cardRef.current
    if (card) {
      const want = panel != null ? 1 : 0
      flip.current += (want - flip.current) * (reducedMotion ? 1 : Math.min(1, dt * 3.4))
      const f = flip.current
      card.visible = f > 0.01
      card.position.y = CARD_Y - (1 - f) * 0.7
      card.scale.setScalar(0.35 + f * 0.65)
      // Face caméra, puis demi-tour restant tant que le retournement n'est pas fini.
      card.quaternion.copy(s.camera.quaternion)
      card.rotateY(Math.PI * (1 - f))
      card.rotateX(-0.12 * f) // légère inclinaison : on la regarde de dessus
      if (cardMat.current) cardMat.current.opacity = Math.min(1, f * 1.4)
    }
  })

  const showHtml = panel != null && centerSlot

  return (
    /* Ancrage déclaré par la map : au milieu d'un anneau, dans le cœur d'une
       boucle sur un plateau en 8 (le centre y est occupé par le croisement). */
    <group position={[stage.x, 0, stage.z]} scale={stage.scale}>
      {/* Podium : décor imprimé sur le dessus, bord néon tout autour. */}
      <group ref={discRef} position={[0, PODIUM_Y, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PODIUM_H, 0]} raycast={() => null}>
          <circleGeometry args={[PODIUM_R, 64]} />
          <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.55} roughness={0.6} toneMapped={false} />
        </mesh>
        <mesh position={[0, PODIUM_H / 2, 0]} raycast={() => null}>
          <cylinderGeometry args={[PODIUM_R, PODIUM_R - 0.05, PODIUM_H, 64, 1, true]} />
          <meshStandardMaterial ref={edgeRef} color={ambiance.lightB} emissive={ambiance.lightB} emissiveIntensity={0.6} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {/* Jauge de temps au bord du podium : elle se vide, rien à lire. */}
        <mesh ref={gaugeRef} geometry={gaugeGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, PODIUM_H + 0.006, 0]} raycast={() => null}>
          <meshBasicMaterial color={ambiance.rim.color} transparent opacity={0.8} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Logo + état : un seul billboard, jamais écrasé par l'inclinaison. */}
      <group ref={logoRef} position={[0, LOGO_Y, 0]}>
        <mesh raycast={() => null}>
          <planeGeometry args={[3.4, 1.06]} />
          <meshBasicMaterial map={logoTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.72, 0]} raycast={() => null}>
          <planeGeometry args={[2.7, 0.41]} />
          <meshBasicMaterial map={statusTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>

      {/* Carte d'événement en volume + son texte long en HTML ancré dessus. */}
      <group ref={cardRef} position={[0, CARD_Y, 0]} visible={false}>
        <mesh raycast={() => null}>
          <planeGeometry args={[2.1, 2.87]} />
          <meshBasicMaterial ref={cardMat} map={cardTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
        {showHtml && (
          <Html
            transform
            center
            occlude={false}
            distanceFactor={5.2}
            position={[0, 0, 0.03]}
            zIndexRange={[18, 0]}
            wrapperClass="mv-center3d-wrap"
          >
            <div className="mv-center">{centerSlot}</div>
          </Html>
        )}
      </group>
    </group>
  )
}
