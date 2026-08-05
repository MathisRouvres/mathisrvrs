import { useEffect } from 'react'

/**
 * Rendu commun du décor solide d'un thème : deux meshes, pas un de plus.
 *
 * - `solid` : tout ce qui est matière (table, mobilier, objets), en couleurs de
 *   sommets et matériau éclairé. UN draw call, quel que soit le nombre d'objets.
 * - `glow`  : les liserés lumineux (dorures, LED, néons), en matériau non éclairé
 *   pour qu'ils gardent exactement la couleur voulue d'un bout à l'autre de la
 *   scène. UN draw call.
 *
 * Rien ne reçoit de rayon : le décor ne peut ni être cliqué, ni intercepter un
 * geste destiné au plateau.
 */
export default function SolidDecor({ solid, glow, lite, metalness = 0.24, roughness = 0.6 }) {
  useEffect(() => () => { solid?.dispose(); glow?.dispose() }, [solid, glow])
  return (
    <>
      {solid && (
        <mesh geometry={solid} receiveShadow castShadow={!lite} raycast={() => null}>
          <meshStandardMaterial vertexColors metalness={metalness} roughness={roughness} />
        </mesh>
      )}
      {glow && (
        <mesh geometry={glow} raycast={() => null}>
          <meshBasicMaterial vertexColors toneMapped={false} fog={false} />
        </mesh>
      )}
    </>
  )
}
