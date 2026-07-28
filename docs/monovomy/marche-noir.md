# MonoVomy — Le Marché Noir (livré)

Case du plateau où l'on achète des **cartes**, en argent **ou** en gorgées.
Remplace le système de jetons imaginé dans [piment-specs.md](./piment-specs.md) § 2 :
le jeu n'a qu'une seule notion d'objet, la carte.

## La case

- Type de case à part entière : `kind: 'market'` (`content/schema.ts`), avec son
  visuel, son libellé et sa couleur propres sur le plateau 3D.
- Position **17** du plateau Soirée, identifiant `marche_noir`.
  Le plateau reste à 40 cases (contrainte du schéma et de la géométrie 3D) :
  la case a pris la place d'une des six « Carte Action », il en reste cinq.
- Atterrir dessus ouvre la phase de repos **`awaiting_market`** et le panneau d'achat.
  Rien n'est imposé : on peut repartir les mains vides.

## Le stock

- **3 cartes** en vente, tirées dans un catalogue de 9.
- Re-tiré **à chaque visite** et **après chaque achat** : les emplacements sont
  toujours pleins, personne ne peut compter sur la même offre deux fois.
- Tirage déterministe sur un **flux PRNG dédié** (`seed:market:<n>`). Le marché ne
  consomme jamais `rngState` : la séquence des dés n'est pas décalée, le rejeu
  d'une partie reste identique et l'équité d'ordre n'est pas touchée.

## Payer en argent ou au foie

Taux de la maison : **1 gorgée = 50 €** (`SIPS_TO_CASH`). Le prix en gorgées de
chaque carte en dérive. Le joueur fauché reste dans la course — c'est tout
l'intérêt de la case.

| Carte | Prix | Effet | Quand |
|---|---|---|---|
| 🛡️ **Bouclier** | 150 € / 3 gorgées | Annule les gorgées de la prochaine sanction qui te vise | À tout moment |
| 🪞 **Miroir** | 300 € / 6 gorgées | Renvoie une sanction à son auteur, doublée | En réaction |
| 🤏 **Pickpocket** | 300 € / 6 gorgées | Vole une carte au hasard à un joueur | À tout moment |
| 🤐 **Bâillon** | 100 € / 2 gorgées | La cible ne parle plus jusqu'à son tour, 1 gorgée par mot (5 max) | À tout moment |
| 🎲 **Dé Truqué** | 300 € / 6 gorgées | Deux lancers, le plus haut total est retenu | Avant ton lancer |
| 🎫 **Passe-Droit** | 250 € / 5 gorgées | Annule le loyer que tu viens de payer (argent + gorgée) | Après un loyer |
| ✍️ **Procuration** | 200 € / 4 gorgées | Un joueur boit à ta place, 4 gorgées max, sans pouvoir refuser | En réaction |
| 🍻 **Tournée Forcée** | 200 € / 4 gorgées | Toute la table boit une gorgée, toi compris | À tout moment |
| 🗝️ **Clé de Cuve** | 150 € / 3 gorgées | Sortie de prison gratuite, quand tu veux | À tout moment |

## Règles d'inventaire

- **3 cartes maximum** par joueur (`MARKET_MAX_CARDS`). Inventaire plein : on ne
  peut plus acheter, seulement jouer ou passer.
- Cartes **visibles de tous** : aucune information cachée, la menace fait partie du jeu.
- Jouables **à tout moment**, y compris hors de son tour — canal parallèle côté
  moteur, comme les échanges : la machine à états du tour n'est jamais bloquée.
- Deux exceptions de timing, contrôlées par le moteur : le **Dé Truqué** ne se joue
  qu'avant son propre lancer, le **Passe-Droit** que sur un loyer du tour courant.

## Ce que le moteur applique, ce qu'il annonce

**Effets mécaniques** — le moteur change l'état lui-même :
Bouclier (les gorgées de la sanction tombent à 0), Pickpocket (vol réel d'une
carte), Dé Truqué (double lancer), Passe-Droit (remboursement du loyer au payeur,
débit du propriétaire), Clé de Cuve (jeton de sortie).

**Effets déclaratifs** — Miroir, Bâillon, Procuration, Tournée : le jeu consomme la
carte et **annonce publiquement** à la table (toast + journal), qui applique. C'est
la règle de tout le contenu « gorgées » du projet : le jeu n'impose jamais de boire.

Un joueur en mode soft voit et exécute la **variante soft** de chaque carte —
il n'est jamais exclu d'une mécanique.

## Où c'est implémenté

| Fichier | Rôle |
|---|---|
| `content/market.ts` | Catalogue des 9 cartes (data-driven) |
| `content/schema.ts` | `marketCardSchema`, `kind: 'market'`, effets et timings |
| `content/board.soiree.ts` | La case, position 17 |
| `engine/market.ts` | Achat, usage, stock, vol, bouclier |
| `engine/turn.ts` | Résolution de la case, bouclier sur loyer/taxe/carte, dé truqué, mémorisation du dernier loyer |
| `engine/constants.ts` | `SIPS_TO_CASH`, `MARKET_MAX_CARDS`, `MARKET_STOCK_SIZE` |
| `engine/stateMachine.ts` | Phase `awaiting_market`, intentions autorisées |
| `net/protocol.ts` · `net/hostReducer.ts` | Intentions `marketBuy` / `marketUse` (hôte autoritaire) |
| `net/autoplay.ts` | Joueur inactif : quitte le marché sans acheter |
| `components/MvMarket.jsx` | Panneau d'achat |
| `components/MvCards.jsx` | Main de cartes et choix de cible |
| `engine/market.test.ts` | 32 tests : contenu, stock, achat, plafond, effets, rétrocompatibilité |

## Échanges

Les cartes s'échangent comme n'importe quel actif (`TradeBundle.cards`), avec les
doublons gérés exemplaire par exemplaire. Le plafond de 3 cartes est vérifié **à
l'acceptation**, des deux côtés : un deal qui ferait déborder une main est refusé
(`inventory_full`). Une carte vaut son prix d'achat dans l'estimation d'équilibre.
Détail du nouveau flux : [negociation.md](./negociation.md).

## Compatibilité

Tous les champs ajoutés (`market`, `lastRent`, `marketLog`, `marketSeq`,
`marketDraws`, `player.marketCards`, `shielded`, `loadedDie`) sont **optionnels** :
un snapshot antérieur se restaure sans migration. Un test le vérifie explicitement.

## Reste à décider

- Le plafond global de gorgées par tour (§ 11 de piment-specs.md) n'existe pas
  encore. Tant qu'il n'est pas là, rien n'empêche d'empiler Tournée + Miroir +
  Procuration sur un même joueur en un tour.
- Le Bâillon et la Procuration n'ont pas de compteur automatique : le jeu affiche
  l'état, la table arbitre.
