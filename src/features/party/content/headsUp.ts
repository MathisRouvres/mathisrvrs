import type { Level } from '../engine'

/** Devine-tête — mots à faire deviner au joueur qui tient le téléphone sur son front. */
export const headsUpWords: Record<Level, string[]> = {
  soft: [
    // Personnages de fiction et dessins animés
    'Mickey', 'Donald', 'Dingo', 'Simba', 'Nemo', 'Dory', 'Shrek', 'Elsa', 'Olaf', 'Mario',
    'Luigi', 'Sonic', 'Pikachu', 'Bob l’éponge', 'Astérix', 'Obélix', 'Tintin', 'Milou', 'Lucky Luke', 'Spider-Man',
    'Batman', 'Superman', 'Hulk', 'Iron Man', 'Harry Potter', 'Gandalf', 'Dark Vador', 'Yoda', 'Buzz l’Éclair', 'Woody',
    'Winnie l’ourson', 'Bambi', 'Pinocchio', 'Peter Pan', 'Cendrillon', 'Blanche-Neige', 'Raiponce', 'Aladdin', 'Mowgli', 'Baloo',
    'Le Petit Chaperon rouge', 'Le Père Noël', 'La petite souris', 'Le Chat Potté', 'Garfield', 'Snoopy', 'Titeuf', 'Tom et Jerry', 'Bugs Bunny', 'Scooby-Doo',
    'Les Schtroumpfs', 'Pac-Man', 'Lara Croft', 'Les Minions', 'Wall-E', 'Kung Fu Panda', 'Dracula', 'Cruella', 'Maléfique', 'Capitaine Crochet',
    // Animaux
    'Éléphant', 'Girafe', 'Crocodile', 'Pingouin', 'Kangourou', 'Hérisson', 'Dauphin', 'Requin', 'Perroquet', 'Escargot',
    'Tortue', 'Écureuil', 'Hibou', 'Flamant rose', 'Koala', 'Panda', 'Lama', 'Caméléon', 'Hippopotame', 'Rhinocéros',
    'Chauve-souris', 'Araignée', 'Abeille', 'Coccinelle', 'Poulpe', 'Méduse', 'Zèbre', 'Paresseux', 'Ours polaire', 'Cochon',
    // Objets du quotidien
    'Parapluie', 'Brosse à dents', 'Trampoline', 'Aspirateur', 'Micro-ondes', 'Réveil', 'Ascenseur', 'Lunettes de soleil', 'Fer à repasser', 'Tire-bouchon',
    'Grille-pain', 'Sèche-cheveux', 'Valise', 'Ballon de baudruche', 'Bougie', 'Cintre', 'Trottinette', 'Cerf-volant', 'Sac à dos', 'Télécommande',
    'Boussole', 'Loupe', 'Marteau', 'Échelle', 'Cadenas', 'Miroir', 'Balai', 'Sablier', 'Jumelles', 'Passoire',
    // Métiers et personnages
    'Pompier', 'Boulanger', 'Astronaute', 'Dentiste', 'Facteur', 'Pilote', 'Clown', 'Magicien', 'Plombier', 'Coiffeur',
    'Policier', 'Boucher', 'Photographe', 'Maître nageur', 'Archéologue', 'Détective', 'Pirate', 'Chevalier', 'Cow-boy', 'Ninja',
    'Sirène', 'Vampire', 'Fantôme', 'Sorcière', 'Dragon', 'Licorne', 'Funambule', 'Dompteur de lions', 'Père Fouettard', 'Marin',
    // Lieux et monuments
    'Tour Eiffel', 'Arc de Triomphe', 'Mont-Saint-Michel', 'Château de Versailles', 'Musée du Louvre', 'Colisée', 'Pyramides d’Égypte', 'Statue de la Liberté', 'Grande Muraille de Chine', 'Big Ben',
    'Taj Mahal', 'Disneyland', 'Pôle Nord', 'Volcan', 'Cascade', 'Plage', 'Piscine', 'Aéroport', 'Supermarché', 'Cinéma',
    'Cirque', 'Fête foraine', 'Phare', 'Igloo', 'Île déserte', 'Sacré-Cœur', 'Notre-Dame', 'Côte d’Azur', 'Pyrénées', 'Désert du Sahara',
    // Films et séries
    'Titanic', 'Le Roi Lion', 'Star Wars', 'Le Seigneur des anneaux', 'Jurassic Park', 'Avatar', 'Les Visiteurs', 'Intouchables', 'Retour vers le futur', 'Indiana Jones',
    'James Bond', 'Matrix', 'Les Simpson', 'Friends', 'Game of Thrones', 'Squid Game', 'Stranger Things', 'La Casa de Papel', 'Pirates des Caraïbes', 'Kaamelott',
    'Dragon Ball', 'Naruto', 'One Piece', 'Pokémon', 'Poudlard', 'Les Bronzés', 'Taxi', 'Ratatouille', 'Cars', 'Fast and Furious',
    // Sports
    'Football', 'Tennis', 'Rugby', 'Basket', 'Natation', 'Judo', 'Ski', 'Surf', 'Golf', 'Boxe',
    'Équitation', 'Escrime', 'Pétanque', 'Ping-pong', 'Handball', 'Cyclisme', 'Tour de France', 'Marathon', 'Plongée', 'Escalade',
    'Hockey sur glace', 'Patinage', 'Roland-Garros', 'Coupe du monde', 'Jeux olympiques', 'Penalty', 'Hors-jeu', 'Carton rouge', 'Course de relais', 'Saut en parachute',
    // Aliments
    'Pizza', 'Croissant', 'Baguette', 'Crêpe', 'Fondue', 'Raclette', 'Hamburger', 'Sushi', 'Tiramisu', 'Camembert',
    'Chocolat chaud', 'Barbe à papa', 'Pop-corn', 'Frites', 'Nutella', 'Choucroute', 'Kebab', 'Tacos', 'Paella', 'Couscous',
    'Gaufre', 'Madeleine', 'Macaron', 'Éclair au chocolat', 'Tarte Tatin', 'Pastèque', 'Ananas', 'Artichaut', 'Escargots de Bourgogne', 'Cuisses de grenouille',
    // Personnalités mondialement connues
    'Zinedine Zidane', 'Kylian Mbappé', 'Lionel Messi', 'Cristiano Ronaldo', 'Napoléon', 'Albert Einstein', 'Léonard de Vinci', 'Cléopâtre', 'Michael Jackson', 'Charlie Chaplin',
    'Mozart', 'Pablo Picasso', 'Marilyn Monroe', 'Elvis Presley', 'Mohamed Ali', 'Usain Bolt', 'Rafael Nadal', 'Jeanne d’Arc', 'Louis XIV', 'Charles de Gaulle',
    'Christophe Colomb', 'Marie Curie', 'Coco Chanel', 'Michael Jordan',
  ],
  spicy: [
    // Alcool et cocktails
    'Mojito', 'Spritz', 'Piña colada', 'Margarita', 'Caïpirinha', 'Sex on the Beach', 'Gin tonic', 'Vodka Red Bull', 'Rhum coca', 'Tequila sunrise',
    'Bloody Mary', 'Cosmopolitan', 'Moscow Mule', 'Long Island', 'Daiquiri', 'Whisky coca', 'Ricard', 'Shot de tequila', 'Cul sec', 'Pinte de bière',
    'Jägermeister', 'Bouteille de rosé', 'Sangria', 'Limoncello', 'Punch', 'Vin chaud', 'Gueule de bois', 'Lendemain de soirée', 'Trou noir', 'Cuite',
    'Tournée générale', 'Open bar', 'Happy hour', 'Barman', 'Shaker', 'Verre de trop', 'Paille en papier', 'Glaçons', 'Planche apéro', 'Apéro',
    // Soirées et sorties
    'Pré-soirée', 'Afterwork', 'Soirée mousse', 'Soirée étudiante', 'Soirée déguisée', 'Beer-pong', 'Karaoké', 'Piste de danse', 'Videur', 'Boîte de nuit',
    'Carte VIP', 'Vestiaire', 'Dernier métro', 'Kebab de 3 h du matin', 'Slow', 'Soirée pyjama', 'Rooftop', 'Terrasse', 'Bar à chicha', 'Pub irlandais',
    'DJ', 'Platines', 'Files d’attente', 'Pot de départ', 'Crémaillère', 'Fiesta', 'Bain de minuit', 'Danse du canard', 'Soirée casino', 'Quiz de bar',
    // Drague et couple
    'Tinder', 'Swipe à droite', 'Match', 'Rencard', 'Premier rendez-vous', 'Poser un lapin', 'Ghosting', 'Râteau', 'Drague lourde', 'Phrase d’accroche',
    'Cœur brisé', 'Crush', 'Friendzone', 'Flirt de vacances', 'Premier baiser', 'Roulage de pelle', 'Déclaration d’amour', 'Demande en mariage', 'Saint-Valentin', 'Dîner aux chandelles',
    'Bouquet de roses', 'Lune de miel', 'Enterrement de vie de garçon', 'EVJF', 'Mariage', 'Témoin de mariage', 'Fiançailles', 'Colocation', 'Dispute de couple', 'Réconciliation',
    'Jalousie', 'Prendre un râteau', 'Se mettre en couple', 'Rupture par SMS', 'Ex jaloux', 'Belle-mère', 'Présenter ses parents', 'Dîner en tête-à-tête', 'Slow sous la lune', 'Mots doux',
    // Réseaux et applis
    'Story Instagram', 'Like', 'Abonnés', 'Influenceur', 'Selfie', 'Snap', 'Streak', 'Message vu', 'Message vocal', 'Hashtag',
    'Bio Instagram', 'Photo de profil', 'Photo floue', 'Live TikTok', 'Filtre chien', 'Notification', 'Capture d’écran', 'Group chat', 'Stalker un ex', 'Pouce bleu',
    // Festivals et vacances
    'Festival de musique', 'Camping', 'Tente qui fuit', 'Tongs', 'Crème solaire', 'Coup de soleil', 'Bikini', 'Maillot de bain', 'Marque de bronzage', 'Club de plage',
    'Croisière', 'All inclusive', 'Auberge de jeunesse', 'Road trip', 'Interrail', 'Camping-car', 'Valise trop lourde', 'Retard d’avion', 'Bagage perdu', 'Ibiza',
    'Mykonos', 'Saint-Tropez', 'Feu de camp', 'Guitare sur la plage', 'Barbecue', 'Mur de son', 'Bracelet de festival', 'Boue de festival', 'Toilettes de festival', 'Coachella',
    // Situations gênantes
    'Se tromper de prénom', 'Tomber en public', 'Message envoyé au mauvais destinataire', 'Pantalon déchiré', 'Fou rire', 'Hoquet', 'Trou de mémoire', 'Oublier un anniversaire', 'Se faire griller', 'Gaffe',
    'Rougir', 'Se faire plaquer', 'Ronfler', 'Parler dans son sommeil', 'Somnambule', 'Photo gênante', 'Tomber de sa chaise', 'Mensonge', 'Fou rire nerveux', 'Crise de jalousie',
    'Chanter faux', 'Mauvais cadeau', 'Silence gênant', 'Odeur de transpiration', 'Mettre un vent', 'Se faire surprendre', 'Zip ouvert', 'Dent coincée', 'Bruit de ventre', 'Mauvaise haleine',
    // Téléréalité
    'Téléréalité', 'Confessionnal', 'Villa', 'Clash', 'Candidat', 'Éliminé', 'Nomination', 'Immunité', 'Coup de théâtre', 'Triangle amoureux',
    'Casting', 'Tournage', 'Cérémonie des roses', 'Sauveur de l’épisode', 'Quarantaine en villa', 'Bande-annonce choc', 'Larmes devant caméra', 'Voix off dramatique', 'Prime time', 'Spoiler',
    // Expressions de jeunes
    'Wesh', 'Kiffer', 'Cringe', 'Flex', 'Swag', 'Askip', 'Vénère', 'Zbeul', 'Daron', 'Meuf',
    'Mdr', 'Ça passe crème', 'Être à la masse', 'Se la raconter', 'Galère', 'Seum', 'Chelou', 'Relou', 'Au taquet', 'Se prendre un vent',
  ],
  hot: [
    // Lingerie et tenues
    'Dentelle', 'Porte-jarretelles', 'Bas résille', 'String', 'Nuisette', 'Guêpière', 'Corset', 'Body en dentelle', 'Talons aiguilles', 'Soutien-gorge push-up',
    'Peignoir en soie', 'Déshabillé', 'Jarretières', 'Culotte en satin', 'Pyjama sexy', 'Tenue d’infirmière', 'Costume de soubrette', 'Déguisement coquin', 'Masque de loup', 'Loup vénitien',
    'Robe fendue', 'Dos nu', 'Mini-jupe', 'Chemise ouverte', 'Torse nu', 'Décolleté plongeant', 'Tenue moulante', 'Robe de soirée', 'Nœud papillon défait', 'Cravate dénouée',
    // Accessoires
    'Menottes en fourrure', 'Bandeau sur les yeux', 'Plume', 'Foulard en soie', 'Huile de massage', 'Bougies parfumées', 'Pétales de rose', 'Chocolat fondu', 'Crème chantilly', 'Fraises à la crème',
    'Glaçon', 'Sex-shop', 'Jeu de cartes coquin', 'Dés coquins', 'Lubrifiant', 'Préservatif', 'Bain moussant', 'Savon sensuel', 'Rouge à lèvres', 'Gloss',
    'Parfum envoûtant', 'Draps en satin', 'Lit à baldaquin', 'Miroir au plafond', 'Lit king size', 'Oreiller', 'Matelas', 'Couette', 'Lit défait', 'Draps froissés',
    // Lieux
    'Jacuzzi', 'Sauna', 'Hammam', 'Chambre d’hôtel', 'Suite nuptiale', 'Love hôtel', 'Banquette arrière', 'Cabine d’essayage', 'Douche à deux', 'Plage de nuit',
    'Cabaret', 'Moulin Rouge', 'Club libertin', 'Soirée privée', 'Boudoir', 'Alcôve', 'Chalet isolé', 'Grange', 'Ascenseur bloqué', 'Balcon de nuit',
    'Salle de bain', 'Cuisine à minuit', 'Piscine de nuit', 'Bain à remous', 'Spa privatisé', 'Cabine de bateau', 'Hamac', 'Tente de camping', 'Voiture garée', 'Parking désert',
    // Pratiques suggestives et séduction
    'Strip-tease', 'Lap dance', 'Danse sensuelle', 'Pole dance', 'Effeuillage', 'Massage sensuel', 'Jeu de rôle', 'Séance photo sexy', 'Nuit torride', 'Sieste coquine',
    'Réveil câlin', 'Petit-déjeuner au lit', 'Week-end romantique', 'Escapade coquine', 'Weekend en amoureux', 'Coup de foudre', 'Regard de braise', 'Clin d’œil', 'Sourire en coin', 'Voix suave',
    'Chuchoter à l’oreille', 'Frisson', 'Papillons dans le ventre', 'Baiser langoureux', 'Bisou dans le cou', 'Préliminaires', 'Suçon', 'Câlins sous la couette', 'Strip-poker', 'Jeu de la bouteille',
    'Bisou volé', 'Slow collé-serré', 'Danse collée', 'Rendez-vous galant', 'Nuit de noces', 'Nuit d’amour', 'Soirée en amoureux', 'Fantasme', 'Aphrodisiaque', 'Huîtres aphrodisiaques',
    // Univers de la séduction
    'Amant', 'Maîtresse', 'Liaison secrète', 'Pin-up', 'Burlesque', 'Charme', 'Sex-appeal', 'Tatouage', 'Piercing', 'Abdos',
    'Tablette de chocolat', 'Beau gosse', 'Canon', 'Bombe', 'Séducteur', 'Don Juan', 'Tombeur', 'Femme fatale', 'Play-boy', 'Mauvais garçon',
    'Cougar', 'Sugar daddy', 'Romantique', 'Sensuel', 'Coquin', 'Provocant', 'Lascif', 'Torride', 'Chaud bouillant', 'Taquin',
    'Messages coquins', 'Photo sexy', 'Petit nom doux', 'Chatouilles', 'Mordiller l’oreille', 'Caresse', 'Câlin prolongé', 'Danse lascive', 'Chambre à part', 'Lumières tamisées',
  ],
}
