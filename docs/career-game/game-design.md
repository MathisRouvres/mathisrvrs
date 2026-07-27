# Game Design — Mode Carrière

Nom provisoire produit : **CarrerManager** (titre UI à confirmer ; route site : `/carriere`).  
Univers : football **100 % fictif** (clubs, compétitions, joueurs, marques).  
Objectif design : carrière narrative systémique, rejouable, lisible sans manuel.

---

## 1. Promesse du jeu

> « Vis la carrière complète d’un footballeur — des décisions du centre de formation jusqu’à la retraite — où chaque choix laisse une trace, parfois invisible. »

Le joueur ne « gagne » pas seulement des matchs : il construit une **trajectoire humaine** (performance, relations, santé, argent, image) dans un système cohérent.

---

## 2. Boucle principale

```
Création joueur
    → Choix du mode (Express / Standard / Immersion)
    → Boucle saisonnière
         → Chapitres / moments du calendrier
         → Dilemme(s) ou micro-décision(s)
         → Résolution immédiate + file d’effets différés
         → Mise à jour stats / flags / narration
    → Fin de saison (bilan)
    → Transfert / prolongation / stagnation
    → … jusqu’à retraite ou fin de carrière forcée
    → Épilogue + score de trajectoire (non classé en local)
```

**Unité de temps narrative :** la saison.  
**Unité de décision :** le chapitre (nombre variable selon le mode).

---

## 3. Modes de durée

### Mode Express

- ~1 événement majeur par saison.
- Idéal pour découvrir le système et rejouer vite.
- Conséquences plus concentrées (effets plus marqués par décision).

### Mode Standard

- Plusieurs chapitres et décisions par saison.
- Équilibre profondeur / durée (cible « une carrière complète » en une session longue ou quelques sessions).

### Mode Immersion

Calendrier enrichi par saison :

1. Pré-saison  
2. Première partie de saison  
3. Mercato hivernal  
4. Fin de saison  
5. Moments de match supplémentaires (dilemmes in-game ponctuels)

Plus de texture narrative et de systèmes relationnels ; plus d’occasions d’effets différés.

| Mode | Densité décisions / saison | Durée relative carrière | Public |
|------|----------------------------|-------------------------|--------|
| Express | Faible (≈ 1 majeur) | Courte | Découverte, rejouabilité |
| Standard | Moyenne | Moyenne | Cœur d’expérience |
| Immersion | Haute | Longue | Narration / profondeur |

---

## 4. Statistiques

Toutes les stats ont des **bornes explicites** (clamp min/max). Aucune valeur hors plage après résolution.

### Profil sportif (visibles)

Exemples de familles (noms définitifs côté data) :

- Technique, Athleticism, Mentalité match, Vision, Défense, Finishing, Leadership terrain  
- Forme du moment, Fatigue, Moral sportif  
- Note de prestige / niveau perçu

### Vitalité & vie (mixtes)

- Santé physique, Risque de blessure, Hygiène de vie  
- Santé mentale, Stress, Confiance en soi  
- Énergie sociale

### Carrière & statut

- Relation coach, Relation vestiaire, Concurrence pour la place  
- Image médias, Amour supporters, Attractivité sponsors  
- Stabilité familiale / amicale / amoureuse (agrégats)  
- Finances (liquidités), Discipline financière, Patrimoine (investissements)

### Méta

- Âge, Années pro, Caps sélection (fictives), Chapitre de carrière (formation → retraite)

---

## 5. Systèmes visibles

Ce que le joueur comprend et voit clairement :

- Progression de saison / chapitre  
- Stats principales et tendances  
- Dilemmes avec choix étiquetés (pas toujours avec toutes les conséquences)  
- Club actuel, contrat, agent (fictifs)  
- Forme, blessures déclarées, calendrier du mode  
- Argent disponible  
- Objectifs de saison / ambitions affichées  

---

## 6. Systèmes cachés

Pilotés par flags, compteurs et seuils — **non affichés** ou partiellement révélés :

- Opinion réelle du coach / direction (peut diverger de l’UI « relation »)  
- Rivalités dormantes entre coéquipiers  
- Timers d’effets différés (ex. burn-out dans 2 saisons)  
- Modificateurs de probabilité de blessure / sélection  
- « Dette narrative » (promesses non tenues)  
- Affinités médias / sponsors secrètes  
- Seeds d’événements conditionnels  
- Multiplicateurs d’équilibrage selon mode et âge  

