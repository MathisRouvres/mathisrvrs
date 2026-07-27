import type { ClubDefinition } from '../../game-engine/types'

/**
 * Clubs réels (nom + ville d'affichage). ⚠️ Marques déposées : les noms de
 * clubs appartiennent à leurs détenteurs — aucun logo/écusson réel n'est
 * embarqué (identité visuelle générée). À faire valider juridiquement avant
 * diffusion publique ; repasser en fictif = éditer ce seul fichier.
 *
 * Les IDs des 18 clubs d'origine sont conservés (référencés par les tests et
 * la sélection de départ). Les autres enrichissent le pool national et les
 * destinations de transfert (haut niveau aspirationnel).
 */
export interface ClubDefinitionExtended extends ClubDefinition {
  infrastructure: number
  competitionLevel: number
  countryId: string
}

export const clubs: ClubDefinitionExtended[] = [
  // ══════════ France (cote-brumeuse) ══════════
  { id: 'academy-northwind', name: 'Le Havre AC', shortName: 'Le Havre', region: 'Le Havre', prestige: 35, isAcademy: true, infrastructure: 48, competitionLevel: 36, countryId: 'cote-brumeuse' },
  { id: 'sc-brume-harbor', name: 'RC Strasbourg', shortName: 'Strasbourg', region: 'Strasbourg', prestige: 42, isAcademy: false, infrastructure: 52, competitionLevel: 44, countryId: 'cote-brumeuse' },
  { id: 'phare-athletic', name: 'RC Lens', shortName: 'Lens', region: 'Lens', prestige: 56, isAcademy: false, infrastructure: 60, competitionLevel: 55, countryId: 'cote-brumeuse' },
  { id: 'fr-nice', name: 'OGC Nice', shortName: 'Nice', region: 'Nice', prestige: 60, isAcademy: false, infrastructure: 63, competitionLevel: 62, countryId: 'cote-brumeuse' },
  { id: 'fr-rennes', name: 'Stade Rennais', shortName: 'Rennes', region: 'Rennes', prestige: 64, isAcademy: false, infrastructure: 68, competitionLevel: 65, countryId: 'cote-brumeuse' },
  { id: 'fr-lyon', name: 'Olympique Lyonnais', shortName: 'Lyon', region: 'Lyon', prestige: 74, isAcademy: false, infrastructure: 78, competitionLevel: 74, countryId: 'cote-brumeuse' },
  { id: 'fr-marseille', name: 'Olympique de Marseille', shortName: 'Marseille', region: 'Marseille', prestige: 78, isAcademy: false, infrastructure: 80, competitionLevel: 78, countryId: 'cote-brumeuse' },
  { id: 'fr-monaco', name: 'AS Monaco', shortName: 'Monaco', region: 'Monaco', prestige: 80, isAcademy: false, infrastructure: 84, competitionLevel: 80, countryId: 'cote-brumeuse' },
  { id: 'fr-psg', name: 'Paris Saint-Germain', shortName: 'PSG', region: 'Paris', prestige: 92, isAcademy: false, infrastructure: 94, competitionLevel: 90, countryId: 'cote-brumeuse' },

  // ══════════ Espagne (baie-lumen) ══════════
  { id: 'fc-lumen-harbor', name: 'Real Betis', shortName: 'Betis', region: 'Séville', prestige: 62, isAcademy: false, infrastructure: 68, competitionLevel: 64, countryId: 'baie-lumen' },
  { id: 'lumen-youth', name: 'RCD Espanyol', shortName: 'Espanyol', region: 'Barcelone', prestige: 40, isAcademy: true, infrastructure: 58, competitionLevel: 42, countryId: 'baie-lumen' },
  { id: 'lumen-royals', name: 'FC Barcelone', shortName: 'Barça', region: 'Barcelone', prestige: 72, isAcademy: false, infrastructure: 76, competitionLevel: 70, countryId: 'baie-lumen' },
  { id: 'es-valencia', name: 'Valence CF', shortName: 'Valence', region: 'Valence', prestige: 60, isAcademy: false, infrastructure: 64, competitionLevel: 60, countryId: 'baie-lumen' },
  { id: 'es-villarreal', name: 'Villarreal CF', shortName: 'Villarreal', region: 'Villarreal', prestige: 66, isAcademy: false, infrastructure: 70, competitionLevel: 66, countryId: 'baie-lumen' },
  { id: 'es-bilbao', name: 'Athletic Bilbao', shortName: 'Bilbao', region: 'Bilbao', prestige: 68, isAcademy: false, infrastructure: 71, competitionLevel: 68, countryId: 'baie-lumen' },
  { id: 'es-sociedad', name: 'Real Sociedad', shortName: 'Sociedad', region: 'Saint-Sébastien', prestige: 69, isAcademy: false, infrastructure: 72, competitionLevel: 69, countryId: 'baie-lumen' },
  { id: 'es-atletico', name: 'Atlético de Madrid', shortName: 'Atlético', region: 'Madrid', prestige: 85, isAcademy: false, infrastructure: 86, competitionLevel: 84, countryId: 'baie-lumen' },
  { id: 'es-madrid', name: 'Real Madrid', shortName: 'Real', region: 'Madrid', prestige: 94, isAcademy: false, infrastructure: 95, competitionLevel: 92, countryId: 'baie-lumen' },

  // ══════════ Allemagne (hauts-plateaux) ══════════
  { id: 'as-pierreclaire', name: 'VfB Stuttgart', shortName: 'Stuttgart', region: 'Stuttgart', prestige: 48, isAcademy: false, infrastructure: 55, competitionLevel: 50, countryId: 'hauts-plateaux' },
  { id: 'plateau-united', name: 'FC St. Pauli', shortName: 'St. Pauli', region: 'Hambourg', prestige: 38, isAcademy: true, infrastructure: 46, competitionLevel: 38, countryId: 'hauts-plateaux' },
  { id: 'cimes-fc', name: 'Eintracht Francfort', shortName: 'Francfort', region: 'Francfort', prestige: 61, isAcademy: false, infrastructure: 63, competitionLevel: 60, countryId: 'hauts-plateaux' },
  { id: 'de-freiburg', name: 'SC Fribourg', shortName: 'Fribourg', region: 'Fribourg', prestige: 55, isAcademy: false, infrastructure: 58, competitionLevel: 56, countryId: 'hauts-plateaux' },
  { id: 'de-wolfsburg', name: 'VfL Wolfsburg', shortName: 'Wolfsburg', region: 'Wolfsburg', prestige: 57, isAcademy: false, infrastructure: 66, competitionLevel: 58, countryId: 'hauts-plateaux' },
  { id: 'de-leipzig', name: 'RB Leipzig', shortName: 'Leipzig', region: 'Leipzig', prestige: 80, isAcademy: false, infrastructure: 85, competitionLevel: 80, countryId: 'hauts-plateaux' },
  { id: 'de-leverkusen', name: 'Bayer Leverkusen', shortName: 'Leverkusen', region: 'Leverkusen', prestige: 82, isAcademy: false, infrastructure: 84, competitionLevel: 82, countryId: 'hauts-plateaux' },
  { id: 'de-dortmund', name: 'Borussia Dortmund', shortName: 'Dortmund', region: 'Dortmund', prestige: 85, isAcademy: false, infrastructure: 88, competitionLevel: 85, countryId: 'hauts-plateaux' },
  { id: 'de-bayern', name: 'Bayern Munich', shortName: 'Bayern', region: 'Munich', prestige: 93, isAcademy: false, infrastructure: 95, competitionLevel: 91, countryId: 'hauts-plateaux' },

  // ══════════ Portugal (archipel-sel) ══════════
  { id: 'sel-fc', name: 'Vitória Guimarães', shortName: 'Vitória', region: 'Guimarães', prestige: 44, isAcademy: false, infrastructure: 50, competitionLevel: 46, countryId: 'archipel-sel' },
  { id: 'maree-academy', name: 'CD Nacional', shortName: 'Nacional', region: 'Madère', prestige: 33, isAcademy: true, infrastructure: 44, competitionLevel: 34, countryId: 'archipel-sel' },
  { id: 'union-maree', name: 'SC Braga', shortName: 'Braga', region: 'Braga', prestige: 58, isAcademy: false, infrastructure: 59, competitionLevel: 57, countryId: 'archipel-sel' },
  { id: 'pt-boavista', name: 'Boavista FC', shortName: 'Boavista', region: 'Porto', prestige: 43, isAcademy: false, infrastructure: 48, competitionLevel: 44, countryId: 'archipel-sel' },
  { id: 'pt-rioave', name: 'Rio Ave FC', shortName: 'Rio Ave', region: 'Vila do Conde', prestige: 46, isAcademy: false, infrastructure: 49, competitionLevel: 48, countryId: 'archipel-sel' },
  { id: 'pt-sporting', name: 'Sporting CP', shortName: 'Sporting', region: 'Lisbonne', prestige: 80, isAcademy: false, infrastructure: 82, competitionLevel: 78, countryId: 'archipel-sel' },
  { id: 'pt-porto', name: 'FC Porto', shortName: 'Porto', region: 'Porto', prestige: 83, isAcademy: false, infrastructure: 84, competitionLevel: 82, countryId: 'archipel-sel' },
  { id: 'pt-benfica', name: 'SL Benfica', shortName: 'Benfica', region: 'Lisbonne', prestige: 85, isAcademy: false, infrastructure: 86, competitionLevel: 84, countryId: 'archipel-sel' },

  // ══════════ Angleterre (capitale-miroir) ══════════
  { id: 'miroir-cf', name: 'Aston Villa', shortName: 'Villa', region: 'Birmingham', prestige: 70, isAcademy: false, infrastructure: 74, competitionLevel: 72, countryId: 'capitale-miroir' },
  { id: 'metro-eleven', name: 'Crystal Palace', shortName: 'Palace', region: 'Londres', prestige: 55, isAcademy: true, infrastructure: 66, competitionLevel: 58, countryId: 'capitale-miroir' },
  { id: 'palais-fc', name: 'Arsenal FC', shortName: 'Arsenal', region: 'Londres', prestige: 80, isAcademy: false, infrastructure: 82, competitionLevel: 78, countryId: 'capitale-miroir' },
  { id: 'en-brighton', name: 'Brighton & Hove Albion', shortName: 'Brighton', region: 'Brighton', prestige: 62, isAcademy: false, infrastructure: 68, competitionLevel: 64, countryId: 'capitale-miroir' },
  { id: 'en-newcastle', name: 'Newcastle United', shortName: 'Newcastle', region: 'Newcastle', prestige: 74, isAcademy: false, infrastructure: 80, competitionLevel: 74, countryId: 'capitale-miroir' },
  { id: 'en-tottenham', name: 'Tottenham Hotspur', shortName: 'Tottenham', region: 'Londres', prestige: 80, isAcademy: false, infrastructure: 88, competitionLevel: 80, countryId: 'capitale-miroir' },
  { id: 'en-chelsea', name: 'Chelsea FC', shortName: 'Chelsea', region: 'Londres', prestige: 83, isAcademy: false, infrastructure: 88, competitionLevel: 82, countryId: 'capitale-miroir' },
  { id: 'en-manutd', name: 'Manchester United', shortName: 'Man United', region: 'Manchester', prestige: 86, isAcademy: false, infrastructure: 90, competitionLevel: 84, countryId: 'capitale-miroir' },
  { id: 'en-liverpool', name: 'Liverpool FC', shortName: 'Liverpool', region: 'Liverpool', prestige: 90, isAcademy: false, infrastructure: 92, competitionLevel: 89, countryId: 'capitale-miroir' },
  { id: 'en-mancity', name: 'Manchester City', shortName: 'Man City', region: 'Manchester', prestige: 93, isAcademy: false, infrastructure: 96, competitionLevel: 92, countryId: 'capitale-miroir' },

  // ══════════ Italie (vallee-cendre) ══════════
  { id: 'cendre-athletic', name: 'Bologna FC', shortName: 'Bologna', region: 'Bologne', prestige: 46, isAcademy: false, infrastructure: 54, competitionLevel: 48, countryId: 'vallee-cendre' },
  { id: 'forge-fc', name: 'Empoli FC', shortName: 'Empoli', region: 'Empoli', prestige: 36, isAcademy: true, infrastructure: 47, competitionLevel: 37, countryId: 'vallee-cendre' },
  { id: 'acier-club', name: 'Atalanta', shortName: 'Atalanta', region: 'Bergame', prestige: 62, isAcademy: false, infrastructure: 64, competitionLevel: 61, countryId: 'vallee-cendre' },
  { id: 'it-fiorentina', name: 'ACF Fiorentina', shortName: 'Fiorentina', region: 'Florence', prestige: 60, isAcademy: false, infrastructure: 64, competitionLevel: 60, countryId: 'vallee-cendre' },
  { id: 'it-lazio', name: 'SS Lazio', shortName: 'Lazio', region: 'Rome', prestige: 70, isAcademy: false, infrastructure: 74, competitionLevel: 70, countryId: 'vallee-cendre' },
  { id: 'it-roma', name: 'AS Roma', shortName: 'Roma', region: 'Rome', prestige: 74, isAcademy: false, infrastructure: 78, competitionLevel: 74, countryId: 'vallee-cendre' },
  { id: 'it-napoli', name: 'SSC Napoli', shortName: 'Napoli', region: 'Naples', prestige: 82, isAcademy: false, infrastructure: 82, competitionLevel: 82, countryId: 'vallee-cendre' },
  { id: 'it-milan', name: 'AC Milan', shortName: 'Milan', region: 'Milan', prestige: 84, isAcademy: false, infrastructure: 86, competitionLevel: 83, countryId: 'vallee-cendre' },
  { id: 'it-inter', name: 'Inter Milan', shortName: 'Inter', region: 'Milan', prestige: 86, isAcademy: false, infrastructure: 88, competitionLevel: 85, countryId: 'vallee-cendre' },
  { id: 'it-juventus', name: 'Juventus', shortName: 'Juve', region: 'Turin', prestige: 88, isAcademy: false, infrastructure: 90, competitionLevel: 86, countryId: 'vallee-cendre' },
]

export function getClubById(id: string): ClubDefinitionExtended | undefined {
  return clubs.find((club) => club.id === id)
}

export function getClubsByCountry(countryId: string): ClubDefinitionExtended[] {
  return clubs.filter((c) => c.countryId === countryId)
}
