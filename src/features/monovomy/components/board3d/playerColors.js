/** Couleurs des joueurs — partagées entre pions 3D, marqueurs de propriété et UI. */
export const PLAYER_COLORS = ['#7c3aed', '#ec1e79', '#22c1c3', '#f5b21a', '#f97316', '#22c55e', '#3b82f6', '#e11d48']

export const playerColor = (i) => PLAYER_COLORS[((i % PLAYER_COLORS.length) + PLAYER_COLORS.length) % PLAYER_COLORS.length]
