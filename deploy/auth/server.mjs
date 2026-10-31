// Service de connexion de *.mathis-rvrs.fr (auth.mathis-rvrs.fr), sans dépendance.
// Le Caddy frontal interroge GET /verify avant chaque requête vers un dashboard (forward_auth) :
// session valide → 200, sinon redirection vers /login (GET/HEAD) ou 401.
// Un seul compte : mot de passe (scrypt) + code TOTP, définis par `node setup.mjs`.
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { checkTotp, createLimiter, safeReturnUrl, signSession, verifyPassword, verifySession } from './lib.mjs';

const PORT = Number(process.env.PORT || 8080);
const DOMAIN = process.env.AUTH_DOMAIN || 'mathis-rvrs.fr';
const ORIGIN = process.env.AUTH_ORIGIN || `https://auth.${DOMAIN}`;
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);
const CREDENTIALS_FILE = process.env.CREDENTIALS_FILE || '/config/credentials.json';
const COOKIE = '__Secure-mr_session';
// Liens de la page d'accueil : « Nom=https://…,Nom=https://… ».
const APPS = (process.env.AUTH_APPS || '')
  .split(',')
  .map((s) => s.split('='))
  .filter(([name, url]) => name && url)
  .map(([name, url]) => ({ name: name.trim(), url: url.trim() }));

const log = (...a) => console.log(new Date().toISOString(), ...a);

function loadCredentials() {
  try {
    const c = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
    if (c.passwordHash && c.totpSecret && c.sessionSecret && Number.isInteger(c.epoch)) return c;
  } catch {
    /* absent : setup pas encore fait */
  }
  return null;
}

// Gardé en mémoire pour /verify (appelé à chaque requête des dashboards) et rechargé quand
// setup.mjs réécrit le fichier : nouveau compte ou révocation sans redémarrage.
let creds = loadCredentials();
fs.watchFile(CREDENTIALS_FILE, { interval: 2000 }, () => {
  creds = loadCredentials();
  log('identifiants rechargés');
});

function saveLastStep(step) {
  const current = loadCredentials();
  if (!current) return;
  current.lastTotpStep = step;
  const tmp = `${CREDENTIALS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(current, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, CREDENTIALS_FILE);
  creds = current;
}

const limiter = createLimiter();

// IP du visiteur : le frontal remplace tout X-Forwarded-For venu d'Internet par la vraie IP.
function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.socket.remoteAddress || 'inconnue';
}

function readCookie(req) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return '';
}

function hasSession(req) {
  return Boolean(creds) && verifySession(readCookie(req), { epoch: creds.epoch, secret: creds.sessionSecret });
}

function sessionCookie(value, maxAge) {
  return `${COOKIE}=${value}; Domain=${DOMAIN}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

// --- Pages ---
const STYLE = `
:root{color-scheme:light dark;--bg:#f6f5f2;--card:#fff;--fg:#1d1d1f;--muted:#5f6368;--line:#d7d4cd;--accent:#2f5bd3;--err:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--card:#1e1e1e;--fg:#ececec;--muted:#a3a3a3;--line:#353535;--accent:#8aa8ff;--err:#ff8a80}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{width:100%;max-width:360px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px 24px}
h1{font-size:1.25rem;margin:0 0 4px}p{margin:0 0 20px;color:var(--muted);font-size:.95rem}
label{display:block;font-weight:600;font-size:.9rem;margin:16px 0 6px}
input{width:100%;font:inherit;padding:11px 12px;border:1px solid var(--line);border-radius:9px;background:transparent;color:inherit}
input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
button{width:100%;margin-top:22px;font:inherit;font-weight:600;padding:11px;border:0;border-radius:9px;background:var(--accent);color:#fff;cursor:pointer}
@media (prefers-color-scheme:dark){button{color:#111}}
button:hover{filter:brightness(1.08)}
.err{color:var(--err);font-weight:600;margin:16px 0 0}
ul{list-style:none;padding:0;margin:0}li a{display:block;padding:12px 14px;margin-top:8px;border:1px solid var(--line);border-radius:9px;color:inherit;text-decoration:none;font-weight:600}
li a:hover{border-color:var(--accent)}.link{background:none;color:var(--muted);text-decoration:underline;margin-top:18px;font-weight:400}`;
const STYLE_HASH = crypto.createHash('sha256').update(STYLE).digest('base64');

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function page(res, status, title, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'none'; style-src 'sha256-${STYLE_HASH}'; form-action 'self' https://*.${DOMAIN}; frame-ancestors 'none'; base-uri 'none'`,
    'X-Content-Type-Options': 'nosniff',
    // same-origin et pas no-referrer : avec no-referrer, le navigateur envoie « Origin: null » sur les
    // formulaires, refusés par sameOrigin(). L'adresse de retour (?rd=) ne fuit toujours pas ailleurs.
    'Referrer-Policy': 'same-origin',
    ...extraHeaders,
  });
  res.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`);
}

function loginPage(res, { status = 200, rd = '', error = '' } = {}) {
  if (!creds) {
    return page(res, 503, 'Connexion', '<h1>Connexion indisponible</h1><p>Compte pas encore configuré : lancer setup sur le serveur.</p>');
  }
  page(res, status, 'Connexion', `<h1>Connexion</h1><p>Espace privé de mathis-rvrs.fr</p>
