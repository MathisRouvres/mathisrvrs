# MonoVomy — Pack « Piment » (sortir des rails du Monopoly)

Objectif : casser les faiblesses du Monopoly classique (temps mort hors-tour, élimination
frustrante, fin qui traîne, économie 100 % argent) en faisant de l'alcool une **vraie monnaie
et un vrai levier tactique**, pas une simple décoration sur les cases.

> Réservoir d'idées beaucoup plus large : [piment-catalogue.md](./piment-catalogue.md) (volume 2, ~130 entrées).

Chaque mécanique ci-dessous est classée par **coût d'implémentation** dans l'archi actuelle :

- **D** = data-only (`content/*.ts`, aucun changement moteur)
- **E+** = moteur additif (champ optionnel dans `GameState` / `PlayerState`, rétrocompatible snapshots)
- **E++** = moteur structurant (nouvelle phase, nouveau `SpaceOutcome`, protocole réseau)

Règle non négociable : **toute sanction a une variante soft** (`softVariant` / deck `engine/soft.ts`),
et les garde-fous `engine/moderation.ts` (hydratation, série de sanctions) s'appliquent aux
nouveaux compteurs.

---

## 0. Correctif prioritaire — les gorgées ne montent pas avec les bâtiments

`engine/turn.ts` renvoie `sips: space.sipTier` quel que soit le niveau construit.
Le GDD §5 prévoit terrain nu = 1 gorgée, maisons = 2, hôtel = cul sec. Aujourd'hui un
Boulevard de la Bière avec hôtel fait boire pareil qu'un terrain nu.

**Fix (D + micro-E)** : `sipsForRent(space, level) = sipTier + palier(level)`, cul sec au niveau max.
C'est le plus gros gain de piment pour le plus petit diff.

---

## 1. Idées de l'utilisateur, formalisées

### 1.1 Dé des gorgées (3ᵉ dé) — **E+**
Un dé supplémentaire lancé avec les deux autres, qui **module toutes les sanctions du tour**.

| Face | Effet |
|---|---|
| 🚱 | Tour sec : aucune gorgée ce tour |
| 1 | +1 gorgée sur l'événement du tour |
| 2 | ×2 sur l'événement du tour |
| 🎁 | Tu distribues les gorgées du tour |
| 🔁 | Le joueur à ta gauche boit à ta place |
| 💀 | Cul sec si tu atterris sur une case sanction |

