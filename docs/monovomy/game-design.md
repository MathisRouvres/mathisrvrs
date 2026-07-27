# MonoVomy — Game Design Document (GDD)

> **Le Monopoly à boire.** Le jeu classique, la soirée en plus.
> Multijoueur temps réel, chacun depuis son téléphone.
>
> Version 0.1 — document de cadrage (Étape 0). Statut : décisions fondatrices validées, contenu à produire.

---

## 1. Vision & piliers

MonoVomy reprend l'âme du Monopoly — acheter, négocier, encaisser des loyers, ruiner ses amis — et en fait un **jeu de soirée jouable en 30 à 90 minutes**, où chaque joueur agit depuis son propre téléphone, le plateau étant synchronisé en temps réel.

Quatre piliers guident toutes les décisions :

1. **Hybride stratégie + alcool.** On garde l'économie Monopoly (argent, propriétés, loyers, négociation). L'alcool est l'enjeu et la sanction, pas une comptabilité en plus.
2. **Le ton monte avec le niveau.** Facile est convivial ; Hardcore est trash et +18. Un seul jeu qui s'adapte au public via la difficulté choisie en amont.
3. **Personne sur le banc.** Une partie chronométrée + des règles de faillite au choix garantissent que le jeu se termine et que personne ne reste spectateur trop longtemps.
4. **Fun responsable.** Mode soft par joueur, +18 assumé, rappels d'hydratation. La sécurité est une valeur de marque visible.

**Public cible.** D'abord des groupes d'amis (3 à 8 joueurs) en soirée. L'architecture est pensée pour pouvoir grandir vers un vrai produit si le proto séduit.

---

## 2. Boucle de jeu (game loop)

### Avant la partie (lobby)
- L'hôte crée une partie → un **code de partie** (join par lien / QR).
- Chaque joueur rejoint, choisit un pseudo + avatar, et **son mode : alcool ou soft** (choix individuel).
- L'hôte règle les **paramètres de partie** : niveau de difficulté, durée, règle de faillite, thème du plateau (voir §4), boissons.

