/**
 * Photo de profil : l'image choisie est recadrée au carré et réduite à 256 px dans le
 * navigateur, puis stockée en data URL JPEG (≈ 20 Ko) dans `dispo_people.avatar`.
 * Aucun fichier n'est envoyé tel quel ; la base refuse au-delà de 150 Ko.
 */

const SIZE = 256
const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_DATA_URL_LENGTH = 140_000

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image illisible. Essaie une photo JPEG ou PNG.'))
    }
    image.src = url
  })
}

export async function imageFileToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choisis un fichier image.')
  if (file.size > MAX_FILE_BYTES) throw new Error('Image trop lourde (20 Mo max).')

  const image = await loadImage(file)
  const side = Math.min(image.naturalWidth, image.naturalHeight)
  if (!side) throw new Error('Image vide.')

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Ton navigateur ne peut pas redimensionner l’image.')
  context.drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  )

  for (const quality of [0.85, 0.7, 0.5]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl
  }
  throw new Error('Image trop détaillée, essaie une autre photo.')
}