Implé : `DiceRoll` gagne `sipDie`, `rollDice()` tire une 3ᵉ valeur du même PRNG seedé
(attention : consomme le PRNG → mettre à jour `phase5.test.ts` déterminisme + rapport d'équité).
Activable par config (`GameConfig.sipDie?: boolean`), donc rétrocompatible.

### 1.2 Maisons → Bars, Clubs, Maisons closes — **D**
Renommer l'échelle de construction (5 paliers déjà supportés par `rents.length - 1`) :

`Comptoir` → `Bar de quartier` → `Club` → `Maison Close` → `Palace de l'After`

Chaque palier monte le palier de gorgées (cf. §0) et change le visuel 3D + le texte de loyer.
Bonus narratif : atterrir sur une **Maison Close** = le propriétaire choisit *qui* boit à ta place.

### 1.3 Malus infligés aux autres — **D + E+**
Le Monopoly ne punit que celui qui tombe. On ajoute des effets **sortants** :

- **Monopole complété** → tournée : tout le monde sauf toi boit 1.
- **Construction d'un palier** → le joueur le plus riche boit 1 (frein anti-runaway).
- **Passage Départ** → tu distribues 1 gorgée.
- **Triple double** → au lieu d'aller en prison seul, la table trinque et tu vas en cuve.

### 1.4 Vraie case Chance (deck séparé, effets mécaniques) — **E+**
Aujourd'hui `CARD_EFFECTS = ['jail_free']` : une seule carte a un vrai effet moteur, tout le
reste est du texte. On étend :

`move_to` · `move_relative` · `gain_cash` · `lose_cash` · `steal_cash` · `swap_property` ·
`teleport_random` · `immunity_turn` · `force_sell` · `give_sips`

Et on scinde `action` en deux decks : **Chance à Boire** (mécanique) / **Carte Action** (gage social),
ce que le plateau annonce déjà par ses noms de cases mais que le code ne distingue pas.

### 1.5 Chemin annexe / raccourci — **E++**
« La Ruelle des Poivrots » : entre deux cases, choix binaire à l'arrivée.

- Route normale : rien.
- Raccourci : sautes 6 cases (donc tu esquives une avenue chère) **contre 3 gorgées**,
  ou cul sec si le raccourci est emprunté 2 fois d'affilée par le même joueur.

Implé la moins chère : pas de vrai graphe de plateau. Une case `action` spéciale
`kind: 'fork'` qui pose un choix (`awaiting_fork`) et applique un `move_relative`.
Variante ambiance : le raccourci **ne s'ouvre qu'en `chaos`/`finale`** (le plateau mute en fin de partie).

### 1.6 Case Cul-Sec — **D + E+**
Nouveau `kind: 'culsec'` (ou case `action` dédiée) : cul sec immédiat, mais **+300 € de la banque**.
On paye son verre en cash → première brique de l'idée maîtresse §2.1.

### 1.7 Chrono Bière (mini-jeu temps réel) — **E++**
Événement déclenché par carte ou par passage en `chaos` : **tous** les joueurs s'affrontent.

- Format : premier à taper l'écran après le « GO » / à finir son verre puis valider.
- Récompense réelle : 500 €, ou une propriété gratuite au choix, ou 1 jeton d'immunité.
- Perdant : cul sec ou double gage.

Implé : nouvelle phase `awaiting_minigame`, l'hôte fait autorité sur l'ordre d'arrivée
(les intentions portent déjà `createdAt` + séquence — `net/session.ts` gère l'idempotence).
Catalogue extensible : tap-race, secouer le téléphone, quiz éclair, « premier à poser son verre ».

### 1.8 Carte « Refus de loyer » (Ardoise) — **E+**
Jeton en réserve, exactement le pattern `jailCards` déjà en place.

- Tu annules un loyer **une fois**, quel qu'en soit le montant.
- Prix : gorgées = `min(6, round(loyer / 100))`, cul sec au-delà d'un seuil.
- Le propriétaire peut **surenchérir** : « tu bois double, je garde mon loyer ».

Champ : `PlayerState.refusalCards?: number` (optionnel → snapshots antérieurs valides).

### 1.9 Parc gratuit en gorgées (Bar Ouvert) — **E+**
Aujourd'hui `parking` ne fait **rien**. On en fait la cagnotte :

- Chaque taxe / caution / amende verse son cash **et** son nombre de gorgées dans le pot.
- Qui atterrit sur **Bar Ouvert** rafle le cash **et distribue toutes les gorgées du pot**.
- Le pot est affiché en permanence dans le HUD : tension montante visible.

Champ : `GameState.pot?: { cash: number; sips: number }`.

---

## 2. Idées supplémentaires

### 2.1 ⭐ Payer en nature — l'alcool devient une monnaie — **E+**
**La mécanique qui casse vraiment le Monopoly.** Toute dette (loyer, taxe, caution, construction)
peut être réglée en gorgées au taux de la maison : **1 gorgée = 50 €**, cul sec = 300 €.

- Plus de faillite subie : on boit pour rester en jeu (l'élimination frustrante disparaît).
- Décision tactique permanente : cash contre foie.
- Garde-fou obligatoire : plafond par tour (ex. 6 gorgées) et par joueur, prompt soft automatique
  au-delà, rappel hydratation via `engine/moderation.ts`.
- Symétrie : le **taux de change se dégrade** quand l'ambiance monte (en `finale`, 1 gorgée = 100 €),
  ce qui récompense ceux qui ont bu tôt.

### 2.2 Jetons Sanction achetables — tuer le temps mort — **E+**
Le vrai défaut du Monopoly : 7 joueurs qui attendent leur tour. On achète du pouvoir **hors-tour**.

- 100 € = 1 jeton « gorgée ». Utilisable **à tout moment**, sur n'importe qui.
- Contre-jeton « Bouclier » (150 €) : annule un jeton reçu.
- Canal parallèle non bloquant : même pattern que `engine/trade.ts` (n'altère pas la machine à états).

### 2.3 Échanges alcoolisés (extension des trades) — **E+**
`TradeOffer` transporte déjà des assets. On ajoute : gorgées, jetons sanction, jetons d'immunité,
et surtout **contrats** : « je bois 3 gorgées à ta place au prochain loyer contre 200 € ».
La négociation devient sociale, pas juste comptable.

### 2.4 Enchères en gorgées — **E+**
`engine/auction.ts` existe. On ajoute un mode où l'on mise **en gorgées**, pas en euros.
Le joueur fauché redevient compétitif : rattrapage naturel, tension maximale.

### 2.5 Le propriétaire choisit la monnaie — **D + E+**
À la perception d'un loyer, le **propriétaire** choisit : « je prends ton argent » ou
« garde ton fric, cul sec ». Décision de personnalité, moment de table garanti.

### 2.6 Jauge d'ivresse (compteur symbolique) — **E+**
`PlayerState.sipsTaken` cumulé (déjà quasi calculable via le journal). Effets par palier :

| Palier | Effet |
|---|---|
| 10 | « Tu titubes » : ton dé peut varier de ±1 (le PRNG tranche) |
| 20 | Loyers reçus +20 % (pitié de la table) |
| 30 | Le jeu propose spontanément le mode soft, sans le forcer |

Sert aussi au **score de fin** : classement « fortune » **et** classement « survivant ».
Chiffres symboliques, jamais une mesure d'alcoolémie — à libeller clairement dans l'UI.

### 2.7 Le Serveur — la faillite qui ne sort pas du jeu — **E+**
Preset de faillite supplémentaire (`BANKRUPTCY_RULES`) : le failli devient **Serveur**.

- Il ne possède plus rien mais gagne 50 € par gorgée servie/validée aux autres.
- À 500 €, il rachète une propriété et revient dans la partie.
- Zéro spectateur : le pire défaut du Monopoly, réglé.

### 2.8 Le Périph de l'After — le plateau mute en finale — **E++**
Quand `partyIntensity` passe à `finale`, un anneau extérieur de 8 cases s'ouvre :
loyers doublés, sanctions doublées, salaire de tour doublé. On y entre volontairement.
Le directeur d'ambiance (`engine/ambiance.ts`) pilote déjà la montée — il pilote maintenant
la **géographie**.

### 2.9 Roue de la Soif — **E+**
Remplace une case action : roue à 12 secteurs (visuel 3D déjà en place), du « tour sec » au
« tournée générale + 500 € ». Lisible, rapide, très photogénique.

### 2.10 Braquage de comptoir — **E+**
Atterrir sur la case d'un autre joueur (leurs pions sont déjà positionnés) déclenche un
**duel** : pierre-feuille-ciseaux ou bras de fer. Gagnant : 200 € du perdant. Perdant : cul sec.

### 2.11 Happy Hour — **D**
Nouvelle règle temporaire (`content/rules.ts`, `scope: 'economy'`, `duration: minutes`) :
pendant 3 minutes, **tous les loyers sont payés en gorgées uniquement**. Cash gelé, foie ouvert.

### 2.12 La Tournée du Leader — anti-runaway — **D**
Règle temporaire `scope: 'last_player'` inversée : à chaque passage Départ, le **leader** paie
une tournée (1 gorgée à chacun). Le fait d'être devant coûte quelque chose : la partie reste ouverte.

### 2.13 Contrat de Cuve — **E+**
En prison (« En Cuve »), tu peux sortir immédiatement si **un autre joueur accepte de boire
pour toi**. Négociation à voix haute, engagement social. Utilise le canal trade existant.

### 2.14 Dernier Verre — la vraie fin de partie — **E+**
Le Monopoly ne finit jamais. À la fin du timer (`endsAt`), au lieu d'un simple décompte :
**tour final** où chaque joueur mise gorgées + cash sur un dernier lancer. Le pot revient au
plus haut jet. Retournement final assuré, fin nette et mémorable.

---

## 3. Ordre d'implémentation conseillé

| Lot | Contenu | Coût | Impact |
|---|---|---|---|
| **A** | §0 gorgées par palier · 1.2 renommage bars · 1.3 malus sortants · 1.6 cul-sec · 2.11 · 2.12 | D | Fort, immédiat |
| **B** | 1.9 cagnotte · 1.8 refus de loyer · 2.1 payer en nature · 2.2 jetons | E+ | Très fort — change le jeu |
| **C** | 1.1 dé des gorgées · 1.4 deck chance mécanique · 2.4 enchères gorgées · 2.6 jauge · 2.7 serveur | E+ | Fort |
| **D** | 1.5 raccourci · 1.7 chrono bière · 2.8 périph · 2.14 dernier verre | E++ | Fort, protocole à toucher |

## 4. Garde-fous à respecter dans tous les lots

- Variante soft systématique (schéma Zod : rendre `soft`/`softVariant` **obligatoire** sur tout
  nouveau contenu sanctionnant).
- Plafond dur de gorgées par tour et par joueur, quel que soit le cumul de mécaniques
  (`payer en nature` + `dé des gorgées` + `jetons` peuvent empiler très vite).
- Rappels `engine/moderation.ts` branchés sur les nouveaux compteurs (cagnotte, jauge d'ivresse).
- Bouton « passer en soft » toujours atteignable, y compris pendant un mini-jeu.
- Tous les nouveaux champs d'état sont **optionnels** : les snapshots Phase 8 doivent rester
  restaurables sans migration.
