# mathis-rvrs.fr

Portfolio personnel de **Mathis Rouvres** — développeur web full-stack, product builder et UX/UI.

Stack : React 19 · Vite 8 · Tailwind CSS v4 · déploiement sur VPS (FrankenPHP, `deploy/site`).

## Commandes

```bash
npm install
npm run dev      # développement local
npm run build    # build production → dist/
npm run preview  # prévisualiser le build
npm run lint
```

## Déploiement

Chaque push sur `main` (`.github/workflows/deploy.yml`) : lint, typecheck, tests, build, puis
`dist/` envoyé par rsync sur le VPS, servi sur **https://mathis-rvrs.fr** par FrankenPHP derrière
le Caddy frontal (`deploy/site`, `deploy/edge`). Smoke test : `scripts/smoke-test.sh`.

## Calendrier de disponibilités (`/dispo`)

Page partagée par lien, non indexée : on choisit son profil (prénom + photo facultative, sans
compte), puis on coche ses créneaux de 30 min (8 h–23 h) : « Cette semaine » pour une date,
« Chaque semaine » pour une règle permanente (une date précise peut être décochée sans casser la
règle). Chaque case montre les têtes (photo ou initiale) des personnes dispo ; les créneaux
communs sont listés, ceux à 4 personnes ou plus sont mis en avant. Code : `src/features/dispo/`.

Données dans le MySQL du VPS (base `dispo`), via `public/dispo-api.php` servi par FrankenPHP ;
tables créées au premier appel. Mise en place serveur : `deploy/site/README.md` (section 4).
Sans compte, toute personne qui a le lien peut créer un profil (60 max) et modifier n'importe
quel calendrier. Supprimer un profil : `DELETE FROM dispo_people WHERE name = '…'` dans
phpMyAdmin (les créneaux suivent).

## Club de poker (`/poker`)

Page privée (mot de passe, non indexée) : stats Winamax des joueurs du club depuis le 1er septembre —
entrées, buy-ins, ABI, rake estimé, profit, ROI, dernier jeu — filtrables par dates, tranche de
buy-in et pseudo ; un clic sur un pseudo ouvre ses tournois. Code : `src/features/poker/`
(calculs testés dans `club.ts`).

Source : pokstats.com, seulement avec une session connectée (le serveur n'y a pas accès, la
recherche sans compte bloque après ~6 joueurs). Avec un compte gratuit, chaque fiche donne
l'activité jour par jour (totaux exacts) mais seulement les 100 derniers tournois. Chaque import
est fusionné avec le snapshot précédent : le détail des tournois s'accumule d'une collecte à
l'autre. Collecter tous les 2–3 jours le garde complet ; sinon le filtre de buy-in et la
répartition par tranche sont partiels pour les joueurs concernés (marqués *).
Le rake n'est publié que sur la carrière : rake de la période ≈ buy-ins × taux de rake carrière.

- Serveur : mot de passe `POKER_CLUB_KEY` (8 caractères min) dans `/opt/site/.env`, puis
  `docker compose up -d` dans `/opt/site`. 10 échecs depuis une IP la bloquent 15 minutes.
  Snapshots dans le MySQL du VPS (`DATABASE_URL`, tables `poker_snapshots` et
  `poker_auth_failures` créées au premier appel, 20 snapshots gardés).
- Actualiser : coller `scripts/poker-collect.js` dans la console d'un onglet pokstats connecté,
  faire une recherche de joueur, puis `await pokerCollect({ key: '…' })` (~10 min pour 60
  joueurs, pokstats limite le débit). La liste des pseudos vit dans les snapshots, pas dans ce
  dépôt public ; ajouter ou retirer un joueur : `pokerCollect({ key, players: [...] })`.

## Formulaire de contact

Le formulaire envoie les messages via **`public/contact.php`** (copié dans `dist/contact.php` au build).

- Destinataire : `rouvresmathis@gmail.com`
- Expéditeur serveur : `contact@mathis-rvrs.fr`
- Honeypot + délai minimum anti-spam côté PHP

**Variable d'environnement (optionnelle) :**

```bash
# .env.local — ex. proxy vers un serveur PHP local
VITE_CONTACT_ENDPOINT=http://localhost:8080/contact.php
```

**Test local PHP :**

```bash
npm run build
php -S localhost:8080 -t dist
# Ouvrir http://localhost:8080 et tester le formulaire
```

**Configuration OVH :**

- Vérifier que PHP est activé sur l'hébergement.
- Configurer l'adresse **`contact@mathis-rvrs.fr`** sur OVH (voir guide ci-dessous).
- Vérifier les enregistrements SPF/DMARC du domaine si les emails arrivent en spam.

---

## SEO

### Fichiers SEO

| Fichier | Rôle |
|---------|------|
| `index.html` | Meta title, description, canonical, Open Graph, Twitter Cards |
| `public/robots.txt` | Autorise l'indexation + lien sitemap |
| `public/sitemap.xml` | URLs principales et ancres de section |
| `public/og-image.svg` | Image de partage social (1200×630) |
| `public/manifest.webmanifest` | Manifest PWA léger |
| `src/data/seo.js` | Configuration SEO centralisée |
| `src/components/SeoJsonLd.jsx` | Données structurées JSON-LD (Person, WebSite, ProfilePage) |

### Modifier la meta description ou le titre

1. **`index.html`** — balises `<title>`, `meta description`, Open Graph et Twitter (référence crawl initial).
2. **`src/data/seo.js`** — source centralisée pour JSON-LD et maintenance future.

### Modifier l'image Open Graph

1. Remplacer ou éditer **`public/og-image.svg`**.
2. Mettre à jour les URLs dans **`index.html`** (`og:image`, `twitter:image`).
3. Mettre à jour **`src/data/seo.js`** → `ogImage`.

> **Note :** Facebook et LinkedIn préfèrent une image **PNG/JPG 1200×630**.  
> Exporter `og-image.svg` en `public/og-image.png` améliore la compatibilité des aperçus sociaux.

### Google Search Console

1. Ajouter la propriété **https://mathis-rvrs.fr** dans [Google Search Console](https://search.google.com/search-console).
2. Vérifier le domaine (DNS TXT ou fichier HTML fourni par Google).
3. Soumettre le sitemap : `https://mathis-rvrs.fr/sitemap.xml`.
4. Inspecter l'URL d'accueil pour vérifier l'indexation.
5. Tester les performances avec [PageSpeed Insights](https://pagespeed.web.dev/).

### Tests locaux

```bash
npm run build && npm run preview
```

Puis vérifier :

- http://localhost:4173/robots.txt
- http://localhost:4173/sitemap.xml
- http://localhost:4173/og-image.svg
- Meta tags dans le code source de la page
- Partage social : [Open Graph Debugger](https://developers.facebook.com/tools/debug/) (après déploiement)

### Ancres de navigation

| Section | ID |
|---------|-----|
| Pro | `#pro` |
| Projets | `#projets` |
| Compétences | `#competences` |
| Passions | `#passions` |
| Parcours | `#parcours` |
| Contact | `#contact` |
