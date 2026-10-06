/**
 * Unité de pénalité selon le niveau : Soft se joue sans alcool (points de gage),
 * Épicé en gorgées, Hot en gorgées ou accessoire retiré. À employer après
 * « prendre » ou « distribuer » : « prends 3 gorgées », « distribue 2 points de gage ».
 */
export function sips(level, n) {
  const s = n > 1 ? 's' : ''
  if (level === 'soft') return `${n} point${s} de gage`
  if (level === 'spicy') return `${n} gorgée${s}`
  return `${n} gorgée${s} (ou un accessoire retiré)`
}
