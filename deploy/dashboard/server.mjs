// Dashboard privé (dashboard.mathis-rvrs.fr), sans dépendance.
// Derrière le Caddy frontal (snippet « private ») : l'authentification est déjà faite, le compte
// connecté arrive dans X-Auth-User. Ce service ne gère ni mot de passe ni session.
//
// Portail : Stats et Poker (liens vers le site public) + Security (UI des rapports de scan.sh,
// lus dans REPORTS_DIR, un sous-dossier <host>-<timestamp> par scan) + Serveur (usage du VPS,
// voir system.mjs).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { hostSnapshot, dockerSnapshot, dockerGet, cpuNow, cpuHistory } from './system.mjs';
import {
  UFW_LIMIT_HITS, validIp, isSelf, sshLimitList, sshLimitRemove, findContainer, containerLogs, containerAction, dockerPrune,
} from './console.mjs';

const PORT = Number(process.env.PORT || 8300);
const REPORTS_DIR = process.env.REPORTS_DIR || '/reports';
const STATS_URL = process.env.STATS_URL || 'https://mathis-rvrs.fr/stats';
const PROSPECT_URL = process.env.PROSPECT_URL || 'https://prospect.mathis-rvrs.fr';
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
input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.tile{padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--card)}
.tile h3{margin:0;font-size:.85rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.tile .big{font-size:1.3rem;font-weight:700;font-variant-numeric:tabular-nums;margin:4px 0}
.tile .sub{color:var(--muted);font-size:.85rem;font-variant-numeric:tabular-nums}
meter{display:block;width:100%;height:10px;margin:6px 0}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.spark{display:block;width:100%;height:70px;border:1px solid var(--line);border-radius:10px;background:var(--card)}
.spark polyline{fill:none;stroke:var(--accent);stroke-width:1.5;vector-effect:non-scaling-stroke}
.spark line{stroke:var(--line);stroke-dasharray:3 3;vector-effect:non-scaling-stroke}
.scroll{overflow-x:auto}
form.inline{display:inline}
.btn{font:inherit;font-size:.85rem;font-weight:600;padding:5px 11px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg);cursor:pointer;text-decoration:none;display:inline-block}
.btn:hover{border-color:var(--accent)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
@media (prefers-color-scheme:dark){.btn.primary{color:#111}}
.btn.danger{color:var(--err);border-color:var(--err)}
.actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.flash{padding:10px 14px;border:1px solid var(--line);border-radius:10px;margin:0 0 16px;font-weight:600}
.flash.ok{color:var(--ok);border-color:var(--ok)}.flash.err{color:var(--err);border-color:var(--err)}
form.row{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
form.row input{font:inherit;flex:0 1 240px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:inherit}
pre.logs{max-height:70vh;overflow:auto;margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all}`;
const STYLE_HASH = crypto.createHash('sha256').update(STYLE).digest('base64');

// refresh : rechargement automatique (secondes) via <meta>, la CSP interdit tout script.
function page(res, status, title, body, { refresh } = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'none'; style-src 'sha256-${STYLE_HASH}'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  });
  res.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">${refresh ? `<meta http-equiv="refresh" content="${Number(refresh)}">` : ''}<title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`);
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
${card(PROSPECT_URL, 'Prospection', 'Dashboard de prospection B2B')}
${card('/security', 'Security', 'Rapports de scan de sécurité')}
${card('/server', 'Serveur', 'CPU, mémoire, disque et conteneurs du VPS')}
${card('/console', 'Console', 'Débloquer SSH, logs et redémarrage des conteneurs, nettoyage')}
</div>`);
}

// --- Page Serveur (usage du VPS) ---
const SERVER_REFRESH_S = 30;

function fmtBytes(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0;
  while (Math.abs(n) >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 || n >= 100 ? 0 : 1).replace('.', ',')} ${units[i]}`;
}
const fmtPct = (n) => (n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(n < 10 ? 1 : 0).replace('.', ',')} %`);
function fmtDuration(s) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d} j ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}
// Jauge native (couleur selon seuils low/high), accessible sans CSS ni script.
const meter = (pct, label) => pct == null ? '' :
  `<meter min="0" max="100" low="70" high="90" optimum="0" value="${pct.toFixed(1)}" aria-label="${escapeHtml(label)}">${fmtPct(pct)}</meter>`;

// Courbe 0–100 % sur la dernière heure (SVG inline, pas de script).
function sparkline(points, label) {
  const pts = points.filter((p) => p.v != null);
  if (pts.length < 2) return `<div class="empty">Historique en cours de collecte (un point toutes les 5 s).</div>`;
  const t0 = pts[0].t;
  const span = Math.max(1, pts[pts.length - 1].t - t0);
  const coords = pts.map((p) => `${(((p.t - t0) / span) * 600).toFixed(1)},${(60 - (p.v / 100) * 60).toFixed(1)}`).join(' ');
  const max = Math.max(...pts.map((p) => p.v));
  const avg = pts.reduce((n, p) => n + p.v, 0) / pts.length;
  return `<svg class="spark" viewBox="0 0 600 60" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(`${label} : moyenne ${fmtPct(avg)}, max ${fmtPct(max)}`)}"><line x1="0" y1="30" x2="600" y2="30"/><polyline points="${coords}"/></svg>
<p class="sub">${escapeHtml(label)} — moyenne ${fmtPct(avg)}, pic ${fmtPct(max)}, depuis ${fmtDuration((Date.now() - t0) / 1000)}.</p>`;
}

// État d'un conteneur (c.state / c.status de l'API Docker).
function stateTag(c) {
  const cls = c.state === 'running' ? (/unhealthy/.test(c.status) ? 'err' : /starting/.test(c.status) ? 'warn' : 'ok')
    // exited (0) = tâche ponctuelle terminée normalement (migration, install…).
    : c.state === 'exited' && /\(0\)/.test(c.status) ? ''
    : c.state === 'exited' || c.state === 'dead' ? 'err' : 'warn';
  return `<span class="tag ${cls}">${escapeHtml(c.state)}</span>`;
}

async function serverPage(res, req) {
  const host = hostSnapshot();
  const cpu = cpuNow();
  const docker = await dockerSnapshot();
  const hist = cpuHistory();
  const memPct = host.mem.total ? (host.mem.used / host.mem.total) * 100 : null;
  const swapPct = host.mem.swapTotal ? (host.mem.swapUsed / host.mem.swapTotal) * 100 : null;
  const d = host.disk;
  const diskPct = d ? (d.used / (d.used + d.avail)) * 100 : null;
  const inodePct = d?.inodes ? (d.inodesUsed / d.inodes) * 100 : null;
  const loadPct = (host.load[0] / host.cores) * 100;
  const h = docker.host;

  const tile = (title, big, pct, sub) =>
    `<section class="tile"><h3>${escapeHtml(title)}</h3><div class="big">${escapeHtml(big)}</div>${meter(pct, title)}<div class="sub">${sub}</div></section>`;
  const tiles = `<div class="tiles">
${tile('Processeur', cpu ? fmtPct(cpu.busy) : 'mesure…', cpu?.busy ?? null,
    `${host.cores} cœur${host.cores > 1 ? 's' : ''}${cpu ? ` · iowait ${fmtPct(cpu.iowait)} · steal ${fmtPct(cpu.steal)}` : ''}`)}
${tile('Charge', host.load.map((l) => l.toFixed(2).replace('.', ',')).join(' · '), Math.min(100, loadPct),
    `1 / 5 / 15 min · ${fmtPct(loadPct)} des cœurs`)}
${tile('Mémoire', `${fmtBytes(host.mem.used)} / ${fmtBytes(host.mem.total)}`, memPct,
    `${fmtPct(memPct)} · cache ${fmtBytes(host.mem.cache)} · dispo ${fmtBytes(host.mem.available)}`)}
${tile('Swap', host.mem.swapTotal ? `${fmtBytes(host.mem.swapUsed)} / ${fmtBytes(host.mem.swapTotal)}` : 'aucun', swapPct,
    swapPct == null ? 'pas de swap configuré' : fmtPct(swapPct))}
${d ? tile('Disque', `${fmtBytes(d.used)} / ${fmtBytes(d.total)}`, diskPct,
    `${fmtPct(diskPct)} · libre ${fmtBytes(d.avail)} · inodes ${fmtPct(inodePct)}`) : tile('Disque', 'indisponible', null, '')}
${tile('Système', fmtDuration(host.uptime), null,
    `en ligne · ${host.procs ?? '—'} processus · noyau ${escapeHtml(h?.kernel || host.kernel)}`)}
</div>`;

  const history = `<h2>Dernière heure</h2>
${sparkline(hist.map((p) => ({ t: p.t, v: p.cpu })), 'Processeur')}
${sparkline(hist.map((p) => ({ t: p.t, v: p.mem })), 'Mémoire')}`;

  const containers = docker.containers
    ? `<div class="scroll"><table><thead><tr><th>Conteneur</th><th>État</th><th class="num">CPU</th><th class="num">Mémoire</th><th class="num">Réseau ↓ / ↑</th></tr></thead><tbody>${
      docker.containers.map((c) => `<tr>
<td>${escapeHtml(c.name)}<br><span class="who">${escapeHtml(c.image)}</span></td>
<td>${stateTag(c)}<br><span class="who">${escapeHtml(c.status)}</span></td>
<td class="num">${c.usage ? fmtPct(c.usage.cpu) : '—'}</td>
<td class="num">${c.usage ? fmtBytes(c.usage.mem) : '—'}</td>
<td class="num">${c.usage ? `${fmtBytes(c.usage.rx)} / ${fmtBytes(c.usage.tx)}` : '—'}</td>
</tr>`).join('')}</tbody></table></div>
<p class="sub">CPU en % d'un cœur (100 % = un cœur plein). Réseau cumulé depuis le démarrage du conteneur.</p>`
    : `<div class="empty">Docker inaccessible : ${escapeHtml(docker.error)}</div>`;

  const df = docker.df;
  const dfRow = (label, x, reclaim) => `<tr><td>${label}</td><td class="num">${x.count}</td><td class="num">${fmtBytes(x.size)}</td><td class="num">${reclaim == null ? '—' : fmtBytes(reclaim)}</td></tr>`;
  const dockerDisk = df
    ? `<div class="scroll"><table><thead><tr><th>Docker</th><th class="num">Nombre</th><th class="num">Taille</th><th class="num">Récupérable</th></tr></thead><tbody>
${dfRow('Images', df.images, df.images.reclaimable)}
${dfRow('Conteneurs (couche RW)', df.containers, null)}
${dfRow('Volumes', df.volumes, null)}
${dfRow('Cache de build', df.buildCache, df.buildCache.reclaimable)}
</tbody></table></div><p class="sub">Calculé toutes les 10 min. « Récupérable » : images sans conteneur et cache de build inutilisé (<code>docker system prune</code>).</p>`
    : '<div class="empty">Usage disque Docker indisponible.</div>';

  const intro = [
    h?.name, h?.os, h ? `Docker ${h.docker}` : '', host.cpuModel,
    h ? `${h.running} conteneur(s) actif(s), ${h.stopped} arrêté(s), ${h.images} image(s)` : '',
  ].filter(Boolean).map(escapeHtml).join(' · ');
  const now = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' });

  page(res, 200, 'Serveur', `<header><h1>Serveur</h1>${whoHtml(req)}</header>
<a class="back" href="/">← Dashboard</a>
<p>${intro}<br>Relevé à ${escapeHtml(now)}, actualisé toutes les ${SERVER_REFRESH_S} s.</p>
${tiles}${history}<h2>Conteneurs</h2>${containers}<h2>Disque Docker</h2>${dockerDisk}`, { refresh: SERVER_REFRESH_S });
}

