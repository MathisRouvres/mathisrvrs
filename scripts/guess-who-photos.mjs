/**
 * Génère src/features/party/content/guessWhoPhotos.ts : la photo de chaque
 * suspect du Qui est-ce ?, tirée de l'image principale de son article
 * Wikipédia (FR), avec auteur et licence lus sur Wikimedia Commons.
 * Seules les licences libres (domaine public, CC0, CC BY, CC BY-SA, GFDL) sont
 * retenues ; un suspect sans photo libre garde son emoji.
 *
 * Usage : npm run party:photos
 */
import { writeFileSync } from 'node:fs'
import { suspects } from '../src/features/party/content/guessWho.ts'

const API = 'https://fr.wikipedia.org/w/api.php'
const WIKIDATA = 'https://www.wikidata.org/w/api.php'
const OUT = new URL('../src/features/party/content/guessWhoPhotos.ts', import.meta.url)
const HEADERS = { 'User-Agent': 'mathisrvrs-party-photos/1.0 (https://github.com/MathisRouvres/mathisrvrs)' }
const WIDTH = 330
const FREE = /^(public domain|domaine public|pd|cc0|cc[ -]by|gfdl|attribution|copyrighted free use|no restrictions)/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(params, endpoint = API) {
  const url = `${endpoint}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`
  for (let attempt = 0; attempt < 4; attempt++) {
    // Rythme poli : Wikimedia limite les requêtes anonymes.
    await sleep(1500 * (attempt + 1))
    const res = await fetch(url, { headers: HEADERS })
    if (res.ok) return res.json()
    if (res.status === 429) await sleep(30_000)
  }
  throw new Error(`Wikipédia injoignable : ${url}`)
}

const chunks = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

const plain = (html = '') =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, '’')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)

/** Titre d'article → image principale de l'article et identifiant Wikidata. */
async function pageImages(titles) {
  const out = new Map()
  for (const batch of chunks(titles, 20)) {
    const data = await api({
      action: 'query',
      redirects: '1',
      prop: 'pageimages|pageprops',
      piprop: 'name',
      ppprop: 'disambiguation|wikibase_item',
      titles: batch.join('|'),
    })
    const alias = new Map()
    for (const { from, to } of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])]) alias.set(from, to)
    const pages = new Map(data.query.pages.map((p) => [p.title, p]))
    for (const title of batch) {
      let t = title
      for (let hops = 0; alias.has(t) && hops < 5; hops++) t = alias.get(t)
      const page = pages.get(t)
      if (page && !page.missing && !page.pageprops?.disambiguation) {
        out.set(title, { file: page.pageimage, qid: page.pageprops?.wikibase_item })
      }
    }
  }
  return out
}

/** Identifiant Wikidata → image officielle (propriété P18, toujours sur Commons). */
async function wikidataImages(qids) {
  const out = new Map()
  for (const batch of chunks(qids, 20)) {
    const data = await api({ action: 'wbgetentities', ids: batch.join('|'), props: 'claims' }, WIKIDATA)
    for (const [qid, entity] of Object.entries(data.entities ?? {})) {
      const file = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value
      if (file) out.set(qid, file.replace(/ /g, '_'))
    }
  }
  return out
}

/**
 * Vignette standard Wikimedia d'après l'URL de l'original
 * (…/commons/a/ab/X.jpg → …/commons/thumb/a/ab/X.jpg/330px-X.jpg).
 */
function thumb(url) {
  const m = url?.split('?')[0].match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/(.+\/)([^/]+)$/)
  if (!m) return null
  const [, base, dirs, file] = m
  const ext = file.split('.').pop().toLowerCase()
  const suffix = ext === 'svg' ? '.png' : ext === 'tif' || ext === 'tiff' ? '.jpg' : ''
  const prefix = ext === 'tif' || ext === 'tiff' ? `lossy-page1-${WIDTH}px` : `${WIDTH}px`
  return `${base}/thumb/${dirs}${file}/${prefix}-${file}${suffix}`
}

/** Fichier → vignette, auteur et licence (libres uniquement). */
async function fileInfo(files) {
  const out = new Map()
  for (const batch of chunks(files, 20)) {
    const data = await api({
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiextmetadatafilter: 'LicenseShortName|Artist|Credit',
      titles: batch.map((f) => `File:${f}`).join('|'),
    })
    const alias = new Map((data.query.normalized ?? []).map(({ from, to }) => [from, to]))
    const pages = new Map(data.query.pages.map((p) => [p.title, p]))
    for (const f of batch) {
      const info = pages.get(alias.get(`File:${f}`) ?? `File:${f}`)?.imageinfo?.[0]
      const src = info && thumb(info.url)
      if (!src) continue
      const meta = info.extmetadata ?? {}
      const license = plain(meta.LicenseShortName?.value)
      if (!FREE.test(license)) continue
      out.set(f, {
        src,
        page: info.descriptionurl.split('?')[0],
        license,
        author: plain(meta.Artist?.value) || plain(meta.Credit?.value) || 'Auteur inconnu',
      })
    }
  }
  return out
}

const all = Object.values(suspects).flat()
const titleOf = (s) => s.wiki ?? s.name
const pages = await pageImages([...new Set(all.map(titleOf))])
const wikidata = await wikidataImages([...new Set([...pages.values()].map((p) => p.qid).filter(Boolean))])
const candidates = (s) => {
  const page = pages.get(titleOf(s))
  // Un SVG est un logo ou un blason, jamais un portrait.
  return [page?.file, page?.qid && wikidata.get(page.qid)].filter((f) => f && !/\.svg$/i.test(f))
}
const infos = await fileInfo([...new Set(all.flatMap(candidates))])

const photos = {}
const missing = []
for (const s of all) {
  // Image de l'article en priorité, sinon celle de Wikidata.
  const info = candidates(s).map((f) => infos.get(f)).find(Boolean)
  if (info) photos[s.name] = info
  else missing.push(s.name)
}

writeFileSync(
  OUT,
  `/* Généré par scripts/guess-who-photos.mjs (npm run party:photos) : ne pas modifier à la main. */

export interface SuspectPhoto {
  /** Vignette hébergée par Wikimedia. */
  src: string
  /** Page du fichier sur Wikimedia Commons (crédits complets). */
  page: string
  license: string
  author: string
}

export const suspectPhotos: Record<string, SuspectPhoto> = ${JSON.stringify(photos, null, 2)}
`,
)

console.log(`${Object.keys(photos).length}/${all.length} photos libres.`)
if (missing.length) console.log(`Sans photo : ${missing.join(', ')}`)
