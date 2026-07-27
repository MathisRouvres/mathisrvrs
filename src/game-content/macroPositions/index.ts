/** Postes macro (UI) → rôles précis générés en interne. */
export const MACRO_POSITIONS = [
  {
    id: 'gk',
    label: 'Gardien',
    roles: ['gk'] as const,
  },
  {
    id: 'defender',
    label: 'Défenseur',
    roles: ['cb', 'fb'] as const,
  },
  {
    id: 'midfielder',
    label: 'Milieu',
    roles: ['cdm', 'cm', 'cam'] as const,
  },
  {
    id: 'attacker',
    label: 'Attaquant',
    roles: ['winger', 'st'] as const,
  },
] as const

export type MacroPositionId = (typeof MACRO_POSITIONS)[number]['id']

export function getMacroPosition(id: string) {
  return MACRO_POSITIONS.find((p) => p.id === id)
}

export function macroFromPreciseRole(role: string): MacroPositionId {
  if (role === 'gk') return 'gk'
  if (role === 'cb' || role === 'fb') return 'defender'
  if (role === 'cdm' || role === 'cm' || role === 'cam') return 'midfielder'
  return 'attacker'
}
