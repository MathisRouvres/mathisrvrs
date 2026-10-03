/** Classes partagées des boutons des jeux de soirée (tokens du portfolio). */

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100'

export const btnPrimary = `${base} bg-[var(--accent)] text-white shadow-lg hover:brightness-110 dark:text-[#070b14]`

export const btnGhost = `${base} border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)]`

/** Animation d'entrée d'une nouvelle carte (désactivée si mouvement réduit). */
export const cardEnter = 'motion-safe:animate-[fade-in-up_220ms_var(--ease-out)]'
