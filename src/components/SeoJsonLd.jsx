import { site } from '../data/site'
import { getAbsoluteUrl, seo } from '../data/seo'

export default function SeoJsonLd() {
  const sameAs = [site.github, site.linkedin].filter(Boolean)

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${seo.url}/#website`,
        url: `${seo.url}/`,
        name: seo.siteName,
        description: seo.description,
        inLanguage: 'fr-FR',
        publisher: { '@id': `${seo.url}/#person` },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${seo.url}/#profile`,
        url: `${seo.url}/`,
        name: seo.title,
        description: seo.description,
        inLanguage: 'fr-FR',
        isPartOf: { '@id': `${seo.url}/#website` },
        mainEntity: { '@id': `${seo.url}/#person` },
      },
      {
        '@type': 'Person',
        '@id': `${seo.url}/#person`,
        name: site.name,
        url: `${seo.url}/`,
        email: site.email,
        jobTitle: seo.jobTitle,
        description: seo.personDescription,
        knowsAbout: seo.knowsAbout,
        worksFor: {
          '@type': 'Organization',
          name: seo.worksFor,
        },
        sameAs,
        image: getAbsoluteUrl(seo.ogImage),
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}
