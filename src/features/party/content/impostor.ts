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
    ...w('Nourriture', [
      'Pizza', 'Sushi', 'Croissant', 'Raclette', 'Crêpe', 'Burger', 'Couscous', 'Pop-corn',
      'Fondue', 'Baguette', 'Camembert', 'Glace', 'Lasagnes', 'Pâtes', 'Ratatouille',
    ]),
    ...w('Lieu', [
      'Plage', 'Aéroport', 'Hôpital', 'Bibliothèque', 'Cinéma', 'Piscine', 'Supermarché', 'Camping',
      'Musée', 'Zoo', 'Château', 'Gare', 'Parc d’attractions', 'Boulangerie',
    ]),
    ...w('Animal', [
      'Girafe', 'Pingouin', 'Requin', 'Hérisson', 'Kangourou', 'Perroquet', 'Panda',
      'Éléphant', 'Dauphin', 'Lion', 'Pieuvre', 'Escargot', 'Flamant rose', 'Chauve-souris',
    ]),
    ...w('Objet', [
      'Parapluie', 'Brosse à dents', 'Trottinette', 'Aspirateur', 'Guitare', 'Valise', 'Bougie',
      'Réveil', 'Miroir', 'Ballon', 'Lunettes', 'Clé', 'Horloge', 'Cerf-volant',
    ]),
    ...w('Métier', [
      'Pompier', 'Boulanger', 'Astronaute', 'Dentiste', 'Magicien', 'Facteur',
      'Pilote', 'Cuisinier', 'Infirmier', 'Détective', 'Clown', 'Coiffeur', 'Plombier', 'Professeur',
    ]),
    ...w('Activité', [
      'Ski', 'Karaoké', 'Bowling', 'Pêche', 'Escalade', 'Yoga',
      'Danse', 'Jardinage', 'Randonnée', 'Puzzle', 'Dessin', 'Surf', 'Méditation',
    ]),
    ...w('Sport', [
      'Football', 'Tennis', 'Natation', 'Judo', 'Rugby', 'Basket', 'Golf', 'Cyclisme', 'Boxe', 'Équitation',
    ]),
    ...w('Pays', [
      'Japon', 'Brésil', 'Italie', 'Égypte', 'Canada', 'Australie', 'Mexique', 'Maroc', 'Islande', 'Inde',
    ]),
    ...w('Fête', [
      'Noël', 'Anniversaire', 'Halloween', 'Mariage', 'Carnaval', 'Saint-Valentin', '14 Juillet', 'Nouvel An',
      'Pâques',
    ]),
    ...w('Instrument', [
      'Piano', 'Violon', 'Batterie', 'Flûte', 'Trompette', 'Saxophone', 'Harpe', 'Accordéon', 'Ukulélé',
    ]),
    ...w('Véhicule', [
      'Hélicoptère', 'Sous-marin', 'Montgolfière', 'Tracteur', 'Camion de pompiers', 'Train', 'Vélo',
      'Bateau pirate', 'Fusée', 'Métro',
    ]),
    ...w('Météo', ['Orage', 'Neige', 'Brouillard', 'Arc-en-ciel', 'Canicule', 'Tempête', 'Grêle', 'Vent']),
    ...w('Vêtement', [
      'Écharpe', 'Casquette', 'Pyjama', 'Maillot de bain', 'Bottes', 'Chaussettes', 'Manteau', 'Cravate', 'Jean',
      'Bonnet',
    ]),
    ...w('École', [
      'Cartable', 'Récréation', 'Cantine', 'Tableau noir', 'Cahier', 'Trousse', 'Dictée', 'Examen', 'Sonnerie',
      'Bulletin',
    ]),
    ...w('Dessin animé', [
      'Cendrillon', 'Shrek', 'Nemo', 'Mickey', 'Simba', 'Bob l’éponge', 'Pikachu', 'Peter Pan', 'Aladdin', 'Astérix',
    ]),
    ...w('Boisson', ['Café', 'Chocolat chaud', 'Limonade', 'Jus d’orange', 'Thé', 'Sirop', 'Smoothie', 'Milkshake']),
    ...w('Fruit ou légume', [
      'Fraise', 'Banane', 'Ananas', 'Citrouille', 'Carotte', 'Pastèque', 'Cerise', 'Champignon', 'Pomme', 'Tomate',
    ]),
    ...w('Nature', [
      'Volcan', 'Forêt', 'Désert', 'Cascade', 'Montagne', 'Île', 'Grotte', 'Lac', 'Rivière', 'Océan',
    ]),
    ...w('Maison', [
      'Cuisine', 'Salon', 'Grenier', 'Cave', 'Balcon', 'Canapé', 'Frigo', 'Baignoire', 'Escalier', 'Cheminée',
    ]),
    ...w('Monument', [
      'Tour Eiffel', 'Colisée', 'Pyramide', 'Statue de la Liberté', 'Big Ben', 'Mont-Saint-Michel', 'Versailles',
      'Louvre', 'Sagrada Familia', 'Taj Mahal',
    ]),
    ...w('Jeu', [
      'Monopoly', 'Échecs', 'Cache-cache', 'Cluedo', 'Memory', 'Domino', 'Jeu de cartes', 'Marelle', 'Jeux vidéo',
      'Colin-maillard',
    ]),
  ],
  spicy: [
    ...w('Soirée', [
      'Gueule de bois', 'Beer pong', 'After', 'Videur', 'Shot', 'Taxi de 5 h',
      'DJ', 'Vestiaire', 'Soirée déguisée', 'Pot de départ', 'Afterwork', 'Piste de danse', 'Dernier métro',
      'Pré-soirée', 'Cotillons',
    ]),
    ...w('Alcool', [
      'Mojito', 'Tequila', 'Vodka', 'Champagne', 'Sangria', 'Spritz', 'Pastis', 'Whisky', 'Margarita', 'Piña colada',
      'Gin tonic', 'Cidre',
    ]),
    ...w('Amour', [
      'Premier date', 'Ex', 'Crush', 'Ghosting', 'Lune de miel', 'Demande en mariage', 'Slow',
      'Coup de foudre', 'Friendzone', 'Rupture', 'Premier baiser', 'Love bombing', 'Situationship',
      'Dîner aux chandelles',
    ]),
    ...w('Lieu', [
      'Boîte de nuit', 'Festival', 'Las Vegas', 'Ibiza', 'Bar à cocktails', 'Rooftop',
      'Péniche', 'Terrasse', 'Pub irlandais', 'Mykonos', 'Barcelone', 'Amsterdam', 'Saint-Tropez', 'Cancún',
    ]),
    ...w('Appli', [
      'Tinder', 'Instagram', 'TikTok', 'Snapchat', 'WhatsApp',
      'Bumble', 'Hinge', 'Uber', 'Deliveroo', 'Shazam', 'BeReal', 'Spotify',
    ]),
    ...w('Situation', [
      'Walk of shame', 'Message à l’ex', 'Jalousie', 'Plan foireux', 'Râteau',
      'Message vu', 'Trou noir', 'Fou rire', 'Cuite', 'Silence gênant', 'Blague lourde', 'Faux numéro',
      'Excuse bidon', 'Réponse en retard',
    ]),
    ...w('Festival', [
      'Bracelet', 'Pogo', 'Boue', 'Gobelet', 'Toilettes chimiques', 'Headliner', 'Tente', 'Concert', 'Sono',
    ]),
    ...w('Vacances', [
      'Auberge de jeunesse', 'Road trip', 'Airbnb', 'Coup de soleil', 'Bronzage', 'Paddle', 'Crème solaire',
      'Retard d’avion', 'Séjour au ski', 'Voyage entre potes',
    ]),
    ...w('Réseaux', [
      'Story', 'Like', 'Abonnés', 'Influenceur', 'Hashtag', 'Selfie', 'Mème', 'Message vocal', 'Capture d’écran',
      'Notification',
    ]),
    ...w('Gêne', [
      'Prénom oublié', 'Pantalon déchiré', 'Tache de vin', 'Ascenseur bondé', 'Mauvais cadeau', 'Rire nerveux',
      'Repas de famille', 'Toast raté',
    ]),
    ...w('Jeu à boire', [
      'Action ou vérité', 'Poker', 'Blind test', 'Jeu à boire', 'Loup-garou', 'Time’s up', 'Mime', 'Défi', 'Pétanque',
      'Flip cup',
    ]),
    ...w('Étudiant', [
      'Coloc', 'Soirée étudiante', 'Amphi', 'BDE', 'Révisions', 'Rattrapage', 'Pâtes au beurre', 'Cité U', 'Partiels',
      'Erasmus',
    ]),
    ...w('Look', [
      'Talons', 'Parfum', 'Paillettes', 'Chemise ouverte', 'Petite robe noire', 'Costard', 'Rouge à lèvres',
    ]),
    ...w('Musique', [
      'Reggaeton', 'Tube de l’été', 'Techno', 'Playlist', 'Remix', 'Rap', 'Zouk', 'Open air',
    ]),
    ...w('Séduction', [
      'Compliment', 'Regard', 'Verre offert', 'Numéro de téléphone', 'Texto du matin', 'Danse collée',
      'Bouquet de roses', 'Câlin', 'Bisou',
    ]),
  ],
  hot: [
    ...w('Accessoire', [
      'Menottes', 'Bandeau', 'Lingerie', 'Plume', 'Huile de massage', 'Fouet',
      'Masque de velours', 'Gants en satin', 'Bougies parfumées', 'Pétales de rose', 'Chantilly', 'Glaçon',
      'Foulard en soie', 'Éventail', 'Collier',
    ]),
    ...w('Lingerie', [
      'Porte-jarretelles', 'Nuisette', 'Bas résille', 'Guêpière', 'Body en dentelle', 'String', 'Soutien-gorge',
      'Corset', 'Peignoir', 'Dentelle', 'Escarpins', 'Jarretière',
    ]),
    ...w('Lieu', [
      'Jacuzzi', 'Cabine d’essayage', 'Banquette arrière', 'Club libertin', 'Plage nudiste', 'Chambre d’hôtel',
      'Love hotel', 'Sauna', 'Hammam', 'Spa', 'Bain moussant', 'Douche à deux', 'Lit à baldaquin', 'Suite nuptiale',
      'Motel',
    ]),
    ...w('Coquin', [
      'Strip-tease', 'Plan à trois', 'Sex friend', 'Préliminaires', 'Suçon', 'Fantasme', 'Nude',
      'Massage sensuel', 'Baiser langoureux', 'Caresse', 'Nuit torride', 'Aventure d’un soir', 'Danse sensuelle',
      'Sexto', 'Photo coquine',
    ]),
    ...w('Jeu', [
      'Strip-poker', 'Jeu de rôle', 'Dés coquins', 'Jeu de la bouteille',
      'Jamais je n’ai', 'Cartes coquines', 'Quiz coquin', 'Chaud ou froid', 'Chatouilles', 'Cache-cache coquin',
      'Chasse au trésor coquine', 'Jeu de l’oie coquin',
    ]),
    ...w('Séduction', [
      'Clin d’œil', 'Œillade', 'Séducteur', 'Charme', 'Frôlement', 'Regard appuyé', 'Sous-entendu', 'Drague',
      'Message coquin', 'Phéromones', 'Papillons', 'Mot doux', 'Déclaration', 'Tension', 'Sourire en coin',
    ]),
    ...w('Romance', [
      'Week-end en amoureux', 'Clair de lune', 'Feu de cheminée', 'Chalet', 'Tour en gondole', 'Venise',
      'Draps de soie', 'Petit-déjeuner au lit', 'Nuit étoilée', 'Sérénade', 'Roses rouges', 'Lettre d’amour',
    ]),
    ...w('Déguisement', [
      'Soubrette', 'Tenue de nurse', 'Costume de diable', 'Costume de chat', 'Tenue de cuir', 'Latex', 'Perruque',
      'Bal masqué', 'Danseuse de cabaret', 'Danseur de cabaret',
    ]),
    ...w('Soirée coquine', [
      'Soirée mousse', 'Soirée privée', 'Cabaret', 'Sex-shop', 'Enterrement de vie de jeune fille', 'Bain de minuit',
      'Pool party',
    ]),
    ...w('Corps', [
      'Nuque', 'Frisson', 'Chair de poule', 'Lèvres', 'Hanches', 'Torse nu', 'Abdos', 'Tatouage', 'Décolleté',
      'Barbe naissante',
    ]),
    ...w('Tenue sexy', [
      'Robe fendue', 'Mini-jupe', 'Dos nu', 'Chemise transparente', 'Bikini', 'Monokini', 'Cuissardes',
      'Robe moulante', 'Boxer',
    ]),
    ...w('Escapade', [
      'Topless', 'Île déserte', 'Croisière', 'Plage privée', 'Chambre avec vue', 'Escapade romantique', 'Bivouac',
      'Bungalow', 'Cabane dans les arbres', 'Villa avec piscine',
    ]),
    ...w('Gourmandise', [
      'Sex on the beach', 'Cosmopolitan', 'Fraises', 'Huîtres', 'Chocolat noir', 'Miel', 'Fruit de la passion',
    ]),
    ...w('Vocabulaire', [
      'Chaud lapin', 'Torride', 'Sensuel', 'Désir', 'Passion', 'Tentation', 'Interdit', 'Audace', 'Ardeur',
      'Émoustillé',
    ]),
    ...w('Rencontre', [
      'Speed dating', 'Match', 'Swipe', 'Photo de profil', 'Bio', 'Premier message', 'Soirée célibataires',
      'Célibataire', 'Âme sœur',
    ]),
  ],
}