Ces systèmes rendent les rejouabilités et les « pourquoi » intéressants sans noyer l’UI.

---

## 7. Types de dilemmes

Taxonomie data-driven (contenu dans des fichiers d’événements, pas dans les composants React) :

| Type | Exemple d’enjeu |
|------|-----------------|
| Entraînement | Intensité vs récupération |
| Match | Prise de risque, fair-play, ego |
| Coach | Confiance, confrontation, loyauté |
| Vestiaire | Place titulaire, leadership, conflits |
| Transfert | Partir / rester / forcer |
| Contrat | Salaire, durée, clauses |
| Agent | Fidélité, commission, opportunisme |
| Médias | Silence, clash, storytelling |
| Supporters | Gestes, engagement, polémique |
| Sponsors | Image vs argent |
| Famille / amis | Présence, distance, soutien |
| Vie amoureuse | Stabilité vs distraction / scandale |
| Hygiène de vie | Sorties, sommeil, discipline |
| Blessure | Reprise précoce vs patience |
| Santé mentale | Aide, déni, pause |
| Argent / investissements | Risque, arnaque, prudence |
| Sélection nationale | Ambition vs club |
| Fin de carrière | Prolongation, reconversion, adieux |

Chaque dilemme déclare : conditions d’éligibilité, poids, effets immédiats / différés / conditionnels / cachés, tags, exclusivité.

---

## 8. Conditions de victoire

Il n’y a **pas une seule victoire binaire**. À la retraite (ou fin forcée), le jeu calcule un **profil de trajectoire** et un ou plusieurs labels de réussite.

Fin de partie déclenchée par :

- Retraite choisie  
- Retraite médicale / mentale  
- Fin de contrat sans club + âge seuil  
- Événement narratif de clôture  

---

## 9. Formes de carrière réussie

Plusieurs archétypes non exclusifs (exemples) :

1. **Légende sportive** — trophées, longévité haut niveau, sélection  
2. **Icône populaire** — supporters + médias, impact culturel  
3. **Stratège financier** — patrimoine solide, peu de scandales ruinants  
4. **Leader respecté** — vestiaire, coach, mentorat  
5. **Comeback** — surmonter blessure / chute / ostracisme  
6. **Fidèle de club** — ancrage long, identité locale  
7. **Globe-trotter** — multi-championnats, adaptation  
8. **Équilibre de vie** — santé mentale / relations stables malgré le niveau  

Une carrière peut être « réussie » sur un axe et fragile sur un autre — l’épilogue le raconte.

---

## 10. Risques de frustration

| Risque | Mitigation design |
|--------|-------------------|
| Conséquences illisibles | Feedback immédiat + journal de saison |
| Spirale de blessures | Caps, filets de sécurité, options de récupération |
| RNG injuste | PRNG seedé, poids visibles partiels, pas de `Math.random` libre |
| Trop de stats | Couches : essentielles vs détail |
| Mode Immersion trop long | Sauvegardes, bilans clairs, Express comme porte d’entrée |
| Game over brutal | Signaux d’alerte avant rupture (mental, contrat, santé) |
| Sentiment de script unique | Contenu data-driven + conditions + seed |

---

## 11. Principes d’équilibrage

1. **Bornes dures** sur toutes les stats.  
2. **Trade-offs** : peu de choix « gratuits » ; chaque gain a un coût latent possible.  
3. **Délai** : les abus (surentraînement, clash médias) paient plus tard.  
4. **Mode scaling** : Express = effets plus denses ; Immersion = plus de granularité, pas forcément plus punitif.  
5. **Âge** : pics et déclins progressifs, pas cliffs aléatoires.  
6. **Déterminisme** : même seed + mêmes décisions = même carrière.  
7. **Lisibilité > simulation totale** : on coupe la profondeur qui n’apporte pas de décision intéressante.  
8. **Contenu original uniquement** — aucun texte / événement / marque copié d’un autre jeu.

---

## Hors scope Phase 0

Aucun gameplay jouable, aucun catalogue d’événements implémenté, aucun équilibrage chiffré final — ce document guide les phases suivantes.
