# Architecture — Mode Carrière

## Objectif

Intégrer le jeu **progressivement** dans le portfolio Vite/React **sans casser** la homepage, le contact PHP, ni le déploiement FTP OVH.

---

## Principes

1. **Isolation** — code jeu dans des dossiers dédiés (`src/pages/career*`, plus tard `src/game/` / `game-engine`).  
2. **Feature flag** — activation build-time via Vite.  
3. **Moteur ≠ UI** — logique pure testable, séparée des composants React (phases suivantes).  
4. **Déterminisme** — seed + PRNG contrôlé (phases suivantes).  
5. **Autorité serveur pour ranked** — hors portée tant qu’il n’y a pas de backend ; carrières locales d’abord.  
6. **Zéro secret dans le repo.**

---

## Route et naming

| Concept | Valeur |
|---------|--------|
| Route publique | `/carriere` |
| Flag logique | `CAREER_GAME_ENABLED` |
| Variable Vite | `VITE_CAREER_GAME_ENABLED` (`'true'` / `'false'`) |
| Page Phase 0 | `src/pages/CareerComingSoon.jsx` |

**Pourquoi pas `/games/carrermanager` ?**  
Le site est un portfolio FR mono-page ; `/carriere` est plus court, mémorisable et aligné SEO/langue. Un redirect alias pourra être ajouté plus tard si besoin.

---

## Routage Phase 0 (sans React Router)

```
main.jsx
  └── App.jsx
        ├── pathname === '/carriere' && flag ON  → CareerComingSoon
        ├── pathname === '/carriere' && flag OFF → redirect '/'
        └── sinon                                → Portfolio (existant)
```

Justification : une seule route dédiée ; ajouter `react-router-dom` maintenant apporterait du risque inutile. Le fallback `.htaccess` couvre déjà le deep-link.

Phases ultérieures : introduire React Router (ou équivalent) quand le jeu aura plusieurs sous-routes (`/carriere/nouvelle`, `/carriere/partie/:id`).

---

## Feature flag

```js
// src/config/features.js
export const CAREER_GAME_ENABLED =
  import.meta.env.VITE_CAREER_GAME_ENABLED === 'true'
```

- **Opt-in explicite** : absent ou autre valeur ⇒ jeu désactivé.  
- CI : définir `VITE_CAREER_GAME_ENABLED=true` dans le job de build pour publier la page « en construction ».  
- Local : `.env.local` (gitignoré).

---

## Structure cible (évolution)

```
src/
  config/features.js
  features/career/          # UI + persistance locale
  game-engine/              # moteur pur (types, RNG, rules, core)
  game-content/             # clubs, compétitions, events (data)
  pages/                    # pages legacy / stubs
docs/career-game/
```

Le portfolio (`Hero`, `Contact`, etc.) **ne dépend pas** du moteur.

## Phase 1 — état

- Moteur + PRNG seedé + Zod + Vitest.
- Persistance locale hybride (snapshot + journal).
- Route `/carriere` = atelier technique (créer / save / reprise / delete).
- Contenu narratif : catalogues stubs uniquement.

---

## Données & contenu

- Événements / dilemmes = **données** (JSON/TS validés), pas de hardcode dans React.  
- Clubs / compétitions = catalogues fictifs versionnés.  
- Validation externe (Zod) prévue à l’introduction TypeScript du module jeu.

---

## Persistance (prévision)

| Étape | Stockage |
|-------|----------|
| Prototype local | `localStorage` / `IndexedDB` (save slots) |
| Ranked | API + BDD (ex. Supabase) — autorité serveur |

Phase 0 : aucune persistance jeu.

---

## Déploiement

1. `npm run build` (flag lu à la compilation).  
2. FTP `dist/` → OVH (`dangerous-clean-slate`).  
3. Apache sert `/carriere` via rewrite → `index.html`.

Désactiver le jeu en prod sans rollback de code : rebuild avec `VITE_CAREER_GAME_ENABLED=false`.

---

## Compatibilité avec le site principal

| Surface | Impact Phase 0 |
|---------|----------------|
| Homepage | Inchangée si path `/` |
| Contact PHP | Inchangé |
| SEO sitemap | `/carriere` **non** ajouté tant que page « construction » (évite indexer un stub) |
| Bundle | Page légère ; pas de game-engine |
| Thème | `ThemeProvider` réutilisé sur la page carrière |

---

## Sécurité (rappel)

- Flag client = **vitrine**, pas un contrôle d’accès sécurité.  
- Ne pas y placer de logique ranked.  
- Futurs endpoints : auth, validation Zod, rate limit, anti-triche état.

---

## Stack future recommandée (jeu seulement)

Sans migrer tout le portfolio :

- TypeScript strict dans `game-engine`  
- Vitest (moteur)  
- Zod (schémas état / événements)  
- Playwright (parcours critiques) plus tard  
- Backend d’autorité quand les classements arriveront  

Le portfolio peut rester en JSX tant que ce n’est pas nécessaire de tout convertir.
