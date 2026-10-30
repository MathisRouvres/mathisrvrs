// Briques du service de connexion (sans dépendance) : mot de passe scrypt, TOTP (RFC 6238),
// jeton de session signé, limite de tentatives, contrôle des adresses de retour.
import crypto from 'node:crypto';

// --- Mot de passe : scrypt$N$r$p$sel$empreinte (base64) ---
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

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
// « e » (époque) : l'incrémenter dans credentials.json déconnecte toutes les sessions.
export function signSession({ days, epoch, secret, now = Date.now() }) {
  const iat = Math.floor(now / 1000);
  const body = Buffer.from(JSON.stringify({ iat, exp: iat + days * 86400, e: epoch })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token, { epoch, secret, now = Date.now() }) {
  const [body, sig, extra] = String(token || '').split('.');
  if (!body || !sig || extra !== undefined) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
  try {
    const { exp, e } = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return e === epoch && Number.isFinite(exp) && exp > now / 1000;
  } catch {
    return false;
  }
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