<form method="post" action="/login">
<input type="hidden" name="rd" value="${escapeHtml(rd)}">
<label for="password">Mot de passe</label>
<input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
<label for="code">Code de l'application d'authentification</label>
<input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required>
${error ? `<p class="err" role="alert">${escapeHtml(error)}</p>` : ''}
<button type="submit">Se connecter</button>
</form>`);
}

function homePage(res) {
  const links = APPS.map((a) => `<li><a href="${escapeHtml(a.url)}">${escapeHtml(a.name)}</a></li>`).join('');
  page(res, 200, 'Espace privé', `<h1>Espace privé</h1><p>Connecté.</p><ul>${links}</ul>
<form method="post" action="/logout"><button class="link" type="submit">Se déconnecter</button></form>`);
}

function redirect(res, location, status = 303, headers = {}) {
  res.writeHead(status, { Location: location, 'Cache-Control': 'no-store', ...headers });
  res.end();
}

// Formulaires : même origine exigée (en plus de SameSite=Lax) contre les envois depuis un autre site.
// Origine absente ou « null » (politique de référent, page restaurée…) : Sec-Fetch-Site, posé par le
// navigateur et impossible à falsifier depuis une page, doit dire same-origin.
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
      if (size > 4096) {
        reject(new Error('trop gros'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(new URLSearchParams(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', reject);
  });
}

async function handleLogin(req, res) {
  if (!sameOrigin(req)) return page(res, 403, 'Refusé', '<h1>Requête refusée</h1>');
  if (!creds) return loginPage(res);
  const ip = clientIp(req);
  const wait = limiter.waitMs(ip);
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60_000);
    log(`connexion bloquée ip=${ip} (${minutes} min)`);
    return page(res, 429, 'Trop de tentatives', `<h1>Trop de tentatives</h1><p>Réessaie dans ${minutes} min.</p>`, {
      'Retry-After': String(Math.ceil(wait / 1000)),
    });
  }
  let form;
  try {
    form = await readForm(req);
  } catch {
    return page(res, 413, 'Refusé', '<h1>Requête refusée</h1>');
  }
  const rd = safeReturnUrl(form.get('rd') || '', DOMAIN) || '';
  const passwordOk = verifyPassword(form.get('password') || '', creds.passwordHash);
  const step = checkTotp(creds.totpSecret, (form.get('code') || '').trim(), { lastStep: creds.lastTotpStep ?? -1 });
  if (!passwordOk || step === null) {
    limiter.fail(ip);
    log(`connexion refusée ip=${ip}`);
    return loginPage(res, { status: 401, rd, error: 'Mot de passe ou code incorrect.' });
  }
  limiter.success(ip);
  saveLastStep(step);
  log(`connexion ip=${ip}`);
  const token = signSession({ days: SESSION_DAYS, epoch: creds.epoch, secret: creds.sessionSecret });
  redirect(res, rd || '/', 303, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
}

// forward_auth : Caddy transmet la requête d'origine dans X-Forwarded-{Method,Proto,Host,Uri}.
function handleVerify(req, res) {
  if (hasSession(req)) {
    res.writeHead(200, { 'Cache-Control': 'no-store' });
    return res.end();
  }
  const method = String(req.headers['x-forwarded-method'] || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end('Connexion requise');
  }
  const original = `https://${req.headers['x-forwarded-host'] || ''}${req.headers['x-forwarded-uri'] || '/'}`;
  const rd = safeReturnUrl(original, DOMAIN);
  redirect(res, `${ORIGIN}/login${rd ? `?rd=${encodeURIComponent(rd)}` : ''}`, 302);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, ORIGIN);
    const route = `${req.method} ${url.pathname}`;
    if (route === 'GET /health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, configured: Boolean(creds) }));
    }
    if (route === 'GET /verify' || route === 'HEAD /verify') return handleVerify(req, res);
    if (route === 'GET /login') {
      const rd = safeReturnUrl(url.searchParams.get('rd') || '', DOMAIN);
      if (hasSession(req)) return redirect(res, rd || '/');
      return loginPage(res, { rd: rd || '' });
    }
    if (route === 'POST /login') return await handleLogin(req, res);
    if (route === 'POST /logout') {
      if (!sameOrigin(req)) return page(res, 403, 'Refusé', '<h1>Requête refusée</h1>');
      return redirect(res, '/login', 303, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (route === 'GET /') return hasSession(req) ? homePage(res) : redirect(res, '/login', 302);
    page(res, 404, 'Introuvable', '<h1>Page introuvable</h1>');
  } catch (err) {
    log('erreur', err);
    if (!res.headersSent) page(res, 500, 'Erreur', '<h1>Erreur</h1>');
  }
});

server.listen(PORT, '0.0.0.0', () => log(`auth → :${PORT} (domaine ${DOMAIN}, compte ${creds ? 'configuré' : 'NON configuré'})`));
const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
