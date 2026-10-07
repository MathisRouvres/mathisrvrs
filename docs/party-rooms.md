# Jeux de soirée : parties à plusieurs téléphones

Une partie se crée depuis `/games/soiree` : code de 4 caractères (sans I, O, 0, 1), lien `/games/soiree?room=CODE` et QR code. Chacun rejoint avec son prénom.

## Principe

- **Pas d'hôte.** L'état est un dictionnaire de registres « dernière écriture gagnante » (horloge de Lamport + identifiant du téléphone). Toutes les écritures convergent, dans n'importe quel ordre, et la partie survit au départ de n'importe qui (`room/doc.ts`).
- **Pas de base de données.** Supabase Realtime sert seulement de tuyau : broadcast pour les écritures, presence pour savoir qui est connecté (`room/transport.ts`). Un téléphone qui arrive ou revient demande l'état complet (`hello` → `state`) et renvoie le sien, écritures hors ligne comprises (`room/store.ts`).
- **Reprise.** La partie est sauvegardée en `sessionStorage` (`party-room-v1`) : un rechargement de page la reprend.

## Branchement dans les jeux

- `useSessionState` est partagé automatiquement dans une partie : clé `g/<jeu>/<niveau>/<champ>`. Tant qu'une clé manque, chaque téléphone propose sa valeur initiale (horloge 0), départagée de la même façon partout. `{ shared: false }` garde un champ propre au téléphone (camp de Qui est-ce ?).
- `useSessionVotes(champ, prénom)` : une réponse par joueur, sans conflit (votes, « j'ai vu mon rôle »).
- `useCountdown` partage l'heure de fin : le chrono sonne sur tous les téléphones.
- Navigation, niveau et joueurs sont partagés (`meta/route`, `meta/level`, membres `m/<id>` et invités `meta/guests`).
- Rôles secrets (Imposteur, Undercover, Loup-Garou, Pyramide) : `RoomReveal`, chacun voit le sien, et les joueurs sans téléphone passent par le téléphone d'un autre.
- Votes (Imposteur, Je n'ai jamais, Tu préfères, Qui pourrait, Qui de nous deux, C'est un 10 mais) : `RoomVote`, déclarés par `vote` dans `games.ts`.
- Loup-Garou : le meneur décoche « Je joue » (spectateur). Lui seul voit les rôles et les commandes.

## Sécurité

Les messages viennent d'autres téléphones : formes et tailles validées (`sanitizeEntries`, 200 000 caractères max), puis chaque jeu revalide ses valeurs (`parse`). Rendu React uniquement (pas de HTML injecté). Les rôles transitent dans l'état partagé : un joueur qui ouvre les outils de développement peut les lire. C'est acceptable pour un jeu de soirée, mais il ne faut pas y mettre de données sensibles.

## Développement

`npm run dev` avec `VITE_PARTY_ROOM_TRANSPORT=tabs` (configuration `dev-tabs` de `.claude/launch.json`) : les onglets du navigateur se relient par `BroadcastChannel`, sans serveur. Tests : `src/features/party/room/*.test.*` (réseau simulé en mémoire).
