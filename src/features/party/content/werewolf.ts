import type { WerewolfRole, WerewolfSpecial } from '../engine'

export interface RoleMeta {
  label: string
  emoji: string
  team: 'village' | 'wolves'
  description: string
}

export const WEREWOLF_ROLES: Record<WerewolfRole, RoleMeta> = {
  wolf: {
    label: 'Loup-Garou',
    emoji: '🐺',
    team: 'wolves',
    description: 'Chaque nuit, avec les autres loups, tu choisis une victime. Le jour, fais-toi passer pour un villageois.',
  },
  villager: {
    label: 'Villageois',
    emoji: '🧑‍🌾',
    team: 'village',
    description: 'Tu n’as aucun pouvoir, seulement ton flair et ta voix. Démasque les loups pendant le débat du jour.',
  },
  seer: {
    label: 'Voyante',
    emoji: '🔮',
    team: 'village',
    description: 'Chaque nuit, tu peux découvrir le vrai rôle d’un joueur. Aide le village sans te faire repérer.',
  },
  witch: {
    label: 'Sorcière',
    emoji: '🧪',
    team: 'village',
    description:
      'Tu as une potion de vie pour sauver la victime des loups, et une potion de mort pour éliminer quelqu’un. Une seule fois chacune.',
  },
  hunter: {
    label: 'Chasseur',
    emoji: '🏹',
    team: 'village',
    description: 'Si tu meurs, tu emportes immédiatement un joueur de ton choix avec toi.',
  },
  cupid: {
    label: 'Cupidon',
    emoji: '💘',
    team: 'village',
    description: 'La première nuit, tu désignes deux amoureux. Si l’un meurt, l’autre meurt de chagrin.',
  },
  littleGirl: {
    label: 'Petite Fille',
    emoji: '👀',
    team: 'village',
    description:
      'La nuit, tu peux entrouvrir les yeux pour espionner les loups. Mais s’ils te surprennent, tu deviens leur cible.',
  },
}

/** Rôles spéciaux proposés, dans l'ordre d'affichage. */
export const WEREWOLF_SPECIALS: WerewolfSpecial[] = ['seer', 'witch', 'hunter', 'cupid', 'littleGirl']

export interface NightStep {
  /** Rôle requis pour que l'étape existe (absent : toujours jouée). */
  role?: WerewolfRole
  firstNightOnly?: boolean
  text: string
}

/** Script du meneur, lu dans l'ordre chaque nuit. */
export const NIGHT_STEPS: NightStep[] = [
  { text: 'La nuit tombe sur le village. Tout le monde ferme les yeux.' },
  {
    role: 'cupid',
    firstNightOnly: true,
    text: 'Cupidon se réveille et désigne deux joueurs qui tombent amoureux. Cupidon se rendort.',
  },
  {
    role: 'cupid',
    firstNightOnly: true,
    text: 'Touche l’épaule des deux amoureux. Ils se réveillent, se regardent, puis se rendorment.',
  },
  {
    role: 'seer',
    text: 'La Voyante se réveille et désigne un joueur. Montre-lui son rôle en silence. La Voyante se rendort.',
  },
  {
    role: 'wolf',
    text: 'Les Loups-Garous se réveillent, se reconnaissent et choisissent ensemble une victime. Ils se rendorment.',
  },
  {
    role: 'littleGirl',
    text: 'Rappel : pendant le tour des loups, la Petite Fille peut espionner en entrouvrant les yeux.',
  },
  {
    role: 'witch',
    text: 'La Sorcière se réveille. Montre-lui la victime des loups. Veut-elle utiliser sa potion de vie ? Sa potion de mort ? Elle se rendort.',
  },
  {
    text: 'Le jour se lève, tout le monde ouvre les yeux. Annonce les victimes de la nuit et marque-les dans la liste.',
  },
  {
    role: 'hunter',
    text: 'Si le Chasseur vient de mourir, il désigne immédiatement un joueur qui meurt avec lui.',
  },
  {
    text: 'Débat du village, puis vote à main levée : le joueur le plus désigné est éliminé et révèle son rôle.',
  },
]
