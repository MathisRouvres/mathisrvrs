/**
 * Photo de profil : l'image choisie est chargée dans le navigateur, la personne y place un cadre
 * carré (PhotoCropper), puis le cadre est réduit à 256 px et stocké en data URL JPEG (≈ 20 Ko)
 * dans `dispo_people.avatar`. Aucun fichier n'est envoyé tel quel ; la base refuse au-delà de 150 Ko.
 */

const SIZE = 256
const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_DATA_URL_LENGTH = 140_000

/** Cadre carré en pixels de l'image d'origine. */
export interface Crop {
  x: number
  y: number
  size: number
}

/** Plus petit cadre autorisé : 10 % du petit côté, 32 px au moins (sans dépasser l'image). */
export function minCropSize(width: number, height: number): number {
  const side = Math.min(width, height)
  return Math.min(side, Math.max(32, Math.round(side * 0.1)))
}

/** Plus grand carré centré : réglage de départ. */
export function centeredCrop(width: number, height: number): Crop {
  const size = Math.min(width, height)
  return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2), size }
}

/** Cadre ramené dans l'image et dans les tailles permises. */
export function clampCrop(crop: Crop, width: number, height: number): Crop {
  const size = Math.round(Math.min(Math.min(width, height), Math.max(minCropSize(width, height), crop.size)))
  return {
    x: Math.round(Math.min(width - size, Math.max(0, crop.x))),
    y: Math.round(Math.min(height - size, Math.max(0, crop.y))),
    size,
  }
}

/** Nouvelle taille en gardant le centre du cadre (puis ramené dans l'image). */
export function resizeCrop(crop: Crop, size: number, width: number, height: number): Crop {
  const center = { x: crop.x + crop.size / 2, y: crop.y + crop.size / 2 }
  return clampCrop({ x: center.x - size / 2, y: center.y - size / 2, size }, width, height)
}

export interface LoadedImage {
  image: HTMLImageElement
  /** URL locale de l'image, à libérer (`URL.revokeObjectURL`) une fois le recadrage fini. */
  url: string
}

export function loadImageFile(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Choisis un fichier image.'))
  if (file.size > MAX_FILE_BYTES) return Promise.reject(new Error('Image trop lourde (20 Mo max).'))
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (image.naturalWidth && image.naturalHeight) resolve({ image, url })
      else {
        URL.revokeObjectURL(url)
        reject(new Error('Image vide.'))
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image illisible. Essaie une photo JPEG ou PNG.'))
    }
    image.src = url
  })
}

export function cropToAvatar(image: HTMLImageElement, crop: Crop): string {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Ton navigateur ne peut pas redimensionner l’image.')
  context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, SIZE, SIZE)

  for (const quality of [0.85, 0.7, 0.5]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl
  }
  throw new Error('Image trop détaillée, essaie une autre photo.')
}
