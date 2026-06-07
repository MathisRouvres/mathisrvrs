# mathis-rvrs.fr

Portfolio personnel de **Mathis Rouvres** — développeur web full-stack, product builder et UX/UI.

Stack : React 19 · Vite 8 · Tailwind CSS v4 · déploiement statique OVH.

## Commandes

```bash
npm install
npm run dev      # développement local
npm run build    # build production → dist/
npm run preview  # prévisualiser le build
npm run lint
```

## Déploiement

Le dossier `dist/` est servi sur **https://mathis-rvrs.fr** via Apache/OVH.  
Le fichier `public/.htaccess` gère le HTTPS, le fallback SPA et les fichiers statiques (`robots.txt`, `sitemap.xml`).

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
