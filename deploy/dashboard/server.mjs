// Dashboard privé (dashboard.mathis-rvrs.fr), sans dépendance.
// Derrière le Caddy frontal (snippet « private ») : l'authentification est déjà faite, le compte
// connecté arrive dans X-Auth-User. Ce service ne gère ni mot de passe ni session.
//
// Portail : Stats et Poker (liens vers le site public) + Security (UI des rapports de scan.sh,
// lus dans REPORTS_DIR, un sous-dossier <host>-<timestamp> par scan).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.PORT || 8300);
const REPORTS_DIR = process.env.REPORTS_DIR || '/reports';
const STATS_URL = process.env.STATS_URL || 'https://mathis-rvrs.fr/stats';
const POKER_URL = process.env.POKER_URL || 'https://mathis-rvrs.fr/poker';
// Lancement de scan depuis le web : scan.sh (dans l'image) orchestre les outils comme conteneurs
// freres via le socket Docker ; ils ecrivent dans le volume nomme SCAN_DOCKER_VOLUME.
const ORIGIN = process.env.ORIGIN || 'https://dashboard.mathis-rvrs.fr';
const SCAN_SCRIPT = process.env.SCAN_SCRIPT || '/app/scan.sh';
const SCAN_VOLUME = process.env.SCAN_DOCKER_VOLUME || '';
// Dossier de scan valide : <host>-AAAAMMJJ-HHMMSS (host = lettres/chiffres/point/tiret).
const SCAN_DIR = /^[a-z0-9.-]+-\d{8}-\d{6}$/i;

const log = (...a) => console.log(new Date().toISOString(), ...a);

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// --- Style commun (hash pour la CSP) ---
const STYLE = `
:root{color-scheme:light dark;--bg:#f6f5f2;--card:#fff;--fg:#1d1d1f;--muted:#5f6368;--line:#d7d4cd;--accent:#2f5bd3;--ok:#1a7f37;--warn:#9a6700;--err:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--card:#1e1e1e;--fg:#ececec;--muted:#a3a3a3;--line:#353535;--accent:#8aa8ff;--ok:#56d364;--warn:#e3b341;--err:#ff8a80}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:860px;margin:0 auto;padding:28px 16px 64px}
header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:8px}
h1{font-size:1.4rem;margin:0}h2{font-size:1.1rem;margin:28px 0 10px}
.who{color:var(--muted);font-size:.9rem}
p{margin:0 0 14px;color:var(--muted)}
a{color:var(--accent)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:10px}
.card{display:block;padding:18px;border:1px solid var(--line);border-radius:14px;background:var(--card);color:inherit;text-decoration:none}
.card:hover{border-color:var(--accent)}.card h3{margin:0 0 6px;font-size:1.05rem}.card span{color:var(--muted);font-size:.9rem}
table{width:100%;border-collapse:collapse;font-size:.92rem}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600}
.tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:.8rem;font-weight:600;border:1px solid var(--line)}
.tag.ok{color:var(--ok)}.tag.warn{color:var(--warn)}.tag.err{color:var(--err)}
.back{display:inline-block;margin-bottom:12px;font-size:.9rem}
.md h1,.md h2,.md h3{margin:18px 0 8px}
.md pre{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;overflow:auto;font-size:.85rem}
.md code{font-family:ui-monospace,Menlo,Consolas,monospace}
.md ul{margin:0 0 14px;padding-left:20px}
.raw{margin-top:18px}.raw a{display:inline-block;margin:0 10px 8px 0}
.empty{padding:24px;border:1px dashed var(--line);border-radius:12px;text-align:center}
form.scan{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:4px 0 22px;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
form.scan input[type=url]{flex:1 1 260px;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:transparent;color:inherit}
form.scan .chk{display:flex;gap:8px;align-items:center;font-size:.9rem;color:var(--muted);flex:1 1 100%}
form.scan button{font:inherit;font-weight:600;padding:10px 16px;border:0;border-radius:9px;background:var(--accent);color:#fff;cursor:pointer}
@media (prefers-color-scheme:dark){form.scan button{color:#111}}
form.scan button:hover{filter:brightness(1.08)}
input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}`;
const STYLE_HASH = crypto.createHash('sha256').update(STYLE).digest('base64');

