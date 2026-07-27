# Audit d’intégration — Mode Carrière

Date : 2026-07-22  
Dépôt : `mathisrvrs` (portfolio mathis-rvrs.fr)  
Phase : 0 — Audit et plan d’intégration

## Synthèse

Le site est un **portfolio SPA React** déployé en fichiers statiques sur OVH. Il n’y a ni routeur applicatif, ni authentification, ni base de données applicative. L’intégration du jeu doit rester **isolée** (module dédié + route feature-flaggée) pour ne pas fragiliser le portfolio ni le pipeline FTP.

**Route retenue :** `/carriere` (cohérente avec le site francophone).  
`/games/carrermanager` reste un alias conceptuel provisoire — non utiliséé en Phase 0.

---

## 1. Framework et versions

| Élément | Version (lockfile / install) | Notes |
|---------|------------------------------|--------|
| React | 19.2.x | JSX, pas de TypeScript applicatif |
| React DOM | 19.2.x | |
| Vite | 8.0.x | `type: module`, base `/` |
| Tailwind CSS | 4.3.0 | via `@tailwindcss/vite` |
| ESLint | 10.x | flat config, fichiers `js`/`jsx` |
| Node CI | 22 | `.github/workflows/deploy.yml` |
| Package manager | npm | `package-lock.json` v3 |

**Absent aujourd’hui :** TypeScript strict, Next.js, Vitest, Playwright, Zod, Supabase.

**Implication :** le jeu pourra introduire TypeScript **dans un sous-module** (`src/game/` ou `packages/game-engine`) sans migrer tout le portfolio d’un coup. Phase 0 n’ajoute pas encore le moteur.

---

## 2. Structure des routes

- **Pas de React Router.** Une seule entrée : `index.html` → `main.jsx` → `App.jsx`.
- Navigation portfolio = **ancres** (`#pro`, `#projets`, etc.) dans `src/data/site.js`.
- Fallback SPA Apache : `public/.htaccess` réécrit toute URL non-fichier vers `/index.html`.
- Donc `/carriere` est déjà techniquement servable côté hébergeur ; il manque uniquement le branchement côté React.

---

## 3. Composants et design system

### Composants existants (`src/components/`)

Navbar, Hero, ProMode, Projects, ProjectCard, SkillsGrid, PersonalMode, GamerScene, Timeline, Contact, Footer, Button, ThemeToggle, AnimatedSection, SeoJsonLd.

### Tokens / thèmes (`src/index.css`)

- Mode clair / sombre via classes `html.light` / `html.dark`.
- Variables CSS : `--bg-*`, `--text-*`, `--accent`, `--border-color`, etc.
- Fonts : Inter (sans), Space Grotesk (display), JetBrains Mono.
- Motion : `src/styles/motion.css`, hook `useReducedMotion`.

### Patterns UX déjà présents

- Skip link « Aller au contenu principal ».
- Focus visible, menu mobile, états disabled sur `Button`.
- Thème persistant (`localStorage` clé `mathis-rvrs-theme`).

**Recommandation jeu :** réutiliser tokens + `Button` + `ThemeProvider` ; éviter de polluer le design system portfolio avec des styles « sport » globaux — préférer un scope CSS dédié (`career-game`).

---

## 4. Authentification

**Aucune.** Pas de session utilisateur, pas d’OAuth, pas de cookies d’auth.

**Implication classements (phases futures) :**  
soit carrières locales non classées, soit ajout d’un backend d’autorité (Supabase / API) — hors Phase 0. Le prompt socle exige une autorité serveur pour les classements : à prévoir dans la roadmap, pas dans le portfolio PHP actuel.

---

## 5. Base de données

- Docs `docs/database.md` : placeholder vide.
- Runtime : **pas de BDD** pour le site.
- Seul backend : `public/contact.php` (envoi mail).

---

## 6. ORM / client de données

Aucun (pas de Prisma, Drizzle, Supabase client, fetch API métier).

