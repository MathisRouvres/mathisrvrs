/**
 * Convertit une seed string/number en état entier 32-bit non nul.
 */
export function seedToState(seed: string | number): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    const n = seed >>> 0
    return n === 0 ? 0x9e3779b9 : n
  }

  const text = String(seed)
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h >>>= 0
  return h === 0 ? 0x9e3779b9 : h
}
