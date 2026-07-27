/**
 * Pays de départ réels. Les identifiants internes (`id`, `originId`,
 * `clubIds`, `leagueLevel`) restent inchangés pour préserver le moteur, les
 * conditions de dilemmes et les tests — seul l'affichage devient réel.
 * ⚠️ Voir l'avertissement marques déposées dans `clubs/index.ts`.
 */
export interface CountryDefinition {
  id: string
  label: string
  /** Lien vers l’origine historique (compat). */
  originId: string
  blurb: string
  clubIds: string[]
  /** Prénoms masculins (carrière masculine, défaut). */
  firstNames: string[]
  /** Prénoms féminins (carrière féminine). */
  firstNamesFemale: string[]
  lastNames: string[]
  /** Niveau du championnat national (division 1), échelle 1–99. */
  leagueLevel: number
}

export const countries: CountryDefinition[] = [
  {
    id: 'cote-brumeuse',
    label: 'France',
    originId: 'cote-brumeuse',
    blurb: 'Formation d’élite, Ligue 1 exigeante, vitrine vers l’Europe.',
    clubIds: [
      'academy-northwind',
      'sc-brume-harbor',
      'phare-athletic',
      'fr-nice',
      'fr-rennes',
      'fr-lyon',
      'fr-marseille',
      'fr-monaco',
      'fr-psg',
    ],
    firstNames: ['Lucas', 'Enzo', 'Théo', 'Nathan', 'Léo', 'Jules', 'Noah', 'Maël'],
    firstNamesFemale: ['Camille', 'Léa', 'Manon', 'Chloé', 'Jade', 'Louane', 'Inès', 'Emma'],
    lastNames: ['Martin', 'Bernard', 'Dubois', 'Lefèvre', 'Moreau', 'Girard', 'Fontaine', 'Roussel'],
    leagueLevel: 42,
  },
  {
    id: 'baie-lumen',
    label: 'Espagne',
    originId: 'baie-lumen',
    blurb: 'École technique, LaLiga du beau jeu, pression du résultat.',
    clubIds: [
      'fc-lumen-harbor',
      'lumen-youth',
      'lumen-royals',
      'es-valencia',
      'es-villarreal',
      'es-bilbao',
      'es-sociedad',
      'es-atletico',
      'es-madrid',
    ],
    firstNames: ['Sergio', 'Pablo', 'Álvaro', 'Marco', 'Diego', 'Javier', 'Iker', 'Adri'],
    firstNamesFemale: ['Lucía', 'Martina', 'Sofía', 'Paula', 'Carmen', 'Alba', 'Julia', 'Marta'],
    lastNames: ['García', 'Fernández', 'Martínez', 'López', 'Sánchez', 'Romero', 'Torres', 'Navas'],
    leagueLevel: 62,
  },
  {
    id: 'hauts-plateaux',
    label: 'Allemagne',
    originId: 'hauts-plateaux',
    blurb: 'Intensité, Bundesliga athlétique, stades bouillants.',
    clubIds: [
      'as-pierreclaire',
      'plateau-united',
      'cimes-fc',
      'de-freiburg',
      'de-wolfsburg',
      'de-leipzig',
      'de-leverkusen',
      'de-dortmund',
      'de-bayern',
    ],
    firstNames: ['Leon', 'Luca', 'Finn', 'Jonas', 'Niklas', 'Tim', 'Max', 'Elias'],
    firstNamesFemale: ['Mia', 'Lena', 'Emilia', 'Hannah', 'Lea', 'Marie', 'Lina', 'Clara'],
    lastNames: ['Müller', 'Schmidt', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hofmann', 'Krüger'],
    leagueLevel: 50,
  },
  {
    id: 'archipel-sel',
    label: 'Portugal',
    originId: 'archipel-sel',
    blurb: 'Tremplin des talents, Liga rapide, recruteurs à l’affût.',
    clubIds: [
      'sel-fc',
      'maree-academy',
      'union-maree',
      'pt-boavista',
      'pt-rioave',
      'pt-sporting',
      'pt-porto',
      'pt-benfica',
    ],
    firstNames: ['João', 'Diogo', 'Rúben', 'Tiago', 'André', 'Bruno', 'Rafael', 'Gonçalo'],
    firstNamesFemale: ['Beatriz', 'Matilde', 'Leonor', 'Carolina', 'Inês', 'Ana', 'Sofia', 'Mariana'],
    lastNames: ['Silva', 'Santos', 'Ferreira', 'Costa', 'Oliveira', 'Sousa', 'Gonçalves', 'Almeida'],
    leagueLevel: 46,
  },
  {
    id: 'capitale-miroir',
    label: 'Angleterre',
    originId: 'capitale-miroir',
    blurb: 'Premier League reine, rythme fou, projecteurs du monde entier.',
    clubIds: [
      'miroir-cf',
      'metro-eleven',
      'palais-fc',
      'en-brighton',
      'en-newcastle',
      'en-tottenham',
      'en-chelsea',
      'en-manutd',
      'en-liverpool',
      'en-mancity',
    ],
    firstNames: ['Jack', 'Harry', 'Callum', 'Ollie', 'Reece', 'Mason', 'Kai', 'Tyler'],
    firstNamesFemale: ['Grace', 'Ella', 'Isla', 'Amelia', 'Freya', 'Lily', 'Ruby', 'Millie'],
    lastNames: ['Smith', 'Walker', 'Wright', 'Bailey', 'Cole', 'Foster', 'Hughes', 'Palmer'],
    leagueLevel: 70,
  },
  {
    id: 'vallee-cendre',
    label: 'Italie',
    originId: 'vallee-cendre',
    blurb: 'Culture tactique, Serie A rugueuse, art du calcio.',
    clubIds: [
      'cendre-athletic',
      'forge-fc',
      'acier-club',
      'it-fiorentina',
      'it-lazio',
      'it-roma',
      'it-napoli',
      'it-milan',
      'it-inter',
      'it-juventus',
    ],
    firstNames: ['Marco', 'Lorenzo', 'Matteo', 'Andrea', 'Davide', 'Simone', 'Nicolò', 'Alessio'],
    firstNamesFemale: ['Giulia', 'Sofia', 'Aurora', 'Alice', 'Chiara', 'Martina', 'Francesca', 'Sara'],
    lastNames: ['Rossi', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Conti', 'Greco', 'Barbieri'],
    leagueLevel: 52,
  },
]

export function getCountryById(id: string): CountryDefinition | undefined {
  return countries.find((c) => c.id === id)
}
