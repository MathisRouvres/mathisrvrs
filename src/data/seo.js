/** Configuration SEO centralisée — modifier ici pour meta, OG et JSON-LD */
export const seo = {
  url: 'https://mathis-rvrs.fr',
  siteName: 'Mathis Rouvres',
  title: 'Mathis Rouvres — Développeur Web & Product Builder',
  description:
    'Développeur web full-stack spécialisé en React, Laravel, PHP, UX/UI, SaaS et automatisation IA. Découvrez mon parcours, mes projets et mon univers tech.',
  locale: 'fr_FR',
  language: 'fr',
  ogType: 'website',
  ogImage: '/og-image.svg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt:
    'Mathis Rouvres — Développeur web full-stack, portfolio React, Laravel, SaaS et IA',
  twitterCard: 'summary_large_image',
  jobTitle: 'Développeur web full-stack',
  personDescription:
    'Développeur web spécialisé en React, Laravel, PHP, UX/UI, SaaS et automatisation IA.',
  knowsAbout: [
    'React',
    'Laravel',
    'PHP',
    'MySQL',
    'JavaScript',
    'UX/UI',
    'SaaS',
    'Automatisation IA',
    'Cursor',
    'Backoffice',
    'Sécurité web',
  ],
  worksFor: 'MYAgency',
  sitemapSections: [
    { path: '/', priority: '1.0', changefreq: 'monthly' },
    { path: '/#pro', priority: '0.9', changefreq: 'monthly' },
    { path: '/#projets', priority: '0.9', changefreq: 'monthly' },
    { path: '/#competences', priority: '0.8', changefreq: 'monthly' },
    { path: '/#passions', priority: '0.7', changefreq: 'monthly' },
    { path: '/#parcours', priority: '0.8', changefreq: 'monthly' },
    { path: '/#contact', priority: '0.8', changefreq: 'yearly' },
  ],
}

export function getAbsoluteUrl(path = '/') {
  const base = seo.url.replace(/\/$/, '')
  if (path.startsWith('http')) return path
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}
