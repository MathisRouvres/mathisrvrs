# MonoVomy — Négociation (refonte Phase 12)

## Le problème de l'ancien panneau

Tout était affiché en même temps sur un écran de téléphone : offres reçues, offres
envoyées, sélecteur de destinataire, deux colonnes d'actifs, boutons `+50 €` / `+100 €` /
`−50 €` à marteler, et cinq boutons de « réaction rapide ». Un joueur qui ouvrait
l'écran devait comprendre la structure avant de pouvoir agir. En soirée, personne ne
le faisait : l'échange était la fonctionnalité la moins utilisée du jeu.

## Le nouveau modèle : un écran = une décision

### 1. `inbox` — répondre

S'ouvre par défaut **dès qu'une offre attend**. Une offre = une carte en grand :

```
● Bob te propose
  ↓ tu reçois   Rue de la Tequila + 200 €
  ↑ tu donnes   Boulevard de la Bière
  Tu y gagnes
  [ Accepter ] [ Contre-offre ] [ Refuser ]
```

Trois boutons, aucune saisie. Le verdict (`Tu y gagnes` / `Équilibré` / `Tu y perds`)
est calculé sur la valeur des actifs et reste **purement indicatif** : aucun échange
déséquilibré n'est bloqué.

### 2. `who` — choisir avec qui

Une rangée de joueurs, un tap. Chaque ligne affiche ce qui compte pour décider :
argent, nombre de propriétés, nombre de cartes. Les offres qu'on a soi-même envoyées
et qui attendent une réponse sont listées en bas, annulables d'un bouton.

### 3. `compose` — construire le deal

Deux paniers empilés, jamais côte à côte (une colonne de 4 cm ne marche pas) :

- **« Tu prends chez Bob »** — bordure verte, ses actifs à lui ;
- **« Tu donnes »** — bordure orange, les tiens.

Dans chaque panier :
- l'argent se règle avec **un curseur** (pas de boutons à marteler), borné au cash réel ;
- chaque propriété, carte de marché et jeton de cuve est une **pastille** qu'on tape ;
- l'en-tête récapitule le panier en une ligne, en direct.

Sous les deux paniers : le verdict, puis **un seul bouton** — « Proposer à Bob ».

### Contre-offre

Le bouton `Contre-offre` d'une offre reçue ouvre `compose` **déjà rempli, sens inversé**.
Le joueur ajuste ce qu'il veut et renvoie. C'est la seule forme de négociation
itérative du jeu — et elle ne demande aucune ressaisie.

## Ce qui a été supprimé

- **Les réactions rapides** (`too_expensive`, `add_property`, `deal`, `never`,
  `last_offer`) : cinq boutons de chat pré-écrit, jamais utilisés, qui occupaient un
  tiers de la carte d'offre. Retirés du moteur, du protocole réseau et des tests.
- **Le statut `draft`** : jamais produit par le moteur.
- **Les boutons ± 50/100 €** : remplacés par un curseur.
- **La liste d'offres envoyées en tête d'écran** : reléguée sous le choix du joueur,
  là où elle est utile.

## Actifs échangeables

| Actif | Détail |
|---|---|
| Argent | Curseur, borné au cash réel du joueur |
| Propriétés | Vérifiées à l'acceptation (l'actif a pu changer de main entre-temps) |
| Jetons de cuve | `jailCards` |
| **Cartes du Marché Noir** | `TradeBundle.cards`, doublons gérés exemplaire par exemplaire |

**Jamais de gorgées** : c'est la règle du projet, un échange ne se paie pas au foie.

Le plafond d'inventaire (3 cartes) est contrôlé **à l'acceptation, des deux côtés**.
Un deal qui ferait déborder une main est refusé avec `inventory_full` — y compris
quand c'est l'émetteur qui déborderait. Un échange qui cède une carte et en reçoit
une autre passe : c'est le solde final qui compte, pas le brut.

## Garanties inchangées

- **Canal parallèle** : une offre ne bloque jamais la machine à états du tour.
- **Expiration** à 20 s (`TRADE_TTL_MS`), tick de l'hôte.
- **Transfert atomique** tout-ou-rien, re-validé au moment de l'acceptation.
- **Idempotence réseau** : rejouer le même message n'exécute qu'un transfert.
- **Conservation** : aucun actif créé ni détruit (vérifié par test, cartes comprises).

## Fichiers

| Fichier | Rôle |
|---|---|
| `engine/trade.ts` | Offres, bundles, validation, transfert, estimation |
| `components/MvTrade.jsx` | Les trois écrans (`inbox` / `who` / `compose`) |
| `net/protocol.ts` | `tradeCreate` / `tradeRespond` / `tradeCounter` / `tradeCancel` |
| `engine/trade.test.ts` | 16 tests : transferts, expiration, contre-offre, idempotence, cartes, plafond |
