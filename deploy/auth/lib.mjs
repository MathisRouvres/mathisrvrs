// Briques du service de connexion (sans dépendance) : mot de passe scrypt, TOTP (RFC 6238),
// jeton de session signé, limite de tentatives, contrôle des adresses de retour.
import crypto from 'node:crypto';

// --- Mot de passe : scrypt$N$r$p$sel$empreinte (base64) ---
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
// Le TOTP reste obligatoire : 8 caractères suffisent avec le second facteur et la limite de tentatives.
export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(String(password), Buffer.from(salt, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
  });
  return crypto.timingSafeEqual(actual, expected);
}

// --- TOTP : 6 chiffres, pas de 30 s, HMAC-SHA1 (compatible avec toutes les applis) ---
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[\s=]/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error('secret TOTP invalide');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function newTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function totpAt(secret, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, '0');
}

// Pas accepté pour un code (fenêtre ±1 pas pour la dérive d'horloge), ou null. Un pas déjà utilisé
// (lastStep) est refusé : un code intercepté ne sert pas deux fois.
export function checkTotp(secret, code, { now = Date.now(), lastStep = -1 } = {}) {
  if (!/^\d{6}$/.test(String(code))) return null;
  const current = Math.floor(now / 1000 / 30);
  for (const step of [current - 1, current, current + 1]) {
    if (step <= lastStep) continue;
    const expected = Buffer.from(totpAt(secret, step));
    if (crypto.timingSafeEqual(expected, Buffer.from(String(code)))) return step;
  }
  return null;
}

export function otpauthUri(secret, { issuer = 'mathis-rvrs.fr', account = 'mathis' } = {}) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// --- Session : base64url(JSON).signature HMAC-SHA256 ---
// « u » : compte ; « e » : époque du compte, l'incrémenter dans credentials.json déconnecte ses sessions.
export function signSession({ days, epoch, secret, user, now = Date.now() }) {
  const iat = Math.floor(now / 1000);
  const payload = { iat, exp: iat + days * 86400, e: epoch, ...(user ? { u: user } : {}) };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

// Contenu { u, e } d'un jeton bien signé et non expiré, sinon null. « u » est absent des jetons
// émis avant les comptes multiples.
export function readSession(token, { secret, now = Date.now() }) {
  const [body, sig, extra] = String(token || '').split('.');
  if (!body || !sig || extra !== undefined) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const { exp, e, u } = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return Number.isFinite(exp) && exp > now / 1000 ? { u, e } : null;
  } catch {
    return null;
  }
}

export function verifySession(token, { epoch, secret, now = Date.now() }) {
  return readSession(token, { secret, now })?.e === epoch;
}

// --- Comptes : { sessionSecret, accounts: { nom: { passwordHash, totpSecret, epoch, lastTotpStep, hosts } } } ---
// « hosts » : hôtes autorisés, ou « * » pour tous.
export const LEGACY_ACCOUNT = 'mathis';
export const ACCOUNT_NAME = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const HOSTNAME = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

// Fichier lu tel quel, ou null s'il est inutilisable. L'ancien format (un seul compte, champs à la
// racine) devient le compte « mathis » avec accès partout ; mêmes secrets et même époque, donc
// ses sessions en cours restent valides.
export function normalizeCredentials(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.passwordHash) {
    const { sessionSecret, passwordHash, totpSecret, epoch, lastTotpStep = -1 } = raw;
    raw = { sessionSecret, accounts: { [LEGACY_ACCOUNT]: { passwordHash, totpSecret, epoch, lastTotpStep, hosts: ['*'] } } };
  }
  if (typeof raw.sessionSecret !== 'string' || !raw.sessionSecret) return null;
  if (!raw.accounts || typeof raw.accounts !== 'object' || Array.isArray(raw.accounts)) return null;
  return { sessionSecret: raw.sessionSecret, accounts: raw.accounts };
}

// Compte utilisable ou null. Nom validé et Object.hasOwn : « __proto__ » ou « constructor » ne sont
// pas des comptes.
export function findAccount(creds, name) {
  if (!creds || typeof name !== 'string' || !ACCOUNT_NAME.test(name) || !Object.hasOwn(creds.accounts, name)) return null;
  const a = creds.accounts[name];
  const ok = a && a.passwordHash && a.totpSecret && Number.isInteger(a.epoch) && Array.isArray(a.hosts);
  return ok ? a : null;
}

export function normalizeHost(host) {
  return String(host || '').trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

export function hostAllowed(hosts, host) {
  if (!Array.isArray(hosts)) return false;
  const h = normalizeHost(host);
  return hosts.includes('*') || (h !== '' && hosts.includes(h));
}

// « a.fr,b.fr » ou « * » → liste validée, sinon erreur.
export function parseHosts(value) {
  const hosts = String(value || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (!hosts.length) throw new Error('au moins un hôte requis (ex. budget.mathis-rvrs.fr, ou * pour tous)');
  for (const h of hosts) if (h !== '*' && !HOSTNAME.test(h)) throw new Error(`hôte invalide : ${h}`);
  return [...new Set(hosts)];
}

// --- Limite de tentatives : échecs par IP et au total sur une fenêtre glissante ---
export function createLimiter({ perIp = 5, total = 30, windowMs = 15 * 60_000 } = {}) {
  const fails = new Map();
  let all = [];
  const prune = (list, now) => list.filter((t) => now - t < windowMs);
  return {
    // Millisecondes d'attente avant un nouvel essai, 0 si autorisé.
    waitMs(ip, now = Date.now()) {
      all = prune(all, now);
      const mine = prune(fails.get(ip) || [], now);
      if (mine.length) fails.set(ip, mine);
      else fails.delete(ip);
      if (mine.length >= perIp) return windowMs - (now - mine[0]);
      if (all.length >= total) return windowMs - (now - all[0]);
      return 0;
    },
    fail(ip, now = Date.now()) {
      fails.set(ip, [...prune(fails.get(ip) || [], now), now]);
      all = [...prune(all, now), now];
    },
    success(ip) {
      fails.delete(ip);
    },
  };
}

// --- Adresse de retour après connexion : https et un hôte du domaine, sinon refusée ---
export function safeReturnUrl(rd, domain) {
  try {
    const url = new URL(String(rd));
    const host = url.hostname;
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (host !== domain && !host.endsWith(`.${domain}`)) return null;
    return url.href;
  } catch {
    return null;
  }
}
