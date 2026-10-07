import type { Level } from '../engine'

export interface Suspect {
  name: string
  emoji: string
  /** Pays auquel on associe la personnalité. */
  flag: string
  /** Décédé à la rédaction (2026). */
  dead?: boolean
  /** Condamné au moins une fois par la justice. */
  convicted?: boolean
  /** Le casier, en une phrase d'humour noir. */
  record: string
}

/**
 * Qui est-ce ? version casier judiciaire. Les fiches s'en tiennent à des faits
 * publics établis : pour les vivants, uniquement des condamnations, des aveux
 * ou des faits incontestés, jamais de simples accusations.
 * Soft : escrocs et vauriens célèbres, Épicé : dictateurs, terroristes et
 * parrains, Hot : le pire de l'humour noir.
 */
export const suspects: Record<Level, Suspect[]> = {
  soft: [
    { name: 'Al Capone', emoji: '🎩', flag: '🇺🇸', dead: true, convicted: true, record: 'Roi de la pègre de Chicago, tombé pour… sa déclaration d’impôts.' },
    { name: 'Raspoutine', emoji: '🧔', flag: '🇷🇺', dead: true, record: 'Empoisonné, abattu, jeté dans la Neva : il a fallu insister.' },
    { name: 'Bernard Madoff', emoji: '💸', flag: '🇺🇸', dead: true, convicted: true, record: 'A fait disparaître des dizaines de milliards. Pyramide de Ponzi, 150 ans de prison.' },
    { name: 'Jérôme Kerviel', emoji: '📉', flag: '🇫🇷', convicted: true, record: 'A fait perdre 4,9 milliards à la Société Générale. Trader du mois.' },
    { name: 'Jérôme Cahuzac', emoji: '🧾', flag: '🇫🇷', convicted: true, record: 'Ministre du Budget chargé de traquer la fraude fiscale. Compte caché en Suisse.' },
    { name: 'Bernard Tapie', emoji: '⚽', flag: '🇫🇷', dead: true, convicted: true, record: 'Champion d’Europe avec l’OM, puis prison pour le match truqué VA-OM.' },
    { name: 'Lance Armstrong', emoji: '🚴', flag: '🇺🇸', record: 'Sept Tours de France gagnés, sept Tours de France rendus.' },
    { name: 'Elizabeth Holmes', emoji: '🩸', flag: '🇺🇸', convicted: true, record: 'Promettait des analyses avec une goutte de sang. Il restait surtout la fraude.' },
    { name: 'Sam Bankman-Fried', emoji: '🪙', flag: '🇺🇸', convicted: true, record: 'Prodige de la crypto, a confondu l’argent des clients avec le sien. 25 ans.' },
    { name: 'Martin Shkreli', emoji: '💊', flag: '🇺🇸', convicted: true, record: 'A multiplié par plus de 50 le prix d’un médicament. Condamné pour fraude, pas pour ça.' },
    { name: 'Carlos Ghosn', emoji: '🎸', flag: '🇫🇷', record: 'Ex-patron de Renault, évadé du Japon caché dans une caisse de matériel audio.' },
    { name: 'Jacques Mesrine', emoji: '🥸', flag: '🇫🇷', dead: true, convicted: true, record: 'Ennemi public n° 1, roi de l’évasion et des déguisements.' },
    { name: 'Bonnie Parker', emoji: '💋', flag: '🇺🇸', dead: true, record: 'Braqueuse et poétesse, en cavale avec Clyde jusqu’à la dernière rafale.' },
    { name: 'Clyde Barrow', emoji: '🚗', flag: '🇺🇸', dead: true, convicted: true, record: 'Braquait des banques, mais surtout des stations-service et des épiceries.' },
    { name: 'Barbe Noire', emoji: '🏴‍☠️', flag: '🇬🇧', dead: true, record: 'Pirate qui glissait des mèches allumées dans sa barbe pour faire peur.' },
    { name: 'Néron', emoji: '🔥', flag: '🇮🇹', dead: true, record: 'Accusé d’avoir joué de la lyre pendant que Rome brûlait.' },
    { name: 'Caligula', emoji: '🐎', flag: '🇮🇹', dead: true, record: 'Aurait voulu nommer son cheval consul. Le Sénat a apprécié.' },
    { name: 'Marie-Antoinette', emoji: '🍰', flag: '🇫🇷', dead: true, convicted: true, record: 'N’a jamais parlé de brioche. A quand même perdu la tête.' },
    { name: 'Henri VIII', emoji: '💍', flag: '🇬🇧', dead: true, record: 'Six épouses, dont deux répudiées et deux décapitées. Le mariage, version sport extrême.' },
    { name: 'Vlad l’Empaleur', emoji: '🧛', flag: '🇷🇴', dead: true, record: 'A inspiré Dracula. Le surnom résume sa politique étrangère.' },
    { name: 'Charles Ponzi', emoji: '🔺', flag: '🇮🇹', dead: true, convicted: true, record: 'A donné son nom à l’arnaque. Plus célèbre qu’un prix Nobel.' },
    { name: 'Christophe Rocancourt', emoji: '🎭', flag: '🇫🇷', convicted: true, record: 'Faux Rockefeller, vrais pigeons à Hollywood.' },
    { name: 'Diego Maradona', emoji: '✋', flag: '🇦🇷', dead: true, record: 'Le but de la « main de Dieu » : tricheur, mais avec talent.' },
    { name: 'Ben Johnson', emoji: '🏃', flag: '🇨🇦', record: '9 s 79 à Séoul en 1988, médaille d’or rendue trois jours plus tard.' },
    { name: 'Tonya Harding', emoji: '⛸️', flag: '🇺🇸', convicted: true, record: 'Une rivale frappée au genou, une carrière qui finit à terre.' },
    { name: 'Patrick Balkany', emoji: '🏝️', flag: '🇫🇷', convicted: true, record: 'Fraude fiscale, prison à 72 ans, puis bracelet électronique.' },
    { name: 'Isabelle Balkany', emoji: '👜', flag: '🇫🇷', convicted: true, record: 'Associée au mari, au paradis fiscal et au tribunal.' },
    { name: 'Nicolas Sarkozy', emoji: '📿', flag: '🇫🇷', convicted: true, record: 'Premier ancien président de la Ve République à porter le bracelet électronique.' },
    { name: 'Mata Hari', emoji: '💃', flag: '🇳🇱', dead: true, convicted: true, record: 'Danseuse exotique, espionne, fusillée en 1917.' },
    { name: 'Lucky Luciano', emoji: '🍀', flag: '🇮🇹', dead: true, convicted: true, record: 'A organisé le crime en syndicat, avec sa commission, comme une vraie entreprise.' },
    { name: 'Jordan Belfort', emoji: '🐺', flag: '🇺🇸', convicted: true, record: 'Le vrai loup de Wall Street : 22 mois de prison et un film avec DiCaprio.' },
  ],
  spicy: [
    { name: 'Oussama Ben Laden', emoji: '🕳️', flag: '🇸🇦', dead: true, record: 'Cherché dix ans dans les grottes, retrouvé dans une villa au Pakistan.' },
    { name: 'Joseph Staline', emoji: '🥶', flag: '🇷🇺', dead: true, record: 'Moustache iconique, goulag XXL, photos retouchées bien avant Photoshop.' },
    { name: 'Saddam Hussein', emoji: '🪤', flag: '🇮🇶', dead: true, convicted: true, record: 'Des palais à la pelle, retrouvé caché dans un trou près d’une ferme.' },
    { name: 'Mouammar Kadhafi', emoji: '⛺', flag: '🇱🇾', dead: true, record: 'A planté sa tente bédouine en plein Paris, à deux pas de l’Élysée.' },
    { name: 'Kim Jong-un', emoji: '🚀', flag: '🇰🇵', record: 'Lance des missiles comme d’autres des feux d’artifice. Coiffeur sous pression.' },
    { name: 'Kim Jong-il', emoji: '⛳', flag: '🇰🇵', dead: true, record: 'Selon la propagande, onze trous en un dès sa première partie de golf.' },
    { name: 'Vladimir Poutine', emoji: '🐻', flag: '🇷🇺', record: 'Torse nu à cheval, mandat d’arrêt de la Cour pénale internationale.' },
    { name: 'Bachar al-Assad', emoji: '👁️', flag: '🇸🇾', record: 'Ophtalmologue de formation, aveugle à tout le reste. Fuite express à Moscou en 2024.' },
    { name: 'Benito Mussolini', emoji: '🚂', flag: '🇮🇹', dead: true, record: 'Les trains arrivaient à l’heure. Lui a fini pendu par les pieds.' },
    { name: 'Francisco Franco', emoji: '🪖', flag: '🇪🇸', dead: true, record: 'Trente-six ans de dictature, mort tranquillement dans son lit.' },
    { name: 'Augusto Pinochet', emoji: '🕶️', flag: '🇨🇱', dead: true, record: 'Coup d’État, disparus par milliers et comptes secrets à l’étranger.' },
    { name: 'Idi Amin Dada', emoji: '🎖️', flag: '🇺🇬', dead: true, record: 'S’était proclamé « dernier roi d’Écosse ». Rien que ça.' },
    { name: 'Pol Pot', emoji: '🌾', flag: '🇰🇭', dead: true, record: 'Ancien professeur, a vidé les villes et fermé toutes les écoles.' },
    { name: 'Nicolae Ceaușescu', emoji: '🏛️', flag: '🇷🇴', dead: true, convicted: true, record: 'Un palais démesuré, un procès express un jour de Noël.' },
    { name: 'Mao Zedong', emoji: '📕', flag: '🇨🇳', dead: true, record: 'Petit Livre rouge et Grand Bond en avant… droit dans le mur.' },
    { name: 'Pablo Escobar', emoji: '🦛', flag: '🇨🇴', dead: true, record: 'Narco le plus riche du monde, zoo d’hippopotames inclus.' },
    { name: 'El Chapo', emoji: '🚿', flag: '🇲🇽', convicted: true, record: 'Évadé par un tunnel creusé sous sa douche. Perpétuité aux États-Unis.' },
    { name: 'Carlos le Chacal', emoji: '🦊', flag: '🇻🇪', convicted: true, record: 'Terroriste vedette des années 70, perpétuité en France.' },
    { name: 'Robert Mugabe', emoji: '👴', flag: '🇿🇼', dead: true, record: 'Encore président à 93 ans, renversé par un coup d’État « en douceur ».' },
    { name: 'Jean-Bedel Bokassa', emoji: '💎', flag: '🇨🇫', dead: true, convicted: true, record: 'Sacré empereur avec une couronne en diamants, en offrait aussi aux amis.' },
    { name: 'Manuel Noriega', emoji: '🔊', flag: '🇵🇦', dead: true, convicted: true, record: 'Délogé par l’armée américaine à coups de hard rock à plein volume.' },
    { name: 'Abou Bakr al-Baghdadi', emoji: '🏴', flag: '🇮🇶', dead: true, record: 'Calife autoproclamé, fin de règne au fond d’un tunnel.' },
    { name: 'Zine el-Abidine Ben Ali', emoji: '✈️', flag: '🇹🇳', dead: true, convicted: true, record: '23 ans au pouvoir, chassé en un mois par le Printemps arabe.' },
    { name: 'Silvio Berlusconi', emoji: '🥂', flag: '🇮🇹', dead: true, convicted: true, record: 'Soirées « bunga-bunga », fraude fiscale et quatre fois chef du gouvernement.' },
    { name: 'Fidel Castro', emoji: '🚬', flag: '🇨🇺', dead: true, record: 'Selon La Havane, plus de 600 tentatives d’assassinat, cigares piégés compris.' },
    { name: 'Che Guevara', emoji: '👕', flag: '🇦🇷', dead: true, record: 'Révolutionnaire devenu motif de t-shirt. Le capitalisme a gagné.' },
    { name: 'Alexandre Loukachenko', emoji: '🥔', flag: '🇧🇾', record: 'Réélu à chaque fois avec plus de 80 % des voix. Quelle surprise.' },
    { name: 'John Gotti', emoji: '🍝', flag: '🇺🇸', dead: true, convicted: true, record: 'Le « parrain en téflon » : rien ne collait… jusqu’à la perpétuité.' },
    { name: 'Totò Riina', emoji: '🍋', flag: '🇮🇹', dead: true, convicted: true, record: 'Le « chef des chefs » de la Mafia, 24 ans de cavale en Sicile.' },
    { name: 'Erich Honecker', emoji: '🧱', flag: '🇩🇪', dead: true, record: 'A gardé un mur debout pour le bien de tous, évidemment.' },
    { name: 'Donald Trump', emoji: '🍊', flag: '🇺🇸', convicted: true, record: 'Premier président américain condamné au pénal, sur 34 chefs d’accusation.' },
  ],
  hot: [
    { name: 'Adolf Hitler', emoji: '🎨', flag: '🇩🇪', dead: true, convicted: true, record: 'Recalé deux fois aux Beaux-Arts de Vienne. On aurait dû le prendre.' },
    { name: 'Jeffrey Epstein', emoji: '🏝️', flag: '🇺🇸', dead: true, convicted: true, record: 'Île privée, carnet d’adresses en or et caméras en panne la nuit de sa mort.' },
    { name: 'Ghislaine Maxwell', emoji: '📒', flag: '🇬🇧', convicted: true, record: 'Bras droit d’Epstein, 20 ans de prison pour trafic sexuel de mineures.' },
    { name: 'Harvey Weinstein', emoji: '🎬', flag: '🇺🇸', convicted: true, record: 'Producteur oscarisé, détonateur de #MeToo, condamné pour viol.' },
    { name: 'R. Kelly', emoji: '🕊️', flag: '🇺🇸', convicted: true, record: '« I Believe I Can Fly » : finalement non. 30 ans de prison.' },
    { name: 'Sean « Diddy » Combs', emoji: '🧴', flag: '🇺🇸', convicted: true, record: 'Roi du hip-hop, 50 mois de prison en 2025 pour transport à des fins de prostitution.' },
    { name: 'Charles Manson', emoji: '🪕', flag: '🇺🇸', dead: true, convicted: true, record: 'Musicien raté devenu gourou, a fait tuer par ses disciples.' },
    { name: 'Ted Bundy', emoji: '⚖️', flag: '🇺🇸', dead: true, convicted: true, record: 'Étudiant en droit, s’est défendu lui-même au procès. Très mauvais avocat.' },
    { name: 'Jeffrey Dahmer', emoji: '🧊', flag: '🇺🇸', dead: true, convicted: true, record: 'Le frigo le plus inquiétant de Milwaukee.' },
    { name: 'Anders Breivik', emoji: '🎮', flag: '🇳🇴', convicted: true, record: 'Auteur du massacre d’Utøya, a porté plainte en prison… pour sa console de jeux.' },
    { name: 'Ted Kaczynski', emoji: '📦', flag: '🇺🇸', dead: true, convicted: true, record: 'Génie des maths, cabane au fond des bois, colis piégés par la poste.' },
    { name: 'Henri Désiré Landru', emoji: '💌', flag: '🇫🇷', dead: true, convicted: true, record: 'Petites annonces matrimoniales, fiancées disparues, cuisinière très utilisée.' },
    { name: 'Marcel Petiot', emoji: '🩺', flag: '🇫🇷', dead: true, convicted: true, record: 'Médecin sous l’Occupation, faux passeur vers l’Argentine, vrai tueur en série.' },
    { name: 'Josef Mengele', emoji: '💉', flag: '🇩🇪', dead: true, record: 'L’« ange de la mort » d’Auschwitz, noyé à la plage au Brésil sans jamais être jugé.' },
    { name: 'Heinrich Himmler', emoji: '🐔', flag: '🇩🇪', dead: true, record: 'Éleveur de poulets devenu chef de la SS. Cyanure à l’arrestation.' },
    { name: 'Joseph Goebbels', emoji: '📢', flag: '🇩🇪', dead: true, record: 'Ministre de la Propagande : les fake news avant Internet.' },
    { name: 'Jim Jones', emoji: '🥤', flag: '🇺🇸', dead: true, record: 'Gourou du Temple du Peuple. Le punch qu’il servait, personne n’en a redemandé.' },
    { name: 'Shoko Asahara', emoji: '☣️', flag: '🇯🇵', dead: true, convicted: true, record: 'Gourou de la secte Aum, gaz sarin dans le métro de Tokyo.' },
    { name: 'Andreï Tchikatilo', emoji: '🌲', flag: '🇷🇺', dead: true, convicted: true, record: 'L’« ogre de Rostov », plus de 50 victimes, fusillé en 1994.' },
    { name: 'Élisabeth Báthory', emoji: '🛁', flag: '🇭🇺', dead: true, record: 'Comtesse soupçonnée de bains de sang de jeunes filles. Routine beauté discutable.' },
    { name: 'O. J. Simpson', emoji: '🧤', flag: '🇺🇸', dead: true, convicted: true, record: 'Acquitté du double meurtre, a écrit « If I Did It », puis prison pour vol à main armée.' },
    { name: 'Oscar Pistorius', emoji: '🚪', flag: '🇿🇦', convicted: true, record: 'Champion paralympique, a tiré à travers la porte des toilettes sur sa compagne.' },
    { name: 'Bertrand Cantat', emoji: '🎤', flag: '🇫🇷', convicted: true, record: 'Chanteur de Noir Désir, condamné pour avoir tué sa compagne, Marie Trintignant.' },
    { name: 'Guy Georges', emoji: '🌃', flag: '🇫🇷', convicted: true, record: 'Le « tueur de l’Est parisien », condamné à perpétuité.' },
    { name: 'Jean-Claude Romand', emoji: '🥼', flag: '🇫🇷', convicted: true, record: 'Faux médecin de l’OMS pendant 18 ans, a tué sa famille quand le mensonge a craqué.' },
    { name: 'Roman Polanski', emoji: '🎥', flag: '🇵🇱', convicted: true, record: 'Oscarisé, en fuite de la justice américaine depuis 1978.' },
    { name: 'Chris Brown', emoji: '👊', flag: '🇺🇸', convicted: true, record: 'Chanteur à succès, condamné pour avoir frappé Rihanna en 2009.' },
    { name: 'Mike Tyson', emoji: '👂', flag: '🇺🇸', convicted: true, record: 'Trois ans de prison pour viol, puis a mordu l’oreille d’Holyfield.' },
    { name: 'Phil Spector', emoji: '🎚️', flag: '🇺🇸', dead: true, convicted: true, record: 'Génie du « Wall of Sound », mort en prison pour meurtre.' },
    { name: 'Lizzie Borden', emoji: '🪓', flag: '🇺🇸', dead: true, record: 'Acquittée, mais la comptine lui compte quarante coups de hache.' },
    { name: 'Aileen Wuornos', emoji: '🛣️', flag: '🇺🇸', dead: true, convicted: true, record: 'Tueuse en série des autoroutes de Floride, exécutée en 2002.' },
  ],
}