Données portfolio = modules JS statiques (`src/data/*`).

---

## 7. Hébergement et déploiement

- Build : `npm run build` → `dist/`.
- CI/CD : push `main` → GitHub Actions → FTP OVH (`SamKirkland/FTP-Deploy-Action`).
- Secrets : `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`.
- `dangerous-clean-slate: true` : le contenu distant est remplacé par `dist/`.
- HTTPS forcé dans `.htaccess`.

**Risque intégration :** toute variable `VITE_*` doit être injectée **au build CI**, sinon absente en production.

---

## 8. Variables d’environnement

| Variable | Usage actuel |
|----------|----------------|
| `VITE_CONTACT_ENDPOINT` | Optionnel — override endpoint contact |

`.env` / `.env.local` sont gitignorés. Pas de `.env.example` avant Phase 0.

**Ajout Phase 0 :** `VITE_CAREER_GAME_ENABLED` (exposé au client via préfixe Vite).

---

## 9. Tests

- Scripts : `dev`, `build`, `lint`, `preview` uniquement.
- **Aucun** Vitest / Playwright / test unitaire présent.
- QA actuelle = lint ESLint + build Vite + vérifs manuelles README.

---

## 10. Traduction (i18n)

- Contenu **français** en dur.
- SEO `locale: fr_FR` / `language: fr`.
- Pas d’i18n framework.

Le jeu Phase 0+ reste en français ; architecture data-driven pourra externaliser les textes plus tard.

---

## 11. Analytics

Aucun (pas de gtag, Plausible, etc. dans le code source).

---

## 12. Gestion des erreurs

- Contact : validation client (`contactValidation.js`) + validation PHP + codes HTTP JSON.
- Pas d’Error Boundary React global.
- Pas de monitoring d’erreurs (Sentry, etc.).

---

## 13. Conventions Git

- Branche principale : `main` (déploie automatiquement).
- Messages récents : courts, parfois informels (`Modifications`, `Debugs & SEO`).
- Une remote `origin/main`.

**Recommandation :** développer le jeu sur une branche feature ; PR vers `main` ; feature flag pour désactiver sans rollback FTP.

---

## 14. Contraintes de sécurité

Déjà en place :

- Contact : honeypot, délai anti-spam, sanitization headers, limites de taille, `declare(strict_types=1)`.
- Pas de secrets dans le code frontend (FTP via GitHub Secrets).
- Règles projet : CSRF/XSS/uploads documentés dans `.cursor/rules`.

Pour le jeu (futur) :

- Ne jamais faire confiance au client pour les scores classés.
- Valider toute payload serveur.
- Seeds / états sensibles non mutables arbitrairement depuis le navigateur pour le mode ranked.

---

## 15. Compatibilité mobile

- Layout mobile-first (Tailwind breakpoints, menu hamburger).
- `useReducedMotion` pour accessibilité motion.
- Viewport / meta dans `index.html`.
- Portfolio déjà pensé pour petits écrans ; le jeu devra respecter la même discipline (touch targets, clavier, lecteur d’écran).

---

## Décisions d’intégration (Phase 0)

| Décision | Choix |
|----------|--------|
| Route publique | `/carriere` |
| Feature flag | `CAREER_GAME_ENABLED` ← `VITE_CAREER_GAME_ENABLED` |
| Routeur | Mini-routage pathname (pas de dépendance React Router en Phase 0) |
| Moteur de jeu | **Non** — Phase 0 uniquement |
| Isolation | Page dédiée hors shell portfolio (évite Navbar ancres sur la page jeu) |
| Build portfolio | Doit rester vert sans le jeu |

## Points ouverts (hors Phase 0)

- Introduction progressive de TypeScript / Vitest.
- Backend d’autorité + auth pour classements.
- Identité visuelle propre au jeu vs. tokens portfolio.
- Alias éventuel `/games/carrermanager` → `/carriere`.
