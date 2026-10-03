import type { Level } from '../engine'

export interface SecretWord {
  word: string
  /** Indice facultatif donné à l'imposteur. */
  category: string
}

const w = (category: string, words: string[]): SecretWord[] => words.map((word) => ({ word, category }))

/** Imposteur — les joueurs reçoivent le mot, l'imposteur non. */
export const impostorWords: Record<Level, SecretWord[]> = {
  soft: [
    ...w('Nourriture', ['Pizza', 'Sushi', 'Croissant', 'Raclette', 'Crêpe', 'Burger', 'Couscous', 'Pop-corn']),
    ...w('Lieu', ['Plage', 'Aéroport', 'Hôpital', 'Bibliothèque', 'Cinéma', 'Piscine', 'Supermarché', 'Camping']),
    ...w('Animal', ['Girafe', 'Pingouin', 'Requin', 'Hérisson', 'Kangourou', 'Perroquet', 'Panda']),
    ...w('Objet', ['Parapluie', 'Brosse à dents', 'Trottinette', 'Aspirateur', 'Guitare', 'Valise', 'Bougie']),
    ...w('Métier', ['Pompier', 'Boulanger', 'Astronaute', 'Dentiste', 'Magicien', 'Facteur']),
    ...w('Activité', ['Ski', 'Karaoké', 'Bowling', 'Pêche', 'Escalade', 'Yoga']),
  ],
  spicy: [
    ...w('Soirée', ['Gueule de bois', 'Beer pong', 'After', 'Videur', 'Shot', 'Taxi de 5 h']),
    ...w('Amour', ['Premier date', 'Ex', 'Crush', 'Ghosting', 'Lune de miel', 'Demande en mariage', 'Slow']),
    ...w('Lieu', ['Boîte de nuit', 'Festival', 'Las Vegas', 'Ibiza', 'Bar à cocktails', 'Rooftop']),
    ...w('Appli', ['Tinder', 'Instagram', 'TikTok', 'Snapchat', 'WhatsApp']),
    ...w('Situation', ['Walk of shame', 'Message à l’ex', 'Jalousie', 'Plan foireux', 'Râteau']),
  ],
  hot: [
    ...w('Accessoire', ['Menottes', 'Bandeau', 'Lingerie', 'Plume', 'Huile de massage', 'Fouet']),
    ...w('Lieu', ['Jacuzzi', 'Cabine d’essayage', 'Banquette arrière', 'Club libertin', 'Plage nudiste', 'Chambre d’hôtel']),
    ...w('Coquin', ['Strip-tease', 'Plan à trois', 'Sex friend', 'Préliminaires', 'Suçon', 'Fantasme', 'Nude']),
    ...w('Jeu', ['Strip-poker', 'Jeu de rôle', 'Dés coquins', 'Jeu de la bouteille']),
  ],
}