// --- Console : actions prédéfinies sur le VPS (voir console.mjs), pas de shell ---
const CONSOLE_MSG = {
  unban: (v) => `IP ${v} débloquée.`,
  restart: (v) => `${v} redémarré.`,
  start: (v) => `${v} démarré.`,
  prune: (v) => `Nettoyage terminé : ${v} libérés.`,
};

// IP du visiteur : le Caddy frontal remplace X-Forwarded-For par l'IP réelle du client.
const clientIp = (req) => validIp(String(req.headers['x-forwarded-for'] || '').split(',')[0].trim());

const postButton = (action, fields, label, cls = '') =>
  `<form class="inline" method="post" action="${action}">${Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}">`).join('')}<button class="btn ${cls}" type="submit">${escapeHtml(label)}</button></form>`;

async function consolePage(res, req, url) {
  const ok = url.searchParams.get('ok');
  const err = url.searchParams.get('err');
  const v = url.searchParams.get('v') || '';
  const flash = err ? `<div class="flash err" role="alert">Échec : ${escapeHtml(err)}</div>`
    : CONSOLE_MSG[ok] ? `<div class="flash ok" role="status">${escapeHtml(CONSOLE_MSG[ok](v))}</div>` : '';
  const [ssh, list] = await Promise.allSettled([sshLimitList(), dockerGet('/containers/json?all=1')]);

  const me = clientIp(req);
  let sshHtml;
  if (ssh.status === 'fulfilled') {
    const mine = ssh.value.find((e) => e.ip === me);
    const risky = (n) => n >= UFW_LIMIT_HITS ? ' <span class="tag err">bloquée si récent</span>' : '';
    const meLine = me
      ? `<p>Ton IP : <code>${escapeHtml(me)}</code> — ${mine ? `${mine.hits} connexion(s) enregistrée(s)${risky(mine.hits)}` : 'absente de la liste, pas bloquée'}.</p>