function page(res, status, title, body) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'none'; style-src 'sha256-${STYLE_HASH}'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  });
  res.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`);
}

// Compte connecté transmis par le frontal (jamais forgeable : le frontal retire tout X-Auth-User
// venu du client avant de poser le sien). En local (hors frontal), inconnu.
const whoHtml = (req) => {
  const u = String(req.headers['x-auth-user'] || '').trim();
  return u ? `<span class="who">Connecté : ${escapeHtml(u)}</span>` : '';
};

// --- Lecture des rapports de scan ---
function readScanDir(name) {
  const dir = path.join(REPORTS_DIR, name);
  const read = (f) => {
    try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return ''; }
  };
  const report = read('report.md');
  const nuclei = read('nuclei.txt');
  const headers = read('headers-analysis.txt');
  const mode = /Mode\s*:\s*(.+)/.exec(report)?.[1]?.trim() || '';
  const date = /Date\s*:\s*(.+)/.exec(report)?.[1]?.trim() || '';
  const nucleiCount = nuclei
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('(')).length;
  const missingHeaders = (headers.match(/\[MANQUE\]/g) || []).length;
  // host = tout sauf le suffixe -AAAAMMJJ-HHMMSS.
  const host = name.replace(/-\d{8}-\d{6}$/, '');
  return { name, host, date, mode, nucleiCount, missingHeaders };
}

function listScans() {
  let entries;
  try {
    entries = fs.readdirSync(REPORTS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && SCAN_DIR.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse() // le timestamp en suffixe trie par date décroissante
    .map(readScanDir);
}

// Fichiers bruts consultables depuis la page d'un scan.
const RAW_FILES = [
  ['report.md', 'rapport.md'],
  ['zap-report.html', 'ZAP (HTML)'],
  ['nuclei.txt', 'nuclei'],
  ['testssl.txt', 'testssl'],
  ['headers.txt', 'en-têtes bruts'],
];

// --- Rendu Markdown minimal (rapports produits par scan.sh : titres, listes, blocs ```) ---
function renderMarkdown(md) {
  const lines = md.split('\n');
  let html = '';
  let inCode = false;
  let inList = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  for (const raw of lines) {
    if (raw.startsWith('```')) {
      if (inCode) { html += '</code></pre>'; inCode = false; }
      else { closeList(); html += '<pre><code>'; inCode = true; }
      continue;
    }
    if (inCode) { html += escapeHtml(raw) + '\n'; continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(raw);
    if (h) { closeList(); html += `<h${h[1].length}>${escapeHtml(h[2])}</h${h[1].length}>`; continue; }
    if (/^[-*]\s+/.test(raw)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${escapeHtml(raw.replace(/^[-*]\s+/, ''))}</li>`;
      continue;
    }
    closeList();
    if (raw.trim()) html += `<p>${escapeHtml(raw)}</p>`;
  }
  if (inCode) html += '</code></pre>';
  closeList();
  return html;
}

// --- Pages ---
function homePage(res, req) {
  const card = (href, title, sub) =>
    `<a class="card" href="${escapeHtml(href)}"><h3>${escapeHtml(title)}</h3><span>${escapeHtml(sub)}</span></a>`;
  page(res, 200, 'Dashboard', `<header><h1>Dashboard</h1>${whoHtml(req)}</header>
<p>Espace privé mathis-rvrs.fr.</p>
<div class="cards">
${card(STATS_URL, 'Stats', "Statistiques d'usage du site")}
${card(POKER_URL, 'Poker', 'Stats du club Winamax')}
${card('/security', 'Security', 'Rapports de scan de sécurité')}
</div>`);
}

function securityListPage(res, req) {
  const scans = listScans();
  const sev = (n) => `<span class="tag ${n === 0 ? 'ok' : 'warn'}">${n}</span>`;
  const rows = scans.map((s) => `<tr>
<td><a href="/security/${encodeURIComponent(s.name)}">${escapeHtml(s.host)}</a><br><span class="who">${escapeHtml(s.date)}</span></td>
<td>${escapeHtml(s.mode || '—')}</td>
<td>${sev(s.nucleiCount)} nuclei</td>
<td>${sev(s.missingHeaders)} en-têtes manquants</td>
</tr>`).join('');
  const table = scans.length
    ? `<table><thead><tr><th>Cible / date</th><th>Mode</th><th>Findings</th><th>En-têtes</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="empty">Aucun scan pour l'instant. Lancer un scan ci-dessus.</div>`;
  const form = `<form class="scan" method="post" action="/security/scan">
<input type="url" name="url" placeholder="https://cible-autorisee.fr" required autocomplete="off" spellcheck="false">
<button type="submit">Scanner</button>
<label class="chk"><input type="checkbox" name="authorized" value="yes" required> J'ai l'autorisation écrite du propriétaire de cette cible (obligatoire, scan passif).</label>
</form>`;
  page(res, 200, 'Security', `<header><h1>Security</h1>${whoHtml(req)}</header>
<a class="back" href="/">← Dashboard</a>${form}${table}`);
}

// Même origine exigée pour le POST (en plus du login amont) : anti-CSRF.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (origin && origin !== 'null') return origin === ORIGIN;
  return req.headers['sec-fetch-site'] === 'same-origin';
}

function readForm(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 4096) { reject(new Error('trop gros')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => resolve(new URLSearchParams(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', reject);
  });
}

// Lance un scan depuis le web. Garde-fous : même origine, case d'autorisation cochée, URL http(s).
// scan.sh tourne en tâche de fond (quelques minutes) et écrit dans le volume ; on crée aussitôt un
// report.md « en cours » et on redirige vers la page du scan.
async function handleScan(req, res) {
  if (!sameOrigin(req)) return page(res, 403, 'Refusé', '<h1>Requête refusée</h1>');
  let form;
  try { form = await readForm(req); } catch { return page(res, 413, 'Refusé', '<h1>Requête refusée</h1>'); }
  const target = (form.get('url') || '').trim();
  if (form.get('authorized') !== 'yes') {
    return page(res, 400, 'Autorisation requise', '<h1>Autorisation requise</h1><p>Cocher la case d\'autorisation avant de lancer un scan.</p><a class="back" href="/security">← Security</a>');
  }
  let host;
  try {
    const u = new URL(target);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('schéma');
    host = u.hostname;
  } catch {
    return page(res, 400, 'URL invalide', '<h1>URL invalide</h1><p>Entrer une URL http(s) valide.</p><a class="back" href="/security">← Security</a>');
  }
  const safeHost = host.replace(/[^a-z0-9.-]/gi, '') || 'cible';
  const ts = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-'); // AAAAMMJJ-HHMMSS
  const rel = `${safeHost}-${ts}`;
  const dir = path.join(REPORTS_DIR, rel);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'report.md'),
      `# Scan en cours - ${host}\n\n- Cible      : ${target}\n- Date       : ${new Date().toISOString().slice(0, 19).replace('T', ' ')}\n- Mode       : passif (non intrusif)\n\nScan en cours… rafraîchir la page dans quelques minutes.\n`);
  } catch (err) {
    log('scan: mkdir/stub', err);
    return page(res, 500, 'Erreur', '<h1>Erreur</h1><a class="back" href="/security">← Security</a>');
  }
  const logFd = fs.openSync(path.join(dir, 'scan.log'), 'a');
  const child = spawn('bash', [SCAN_SCRIPT, target, '--i-am-authorized'], {
    cwd: path.dirname(SCAN_SCRIPT),
    env: { ...process.env, SCAN_OUTPUT_DIR: REPORTS_DIR, SCAN_REL: rel, SCAN_DOCKER_VOLUME: SCAN_VOLUME },
    stdio: ['ignore', logFd, logFd],
    detached: true,
  });
  child.on('error', (err) => log('scan: spawn', err));
  child.unref();
  fs.closeSync(logFd);
  log(`scan lancé cible=${target} rel=${rel} user=${String(req.headers['x-auth-user'] || '?')}`);
  redirect(res, `/security/${encodeURIComponent(rel)}`, 303);
}

