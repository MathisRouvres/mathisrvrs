/**
 * Collecte des stats Winamax du club pour /poker, à coller dans la console d'un onglet
 * https://www.pokstats.com connecté (le serveur n'a pas d'accès à pokstats).
 *
 *   1. Coller ce fichier dans la console : il installe l'écoute et définit `pokerCollect`.
 *   2. Faire une recherche de joueur dans pokstats (l'app envoie son en-tête d'authentification,
 *      le script le garde pour ses propres appels, sans le stocker ni l'envoyer ailleurs).
 *   3. await pokerCollect({ key: '<POKER_CLUB_KEY>' })
 *      → relit la liste des pseudos dans le dernier snapshot du site, interroge pokstats joueur
 *        par joueur et envoie le nouveau snapshot à poker-club.php.
 *      Première fois : pokerCollect({ key, players: ['Pseudo1', 'Pseudo2', …] }).
 *
 * pokstats limite le débit (TOO_MANY_REQUESTS après ~6 fiches) : pause de 2,5 s entre joueurs
 * et attente croissante (60 s → 5 min) sur refus. Compter ~10 min pour 60 joueurs.
 * La liste des pseudos n'est pas dans ce dépôt (public) : elle vit dans les snapshots.
 */
;(() => {
  const ENDPOINT = 'https://mathis-rvrs.fr/poker-club.php'
  const SINCE = '2026-09-01'
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const iso = (date) => new Date(String(date).replace(' ', 'T').replace(/\+00$/, 'Z')).toISOString()
  // Jour à l'heure de Paris, comme `days` côté pokstats et le dashboard (22:30 UTC le 31/08 = 1er sept.).
  const parisDay = (isoDate) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(isoDate))

  let auth = null
  const originalFetch = window.fetch
  window.fetch = function (url, options = {}) {
    const header = options.headers?.authorization
    if (header && String(url).includes('pokstats.com/api/')) auth = header
    return originalFetch.apply(this, arguments)
  }

  async function playerStats(nickname) {
    const body = {
      player: { nickname, room: 'WINAMAX', gameType: 'SCHEDULED' },
      tournamentName: null,
      buyInMin: null,
      buyInMax: null,
      entrantsMin: null,
      entrantsMax: null,
      weekDays: null,
      koEnabled: true,
      freezeoutEnabled: true,
    }
    const response = await originalFetch('/api/v1/players/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', web: 'true', authorization: auth },
      body: JSON.stringify(body),
    })
    return { status: response.status, json: await response.json().catch(() => ({})) }
  }

  async function searchNames(nickname) {
    const response = await originalFetch(`/api/v1/players/search?playerNickname=${encodeURIComponent(nickname)}`, {
      headers: { 'Content-Type': 'application/json', web: 'true', authorization: auth },
    })
    const json = response.ok ? await response.json() : { players: [] }
    return (json.players ?? []).map((p) => p.playerNickname)
  }

  function trim(nickname, pokstatsName, stats) {
    const g = stats.globalStatsData
    const recent = stats.recentTournaments ?? []
    const oldest = recent.length ? parisDay(iso(recent.at(-1).date)) : null
    return {
      nickname,
      found: true,
      pokstatsName,
      updatedAt: stats.updatedAt ? iso(stats.updatedAt) : null,
      career: {
        stake: g.stakeTotal,
        rake: g.rakeTotal,
        profit: g.profit,
        count: g.count,
        entries: g.entriesCount,
        itm: g.itmRatio,
        abi: g.avgStake,
        score: g.score,
        firstGame: g.firstGameDate ? iso(g.firstGameDate) : null,
        lastGame: g.lastGameDate ? iso(g.lastGameDate) : null,
      },
      days: (stats.activityData?.days ?? [])
        .filter((d) => d.day >= SINCE)
        .map((d) => [d.day, d.tournaments, d.entries, d.stake, d.profit]),
      tournaments: recent
        .map((t) => [iso(t.date), t.buyIn ?? 0, t.entries ?? 0, t.tournamentName ?? '', t.gain ?? 0, t.profit ?? 0, t.finalPosition ?? 0])
        .filter((t) => parisDay(t[0]) >= SINCE),
      // Compte gratuit : 100 derniers tournois au plus. Complet s'ils remontent avant SINCE.
      tournamentsComplete: recent.length < 100 || (oldest !== null && oldest < SINCE),
    }
  }

  async function collectOne(nickname, log) {
    let wait = 60_000
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { status, json } = await playerStats(nickname)
      if (status === 429 || json.error === 'TOO_MANY_REQUESTS') {
        log(`${nickname} : limite pokstats, pause ${wait / 1000} s`)
        await sleep(wait)
        wait = Math.min(wait * 2, 300_000)
        continue
      }
      if (json.stats) return trim(nickname, nickname, json.stats)
      if (json.error === 'PLAYER_NOT_FOUND') {
        await sleep(1500)
        const names = await searchNames(nickname)
        const exact = names.find((n) => n.toLowerCase() === nickname.toLowerCase())
        if (exact && exact !== nickname) {
          await sleep(1500)
          const retry = await playerStats(exact)
          if (retry.json.stats) return trim(nickname, exact, retry.json.stats)
        }
        return { nickname, found: false, error: 'not-found', candidates: names.slice(0, 5) }
      }
      return { nickname, found: false, error: String(json.error ?? `http-${status}`).slice(0, 40) }
    }
    return { nickname, found: false, error: 'rate-limited' }
  }

  window.pokerCollect = async function pokerCollect({ key, players, endpoint = ENDPOINT, log = console.log } = {}) {
    if (!key) throw new Error('Clé POKER_CLUB_KEY manquante.')
    if (!auth) throw new Error('Fais d’abord une recherche de joueur dans pokstats (connecté).')

    let list = players
    if (!list) {
      const response = await originalFetch(`${endpoint}?action=snapshot`, { headers: { 'X-Club-Key': key } })
      if (!response.ok) throw new Error(`Lecture du snapshot : HTTP ${response.status}`)
      list = ((await response.json()).snapshot?.players ?? []).map((p) => p.nickname)
      if (!list.length) throw new Error('Aucun snapshot : passe la liste avec { players: [...] }.')
    }
    const seen = new Set()
    list = list.map((n) => n.trim()).filter((n) => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()))

    const results = []
    for (const [index, nickname] of list.entries()) {
      results.push(await collectOne(nickname, log))
      log(`${index + 1}/${list.length} ${nickname}${results.at(-1).found ? '' : ' (introuvable)'}`)
      await sleep(2500)
    }

    const snapshot = { since: SINCE, generatedAt: new Date().toISOString(), players: results }
    // Gardé dans la page : un import refusé ne fait pas perdre la collecte (renvoi manuel possible).
    window.pokerLastSnapshot = snapshot
    // Session expirée ou pokstats en panne : on n'écrase pas le dernier bon snapshot.
    const failed = results.filter((p) => !p.found && p.error !== 'not-found').length
    if (!results.some((p) => p.found) || failed > results.length * 0.2) {
      throw new Error(`${failed} joueurs en erreur (session pokstats expirée ?) : import annulé, voir window.pokerLastSnapshot.`)
    }
    const response = await originalFetch(`${endpoint}?action=import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Club-Key': key },
      body: JSON.stringify(snapshot),
    })
    const answer = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Import refusé : ${answer.message ?? response.status}`)
    log(`Snapshot importé : ${answer.players} joueurs.`)
    return snapshot
  }
})()