### Pendant un tour
1. Le joueur actif **lance le dé** depuis son téléphone (animation synchronisée sur tous les écrans).
2. Son pion se déplace ; la **case d'arrivée** déclenche son effet (achat possible, loyer, carte action, case spéciale…).
3. **Résolution alcool + argent** selon la case (voir §5).
4. Fenêtre courte de **négociation / échange** possible (proposer une propriété contre de l'argent et/ou des gorgées).
5. Passage au joueur suivant. Un **timer global** décompte la durée de la partie.

### Fin de partie
- Déclenchée par la **fin du timer** (30/60/90 min) ou par une condition de faillite selon le preset choisi.
- **Classement** par patrimoine net (argent + valeur des propriétés) → couronnement du **« Roi de MonoVomy »**, podium, souvenirs de la partie.

---

## 3. Le plateau

Structure classique de type Monopoly : **40 cases** en boucle, 4 côtés de 10 cases, avec les 4 coins spéciaux.

| Type de case | Rôle | Effet alcool (base, × multiplicateur) |
|---|---|---|
| **Départ** (coin) | +200 € en passant | — |
| **Propriété** | Achat / loyer | Gorgée symbolique au loyer (voir §5) |
| **Gare / transport** | Achat / loyer palier | Gorgée au loyer |
| **Service** (eau, élec.) | Loyer selon le dé | Gorgée légère |
| **Carte action** | Tire une carte (Défi/Chance/Gage/Règle/Duel) | Selon la carte |
| **Taxe** | Paie la banque | 1 gorgée |
| **Prison / Simple visite** (coin) | Bloqué X tours | 1 gorgée pour « payer sa caution » |
| **Allez en prison** (coin) | Va en prison | 2 gorgées |
| **Parking / Repos** (coin) | Pause, pot commun | Trinque avec la table |

### Thèmes personnalisables (décision validée)

Le plateau est **data-driven** : les cases sont un jeu de données, pas du code en dur. Le contenu du plateau est défini par un **thème** choisi en début de partie.

- **Thèmes préfaits** livrés avec le jeu : *Soirée* (Rue de la Soif, Avenue des Shots, Place de l'Apéro…), *Ville*, *Voyage*…
- **Thème personnalisé** : les joueurs peuvent **renommer les cases** en début de partie (ex. reprendre les rues de leur ville, des private jokes du groupe).
- Chaque thème = un fichier de données validé (schéma Zod) : `{ id, nom, prix, loyers[], groupe, couleur }`. Cela ouvre la porte à des packs de thèmes plus tard (monétisation possible en phase produit).

---

## 4. Paramètres de partie (réglés par l'hôte)

| Paramètre | Options | Effet |
|---|---|---|
| **Difficulté** | Facile / Intermédiaire / Difficile / Hardcore | Multiplicateur de gorgées + palier de gages (§6) |
| **Durée** | 30 / 60 / 90 min | Fin de partie au timer |
| **Faillite** | Personne éliminé / Classique / Chasse au dernier | Gestion des joueurs ruinés (§8) |
| **Thème** | Soirée / Ville / … / Personnalisé | Contenu du plateau (§3) |
| **Boissons** | Personnalisées | Info d'ambiance, textes des sanctions |

Chaque joueur choisit indépendamment **alcool ou soft** (non réglé par l'hôte).

---

## 5. Économie : mix argent + gorgée (décision validée)

L'économie Monopoly reste **pleinement vivante** : on gagne, dépense et négocie de l'argent, et la stratégie compte. L'alcool s'y superpose comme **sanction symbolique** attachée aux événements.

### Principe
- **Salaire de tour** : +200 € en passant par la case Départ.
- **Achat de propriété** : au prix affiché, en argent.
- **Loyer** : payé en **argent** (montant Monopoly classique) **ET** une **gorgée symbolique** dont l'intensité dépend du niveau de la propriété.

### Barème des gorgées au loyer (base — à multiplier par le niveau)

| Niveau de propriété | Argent | Gorgée symbolique (base) |
|---|---|---|
| Terrain nu / gare | loyer de base | 1 gorgée |
| Avec maisons | loyer ↑ | 2 gorgées |
| Hôtel | loyer max | Cul sec |

> La gorgée est **fixe et lisible** (pas de calcul mental en soirée) ; c'est le **multiplicateur du niveau** qui fait varier l'intensité. Le montant en argent, lui, suit les règles Monopoly classiques.

### Autres sources de gorgées
- Cases taxe, prison, services.
- Cartes action (§7).
- Faillite (§8).
- Règles persistantes actives (carte RÈGLE).

---

## 6. Système d'alcool & niveaux de difficulté

### Unités de sanction
- **Gorgée** : l'unité de base.
- **Cul sec** : finir son verre.
- **Shot** : réservé au niveau Hardcore.
- **Distribution** : « fais boire X gorgées à qui tu veux ».
- **Duel** : deux joueurs s'affrontent, le perdant boit.

### Les 4 niveaux (froid → chaud)

| Niveau | Couleur | Multiplicateur | Deck de gages |
|---|---|---|---|
| **Facile** | Cyan | ×1 | Soft & conviviaux |
| **Intermédiaire** | Or | ×2 | Taquins |
| **Difficile** | Orange | ×3 + culs secs occasionnels | Piquants, duels fréquents |
| **Hardcore** | Magenta→Rouge | ×4, shots, culs secs | Trash, +18 |

**Règle d'or :** un même événement applique toujours `gorgées de base × multiplicateur du niveau`. On ne réécrit jamais les règles — on change l'intensité et le deck de gages.

### Mode soft, par joueur (décision validée)
Un joueur en mode soft qui « devrait boire » exécute à la place un **mini-gage** (pompe, imitation, fait embarrassant, mime…), calibré sur le même palier d'intensité. Il **reste dans l'action**, jamais spectateur. Le jeu pioche ces mini-gages dans un **deck soft parallèle**.

---

## 7. Cartes action

Cinq familles, chacune avec sa couleur, son icône et son rôle. Contenu **data-driven** (un catalogue par famille, décliné par niveau).

| Famille | Couleur | Rôle | Exemple |
|---|---|---|---|
| **DÉFI** | Or | Réussis un challenge… ou bois | « Mime ton métier 30 s ou bois 2 gorgées » |
| **CHANCE À BOIRE** | Magenta | Distribue / désigne qui boit | « Le joueur à ta gauche choisit qui descend son verre » |
| **GAGE** | Violet | Exécute un gage immédiat | « Fais un compliment sincère à chaque joueur, ou bois » |
| **RÈGLE** | Cyan | Règle persistante jusqu'à la fin | « Interdit de dire "je", sinon 1 gorgée à chaque fois » |
| **DUEL** | Orange | 1 contre 1, le perdant boit | « Bras de fer : le perdant cul sec » |

**Anatomie d'une carte :** icône (haut) · type coloré · consigne courte et directe · tag de résolution (bas). Le nombre de gorgées affiché s'ajuste automatiquement au multiplicateur du niveau, et la version soft substitue un mini-gage.

**Schéma de données (indicatif) :**
```ts
type CarteAction = {
  id: string;
  famille: 'defi' | 'chance' | 'gage' | 'regle' | 'duel';
  niveauMin: 'facile' | 'inter' | 'difficile' | 'hardcore';
  texte: string;          // consigne, avec variables ex. {joueurGauche}
  gorgeesBase: number;    // × multiplicateur
  soft?: string;          // mini-gage équivalent
  persistante?: boolean;  // pour les RÈGLE
};
```

---

## 8. Faillite & fin de partie

### Trois presets de faillite (réglés par l'hôte)
1. **Personne éliminé** (recommandé soirée) — un joueur ruiné boit une grosse sanction, puis **repart avec un mini-capital**. Comeback possible. Personne ne sort.
2. **Élimination classique** — le ruiné boit un dernier cul sec et **sort du jeu**. Plus tendu.
3. **Chasse au dernier** — pas d'élimination en cours de partie ; à la fin, **le(s) plus pauvre(s) écopent des gros gages**.

### Fin de partie
- Au **timer** (30/60/90 min) ou selon le preset.
- **Score = patrimoine net** (argent + valeur des propriétés/constructions).
- Écran résultat : podium, « Roi de MonoVomy », statistiques marquantes (plus gros loyer encaissé, plus bu, meilleure négo…).

---

## 9. Multijoueur temps réel — architecture

### Contrainte
Un jeu de plateau synchronisé a besoin d'un **état autoritaire** (le serveur tranche), sinon triche et désynchronisation. Le déterminisme du moteur (RNG seedé) est clé pour rejouabilité et tests.

### Deux voies (à trancher en Étape 2)
- **Colyseus** (serveur Node dédié aux jeux à rooms) — état autoritaire, reconnexion gérée, idéal jeu de plateau. Plus de contrôle, un peu plus à héberger. **Recommandé pour l'axe « proto qui peut devenir produit ».**
- **Supabase Realtime / Firebase** — rooms + synchro + auth managés, montage très rapide, mais logique plus côté client (moins anti-triche par défaut). Idéal si on veut jouer ce week-end.

### Principes communs
- **Room = une partie**, identifiée par un code court.
- Le **serveur détient l'état** (positions, argent, propriétés, deck mélangé avec seed) ; les clients envoient des **intentions** (lancer, acheter, négocier) validées côté serveur.
- **Reconnexion** : un joueur qui perd le réseau retrouve sa partie.
- **Chat temps réel** intégré (taquiner, négocier).

---

## 10. Stack technique proposée

Alignée sur les acquis (portfolio React 19 / Vite / Tailwind / Zod / Vitest).

- **Front** : React 19 + Vite + Tailwind CSS v4.
- **État client** : Zustand (léger) ou Context.
- **Validation contenu** : Zod (catalogues de cartes, thèmes de plateau).
- **Tests** : Vitest + tests de déterminisme du moteur ; simulations de masse pour l'équilibrage (même approche que le career-game existant).
- **Temps réel / back** : Colyseus (Node) ou Supabase — décision Étape 2.
- **Distribution** : PWA installable d'abord (partage par lien, pas de store) ; wrap Capacitor vers les stores plus tard si le jeu prend.

---

## 11. Roadmap de développement

| Étape | Objectif | Livrables |
|---|---|---|
| **0. Cadrage** *(en cours)* | Fixer le design | Ce GDD + catalogue de cartes + thème de plateau « Soirée » |
| **1. Prototype local** | Valider le fun | Moteur déterministe, state-machine de tour, UI mobile, jouable en hot-seat sur un écran |
| **2. Temps réel** | Multijoueur | Choix backend, rooms + code de partie, synchro d'état autoritaire, chat, reconnexion |
| **3. Contenu & équilibrage** | Rythme juste | Decks complets par niveau + soft, playtests réels, ajustement économie/durée |
| **4. Polish & responsabilité** | Qualité + sérieux | Animations, sons, onboarding, +18, mode soft, hydratation, CGU/RGPD |
| **5. Distribution** | Mise en ligne | PWA, analytics, boucle de feedback |

**Prochaine action concrète après ce GDD :** produire le **catalogue de cartes action** (rédigé par niveau) + le **thème de plateau « Soirée »** complet (40 cases chiffrées), puis attaquer le **prototype local** (Étape 1).

---

## 12. Contenu à produire (checklists)

**Cartes action** (par niveau Facile→Hardcore, + variantes soft) :
- [ ] Défis (viser ~30/niveau)
- [ ] Chances à boire (~20/niveau)
- [ ] Gages (~30/niveau)
- [ ] Règles persistantes (~15/niveau)
- [ ] Duels (~10/niveau)

**Plateau** :
- [ ] Thème « Soirée » : 40 cases nommées + prix + barème de loyers
- [ ] 1–2 thèmes alternatifs
- [ ] Structure de renommage personnalisé

**Économie** :
- [ ] Capital de départ, salaire de tour, prix et loyers équilibrés (à valider par simulation)

---

## 13. Responsabilité & légal (pour la phase produit)

- **+18** affiché et assumé ; mode soft accessible à tous.
- **Rappels d'hydratation** entre les tours ; jamais de quantité imposée dangereuse.
- **Boire avec modération** présent dans l'UI et les communications.
- **CGU + politique de confidentialité (RGPD)** dès qu'on collecte pseudos/parties en ligne.
- Vérifier les règles des **stores** (Apple/Google) sur les contenus liés à l'alcool avant un éventuel wrap natif.

---

*Document de travail — à itérer au fil des playtests. Prochaine décision en attente : backend temps réel (Étape 2).*
