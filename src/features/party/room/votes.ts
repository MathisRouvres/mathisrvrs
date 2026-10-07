/** Votes d'une partie à plusieurs téléphones : `{ votant: choix }`. */
export type Votes = Record<string, unknown>

/** Votants encore dans la partie, avec un choix valide parmi `options`. */
export function validVotes<T>(votes: Votes, voters: readonly string[], options: readonly T[]): Map<string, T> {
  const out = new Map<string, T>()
  for (const voter of voters) {
    const choice = votes[voter]
    if (options.includes(choice as T)) out.set(voter, choice as T)
  }
  return out
}

/** Décompte par option, du plus voté au moins voté (ordre des options à égalité). */
export function tally<T>(
  votes: Votes,
  voters: readonly string[],
  options: readonly T[],
): { option: T; count: number; voters: string[] }[] {
  const valid = validVotes(votes, voters, options)
  return options
    .map((option) => {
      const by = voters.filter((v) => valid.get(v) === option)
      return { option, count: by.length, voters: by }
    })
    .sort((a, b) => b.count - a.count)
}

/** Option la plus votée, ou null si personne n'a voté ou en cas d'égalité en tête. */
export function winner<T>(votes: Votes, voters: readonly string[], options: readonly T[]): T | null {
  const [first, second] = tally(votes, voters, options)
  if (!first || first.count === 0 || (second && second.count === first.count)) return null
  return first.option
}
