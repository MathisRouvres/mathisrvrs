// Service de connexion de *.mathis-rvrs.fr (auth.mathis-rvrs.fr), sans dépendance.
// Le Caddy frontal interroge GET /verify avant chaque requête vers un dashboard (forward_auth) :
// session valide et hôte autorisé pour le compte → 200 avec X-Auth-User, hôte hors périmètre → 403,
// pas de session → redirection vers /login (GET/HEAD) ou 401.
// Comptes : identifiant + mot de passe (scrypt) + code TOTP, définis par `node setup.mjs`. Un compte limité
// à des hôtes listés peut se passer du TOTP ; il a alors sa propre limite d'échecs (10 par heure).
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  ACCOUNT_NAME, LEGACY_ACCOUNT, accountError, checkTotp, createLimiter, findAccount, hashPassword, hostAllowed,
  normalizeCredentials, normalizeHost, readSession, safeReturnUrl, signSession, verifyPassword,
} from './lib.mjs';

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

// Ancien format (un seul compte) accepté : il devient le compte « mathis » (voir lib.mjs).
// Un compte inutilisable (accès partout sans TOTP, champ manquant) est ignoré par findAccount.
function loadCredentials() {
  let loaded;
  try {
    loaded = normalizeCredentials(JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8')));
  } catch {
    return null; // absent : setup pas encore fait
  }
  for (const [name, a] of Object.entries(loaded?.accounts || {})) {
    const err = accountError(a);
    if (err) log(`compte ignoré compte=${JSON.stringify(name)} : ${err}`);
  }
  return loaded;
}

// Gardé en mémoire pour /verify (appelé à chaque requête des dashboards) et rechargé quand
// setup.mjs réécrit le fichier : nouveau compte ou révocation sans redémarrage.
let creds = loadCredentials();
fs.watchFile(CREDENTIALS_FILE, { interval: 2000 }, () => {
  creds = loadCredentials();
  log('identifiants rechargés');
});

const configured = () => Boolean(creds) && Object.keys(creds.accounts).length > 0;

// Réécrit le fichier au nouveau format : un ancien fichier est converti à la première connexion.
function saveLastStep(name, step) {
  const current = loadCredentials();
  const account = findAccount(current, name);
  if (!account) return;
  account.lastTotpStep = step;
  const tmp = `${CREDENTIALS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(current, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, CREDENTIALS_FILE);
  creds = current;
}

const limiter = createLimiter();
// Comptes sans TOTP, et identifiants inconnus pour ne pas les distinguer : 10 échecs par heure.
const accountLimiter = createLimiter({ perIp: 10, total: Infinity, windowMs: 60 * 60_000 });
// Compte inconnu : scrypt calculé quand même, le temps de réponse ne dit pas quels comptes existent.
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));

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

// Compte de la session ({ name, account }) ou null. Un jeton émis avant les comptes multiples n'a
// pas de « u » : c'est celui du compte unique d'alors, « mathis ».
function sessionUser(req) {
  if (!creds) return null;
  const session = readSession(readCookie(req), { secret: creds.sessionSecret });
  if (!session) return null;
  const name = session.u === undefined ? LEGACY_ACCOUNT : session.u;
  const account = findAccount(creds, name);
  return account && session.e === account.epoch ? { name, account } : null;
}

// Adresse de retour gardée seulement si le compte a accès à cet hôte (sinon 403 juste après).
function allowedReturnUrl(rd, account) {
  const url = safeReturnUrl(rd, DOMAIN);
  return url && hostAllowed(account.hosts, new URL(url).hostname) ? url : null;
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
.err{color:var(--err);font-weight:600;margin:16px 0 0}.hint{margin:6px 0 0;font-size:.85rem}
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

function loginPage(res, { status = 200, rd = '', error = '', user = '' } = {}) {
  if (!configured()) {
    return page(res, 503, 'Connexion', '<h1>Connexion indisponible</h1><p>Compte pas encore configuré : lancer setup sur le serveur.</p>');
  }
  page(res, status, 'Connexion', `<h1>Connexion</h1><p>Espace privé de mathis-rvrs.fr</p>
<form method="post" action="/login">
<input type="hidden" name="rd" value="${escapeHtml(rd)}">
<label for="user">Identifiant</label>
<input id="user" name="user" value="${escapeHtml(user)}" autocomplete="username" autocapitalize="none" spellcheck="false" required${user ? '' : ' autofocus'}>
<label for="password">Mot de passe</label>
<input id="password" name="password" type="password" autocomplete="current-password" required${user ? ' autofocus' : ''}>
<label for="code">Code de l'application d'authentification</label>
<input id="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" aria-describedby="code-hint">
<p class="hint" id="code-hint">Laisser vide si ton compte n'en demande pas.</p>
${error ? `<p class="err" role="alert">${escapeHtml(error)}</p>` : ''}
<button type="submit">Se connecter</button>
</form>`);
}

// Liens limités aux sites auxquels le compte a accès.
function homePage(res, { name, account }) {
  const links = APPS.filter((a) => {
    try {
      return hostAllowed(account.hosts, new URL(a.url).hostname);
    } catch {
      return false;
    }
  }).map((a) => `<li><a href="${escapeHtml(a.url)}">${escapeHtml(a.name)}</a></li>`).join('');
  page(res, 200, 'Espace privé', `<h1>Espace privé</h1><p>Connecté (${escapeHtml(name)}).</p><ul>${links}</ul>
<form method="post" action="/logout"><button class="link" type="submit">Se déconnecter</button></form>`);
}

function forbiddenPage(res, name) {
  page(res, 403, 'Accès refusé', `<h1>Accès refusé</h1><p>Le compte « ${escapeHtml(name)} » n'a pas accès à ce site.</p>
<ul><li><a href="${escapeHtml(ORIGIN)}/">Espace privé</a></li></ul>`);
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
  if (!configured()) return loginPage(res);
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
  const name = (form.get('user') || '').trim().toLowerCase();
  const account = ACCOUNT_NAME.test(name) ? findAccount(creds, name) : null;
  const shownName = ACCOUNT_NAME.test(name) ? name : '?';
  // Sans TOTP, seul le mot de passe protège le compte : limite propre à l'identifiant, en plus de l'IP.
  const limitedName = shownName !== '?' && !(account && account.totpSecret !== null) ? name : null;
  const nameWait = limitedName ? accountLimiter.waitMs(limitedName) : 0;
  if (nameWait > 0) {
    const minutes = Math.ceil(nameWait / 60_000);
    log(`connexion bloquée compte=${limitedName} ip=${ip} (${minutes} min)`);
    return page(res, 429, 'Trop de tentatives', `<h1>Trop de tentatives</h1><p>Réessaie dans ${minutes} min.</p>`, {
      'Retry-After': String(Math.ceil(nameWait / 1000)),
    });
  }
  const passwordOk = verifyPassword(form.get('password') || '', account ? account.passwordHash : DUMMY_HASH);
  // Compte sans TOTP : le champ code est ignoré.
  const step = !account || account.totpSecret === null
    ? -1
    : checkTotp(account.totpSecret, (form.get('code') || '').trim(), { lastStep: account.lastTotpStep ?? -1 });
  if (!account || !passwordOk || step === null) {
    limiter.fail(ip);
    if (limitedName) accountLimiter.fail(limitedName);
    log(`connexion refusée compte=${shownName} ip=${ip}`);
    return loginPage(res, { status: 401, rd, user: shownName === '?' ? '' : name, error: 'Identifiant, mot de passe ou code incorrect.' });
  }
  limiter.success(ip);
  if (limitedName) accountLimiter.success(limitedName);
  if (account.totpSecret !== null) saveLastStep(name, step);
  log(`connexion compte=${name} ip=${ip}`);
  const token = signSession({ days: SESSION_DAYS, epoch: account.epoch, secret: creds.sessionSecret, user: name });
  redirect(res, allowedReturnUrl(rd, account) || '/', 303, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
}

// forward_auth : Caddy transmet la requête d'origine dans X-Forwarded-{Method,Proto,Host,Uri}.
// Le compte part vers le site dans X-Auth-User (copy_headers du snippet « private »).
function handleVerify(req, res) {
  const user = sessionUser(req);
  if (user) {
    const host = normalizeHost(req.headers['x-forwarded-host']);
    if (!hostAllowed(user.account.hosts, host)) {
      log(`accès refusé compte=${user.name} hôte=${JSON.stringify(host)}`);
      return forbiddenPage(res, user.name);
    }
    res.writeHead(200, { 'Cache-Control': 'no-store', 'X-Auth-User': user.name });
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
      return res.end(JSON.stringify({ ok: true, configured: configured() }));
    }
    if (route === 'GET /verify' || route === 'HEAD /verify') return handleVerify(req, res);
    if (route === 'GET /login') {
      const rd = url.searchParams.get('rd') || '';
      const user = sessionUser(req);
      if (user) return redirect(res, allowedReturnUrl(rd, user.account) || '/');
      return loginPage(res, { rd: safeReturnUrl(rd, DOMAIN) || '' });
    }
    if (route === 'POST /login') return await handleLogin(req, res);
    if (route === 'POST /logout') {
      if (!sameOrigin(req)) return page(res, 403, 'Refusé', '<h1>Requête refusée</h1>');
      return redirect(res, '/login', 303, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (route === 'GET /') {
      const user = sessionUser(req);
      return user ? homePage(res, user) : redirect(res, '/login', 302);
    }
    page(res, 404, 'Introuvable', '<h1>Page introuvable</h1>');
  } catch (err) {
    log('erreur', err);
    if (!res.headersSent) page(res, 500, 'Erreur', '<h1>Erreur</h1>');
  }
});

server.listen(PORT, '0.0.0.0', () =>
  log(`auth → :${PORT} (domaine ${DOMAIN}, comptes : ${configured() ? Object.keys(creds.accounts).join(', ') : 'AUCUN'})`));
const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