function redirect(res, location, status = 303) {
  res.writeHead(status, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
}

function securityScanPage(res, req, name) {
  const dir = path.join(REPORTS_DIR, name);
  let report;
  try { report = fs.readFileSync(path.join(dir, 'report.md'), 'utf8'); } catch { report = ''; }
  if (!report) return page(res, 404, 'Scan introuvable', '<h1>Scan introuvable</h1><a class="back" href="/security">← Security</a>');
  const raw = RAW_FILES
    .filter(([f]) => fs.existsSync(path.join(dir, f)))
    .map(([f, label]) => `<a href="/security/${encodeURIComponent(name)}/raw/${encodeURIComponent(f)}">${escapeHtml(label)}</a>`)
    .join('');
  page(res, 200, `Scan ${name}`, `<header><h1>Scan</h1>${whoHtml(req)}</header>
<a class="back" href="/security">← Security</a>
<div class="md">${renderMarkdown(report)}</div>
<div class="raw"><h2>Fichiers bruts</h2>${raw}</div>`);
}

// Fichier brut d'un scan. Chemin verrouillé : dossier et fichier doivent exister tels quels et ne
// jamais sortir de REPORTS_DIR (anti path traversal).
function securityRawFile(res, name, file) {
  if (file.includes('/') || file.includes('\\') || file.includes('..')) return notFound(res);
  const full = path.join(REPORTS_DIR, name, file);
  const base = path.resolve(REPORTS_DIR);
  if (!path.resolve(full).startsWith(base + path.sep)) return notFound(res);
  let data;
  try { data = fs.readFileSync(full); } catch { return notFound(res); }
  // Rapport ZAP = HTML autoportant qu'on a généré ; le reste en texte brut. Rendu en bac à sable.
  const type = file.endsWith('.html') ? 'text/html; charset=utf-8'
    : file.endsWith('.json') ? 'application/json; charset=utf-8'
    : 'text/plain; charset=utf-8';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "sandbox allow-same-origin; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    'Referrer-Policy': 'no-referrer',
  });
  res.end(data);
}