<div class="actions">${postButton('/console/unban', { ip: me }, 'Débloquer mon IP', 'primary')}</div>`
      : '<p>IP du visiteur inconnue (accès hors frontal).</p>';
    const rows = ssh.value.slice(0, 25).map((e) => `<tr><td><code>${escapeHtml(e.ip)}</code>${e.ip === me ? ' <span class="tag">toi</span>' : ''}</td>
<td class="num">${e.hits}${risky(e.hits)}</td><td>${postButton('/console/unban', { ip: e.ip }, 'Retirer')}</td></tr>`).join('');
    sshHtml = `${meLine}
<form class="row" method="post" action="/console/unban"><label class="who" for="ip">Autre IP</label><input id="ip" name="ip" required inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="203.0.113.7"><button class="btn" type="submit">Débloquer</button></form>
${rows ? `<div class="scroll"><table><thead><tr><th>IP (plus récentes d'abord, 25 max)</th><th class="num">Connexions</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty">Liste vide.</div>'}
<p class="sub">${ssh.value.length} IP suivie(s). La plupart sont des robots qui scannent le port 22.</p>`;
  } else {
    sshHtml = `<div class="empty">Liste du pare-feu indisponible : ${escapeHtml(ssh.reason?.message || ssh.reason)}</div>`;
  }

  let ctHtml;
  if (list.status === 'fulfilled') {
    const rows = list.value
      .map((c) => ({ id: c.Id, name: (c.Names?.[0] || c.Id.slice(0, 12)).replace(/^\//, ''), image: c.Image, state: c.State, status: c.Status }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => {
        const act = isSelf(c.id) ? '<span class="who">ce dashboard</span>'
          : c.state === 'running' ? postButton('/console/restart', { name: c.name }, 'Redémarrer')
          : postButton('/console/start', { name: c.name }, 'Démarrer');
        return `<tr><td>${escapeHtml(c.name)}<br><span class="who">${escapeHtml(c.image)}</span></td>
<td>${stateTag(c)}<br><span class="who">${escapeHtml(c.status)}</span></td>
<td><div class="actions"><a class="btn" href="/console/logs/${encodeURIComponent(c.name)}">Logs</a>${act}</div></td></tr>`;
      }).join('');
    ctHtml = `<div class="scroll"><table><thead><tr><th>Conteneur</th><th>État</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  } else {
    ctHtml = `<div class="empty">Docker inaccessible : ${escapeHtml(list.reason?.message || list.reason)}</div>`;
  }

  page(res, 200, 'Console', `<header><h1>Console</h1>${whoHtml(req)}</header>
<a class="back" href="/">← Dashboard</a>
<p>Actions prédéfinies sur le VPS, sans shell. Chaque action est journalisée avec le compte connecté.</p>
${flash}
<h2>Pare-feu SSH</h2>
<p>UFW bloque une IP qui ouvre ${UFW_LIMIT_HITS} connexions SSH ou plus en 30 s, et chaque nouvel essai prolonge le blocage. Retirer une IP de la liste la débloque aussitôt.</p>
${sshHtml}
<h2>Conteneurs</h2>${ctHtml}
<h2>Nettoyage Docker</h2>
<p>Supprime les images sans tag (anciennes versions remplacées par un rebuild) et le cache de build inutilisé.</p>
<div class="actions"><a class="btn" href="/console/prune">Nettoyer…</a> <a href="/server">Voir l'usage disque</a></div>`);
}

function prunePage(res, req) {
  page(res, 200, 'Nettoyage Docker', `<header><h1>Nettoyage Docker</h1>${whoHtml(req)}</header>
<a class="back" href="/console">← Console</a>
<p>Supprime définitivement les images sans tag et le cache de build inutilisé. Les images utilisées par un conteneur et les volumes (données) ne sont pas touchés. Le prochain build d'une pile sera plus long (cache vidé).</p>
<div class="actions">${postButton('/console/prune', {}, 'Confirmer le nettoyage', 'danger')} <a class="btn" href="/console">Annuler</a></div>`);
}

async function logsPage(res, req, name) {
  let c;
  try { c = await findContainer(name); } catch (e) {
    return page(res, 502, 'Logs', `<h1>Docker inaccessible</h1><p>${escapeHtml(e.message)}</p><a class="back" href="/console">← Console</a>`);
  }
  if (!c) return page(res, 404, 'Logs', '<h1>Conteneur introuvable</h1><a class="back" href="/console">← Console</a>');
  let text;
  try { text = await containerLogs(c.id); } catch (e) { text = `Logs indisponibles : ${e.message}`; }
  page(res, 200, `Logs ${c.name}`, `<header><h1>Logs : ${escapeHtml(c.name)}</h1>${whoHtml(req)}</header>
<a class="back" href="/console">← Console</a>
<p>300 dernières lignes, les plus récentes en bas. <a href="/console/logs/${encodeURIComponent(c.name)}">Actualiser</a></p>
<pre class="logs">${escapeHtml(text.trim() || '(aucune ligne)')}</pre>`);
}

// POST /console/* : même origine exigée (anti-CSRF, en plus du login amont), puis redirection vers
// /console avec un message (PRG).
async function handleConsolePost(req, res, p) {
  if (!sameOrigin(req)) return page(res, 403, 'Refusé', '<h1>Requête refusée</h1>');
  let form;
  try { form = await readForm(req); } catch { return page(res, 413, 'Refusé', '<h1>Requête refusée</h1>'); }
  const user = String(req.headers['x-auth-user'] || '?');
  const back = (q) => redirect(res, `/console?${new URLSearchParams(q)}`, 303);
  try {
    if (p === '/console/unban') {
      const ip = validIp((form.get('ip') || '').trim());
      if (!ip) throw new Error('IP invalide');
      await sshLimitRemove(ip);
      log(`console: déblocage SSH ip=${ip} user=${user}`);
      return back({ ok: 'unban', v: ip });
    }
    if (p === '/console/restart' || p === '/console/start') {
      const action = p.slice('/console/'.length);
      const c = await findContainer(form.get('name') || '');
      if (!c) throw new Error('conteneur introuvable');
      if (c.self) throw new Error('le dashboard ne se redémarre pas depuis lui-même');
      await containerAction(c.id, action);
      log(`console: ${action} conteneur=${c.name} user=${user}`);
      return back({ ok: action, v: c.name });
    }
    if (p === '/console/prune') {
      const r = await dockerPrune();
      log(`console: nettoyage images=${r.images} octets=${r.bytes} user=${user}`);
      return back({ ok: 'prune', v: `${fmtBytes(r.bytes)} (${r.images} image(s))` });
    }
  } catch (e) {
    log(`console: échec ${p} user=${user}`, e.message);
    return back({ err: e.message });
  }
  notFound(res);
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
<span class="chk">Scan passif. À n'utiliser que sur des sites que tu possèdes ou pour lesquels tu as l'autorisation du propriétaire.</span>
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
    // Les conteneurs d'outils (testssl, ZAP) tournent en uid non-root et écrivent dans ce
    // sous-dossier du volume partagé : il doit leur être accessible en écriture.
    fs.chmodSync(dir, 0o777);
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
    if (req.method === 'POST' && p.startsWith('/console/')) return await handleConsolePost(req, res, p);
    if (req.method !== 'GET' && req.method !== 'HEAD') return notFound(res);
    if (p === '/') return homePage(res, req);
    if (p === '/security') return securityListPage(res, req);
    if (p === '/server') return await serverPage(res, req);
    if (p === '/console') return await consolePage(res, req, url);
    if (p === '/console/prune') return prunePage(res, req);
    const logs = /^\/console\/logs\/([^/]+)$/.exec(p);
    if (logs) return await logsPage(res, req, decodeURIComponent(logs[1]));
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
