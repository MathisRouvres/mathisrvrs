# MonoVomy — temps réel (Étape 2)

## Décision d’architecture

**Supabase Realtime** (broadcast) + modèle **host-authoritative**, derrière une
**abstraction de transport** (`RoomChannel`). Un appareil (l’hôte) fait tourner le
moteur déterministe et diffuse l’état ; les autres envoient des *intentions* et
rendent l’état reçu.

Pourquoi Supabase plutôt que Colyseus : aucun serveur à héberger (compatible avec
l’hébergement statique OVH + une PWA), montée en charge managée, mise en route rapide.
Le transport étant abstrait, passer à Colyseus (serveur Node autoritaire) plus tard
ne touche **qu’un seul fichier** — moteur, protocole et UI restent identiques.

## Modules (`src/features/monovomy/net/`)

| Fichier | Rôle |
|---|---|
| `protocol.ts` | Types de messages (client/serveur), intentions, membres du salon |
| `transport.ts` | Interface `RoomChannel` + `createLoopbackHub` (tests/dev, sans réseau) |
| `supabaseTransport.ts` | Implémentation Supabase Realtime (SDK importé dynamiquement) |
| `hostReducer.ts` | `applyIntent` — fonction pure, contrôle du tour, cœur transposable serveur |

## Flux

1. L’hôte crée une room → **code de partie** court. Les joueurs rejoignent via le code.
2. Chaque `hello` fait attribuer un siège par l’hôte, qui rediffuse le salon.
3. Au lancement, l’hôte `createGame` et diffuse l’état.
4. Un joueur envoie une intention (`roll` / `buy` / `endTurn`) ; l’hôte valide
   (bon siège, bonne phase), applique au moteur, rediffuse l’état (+ résultat du lancer).
5. Chaque client **dérive l’affichage** (gorgées, texte de carte, version soft) à
   partir de l’état synchronisé — la logique de gorgées n’est jamais dupliquée sur le réseau.
6. Chat intégré via le même canal.

## Activation

```bash
npm i @supabase/supabase-js
# .env.local
VITE_MONOVOMY_ENABLED=true
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Sans configuration Supabase, le mode en ligne affiche les étapes de mise en route ;
le mode **local (hot-seat)** reste pleinement jouable.

## Limites / suite

- Autorité côté client-hôte (anti-triche léger) ; migrer vers Colyseus ou des Edge
  Functions Supabase pour une autorité serveur si besoin.
- Reconnexion basique (re-`hello`) ; à durcir (resync d’état complet, timeout de siège).
- Presence Supabase pourra remplacer le suivi manuel des membres.