function notFound(res) {
  page(res, 404, 'Introuvable', '<h1>Page introuvable</h1><a class="back" href="/">← Dashboard</a>');
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname.replace(/\/+$/, '') || '/';
    if (p === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, scans: listScans().length }));
    }
    if (req.method === 'POST' && p === '/security/scan') return await handleScan(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') return notFound(res);
    if (p === '/') return homePage(res, req);
    if (p === '/security') return securityListPage(res, req);
    const raw = /^\/security\/([^/]+)\/raw\/([^/]+)$/.exec(p);
    if (raw) {
      const name = decodeURIComponent(raw[1]);
      if (!SCAN_DIR.test(name)) return notFound(res);
      return securityRawFile(res, name, decodeURIComponent(raw[2]));
    }
    const scan = /^\/security\/([^/]+)$/.exec(p);
    if (scan) {
      const name = decodeURIComponent(scan[1]);
      if (!SCAN_DIR.test(name)) return notFound(res);
      return securityScanPage(res, req, name);
    }
    notFound(res);
  } catch (err) {
    log('erreur', err);
    if (!res.headersSent) page(res, 500, 'Erreur', '<h1>Erreur</h1>');
  }
});

server.listen(PORT, '0.0.0.0', () => log(`dashboard → :${PORT} (rapports ${REPORTS_DIR})`));
const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

export { server };
