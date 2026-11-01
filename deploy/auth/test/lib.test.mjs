import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base32Decode, base32Encode, checkTotp, createLimiter, findAccount, hashPassword, hostAllowed, normalizeCredentials,
  parseHosts, readSession, safeReturnUrl, signSession, totpAt, verifyPassword, verifySession,
} from '../lib.mjs';

// Vecteurs de la RFC 6238 (annexe B), secret ASCII « 12345678901234567890 », 8 chiffres → 6 derniers.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

test('TOTP conforme à la RFC 6238', () => {
  assert.equal(totpAt(RFC_SECRET, Math.floor(59 / 30)), '287082');
  assert.equal(totpAt(RFC_SECRET, Math.floor(1111111109 / 30)), '081804');
  assert.equal(totpAt(RFC_SECRET, Math.floor(1234567890 / 30)), '005924');
  assert.equal(totpAt(RFC_SECRET, Math.floor(2000000000 / 30)), '279037');
});

test('base32 aller-retour', () => {
  const buf = Buffer.from([0, 1, 2, 250, 255, 128, 77]);
  assert.deepEqual(base32Decode(base32Encode(buf)), buf);
});

test('checkTotp : fenêtre ±1 pas, rejeu refusé, format strict', () => {
  const now = 1_700_000_000_000;
  const step = Math.floor(now / 30000);
  assert.equal(checkTotp(RFC_SECRET, totpAt(RFC_SECRET, step), { now }), step);
  assert.equal(checkTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 1), { now }), step - 1);
  assert.equal(checkTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 2), { now }), null);
  assert.equal(checkTotp(RFC_SECRET, totpAt(RFC_SECRET, step), { now, lastStep: step }), null);
  assert.equal(checkTotp(RFC_SECRET, '12345', { now }), null);
  assert.equal(checkTotp(RFC_SECRET, '12345a', { now }), null);
});

test('mot de passe scrypt', () => {
  const stored = hashPassword('un mot de passe solide');
  assert.match(stored, /^scrypt\$32768\$8\$1\$/);
  assert.equal(verifyPassword('un mot de passe solide', stored), true);
  assert.equal(verifyPassword('un mot de passe solidE', stored), false);
  assert.equal(verifyPassword('x', 'n importe quoi'), false);
});

test('session signée : expiration, époque, falsification', () => {
  const secret = 'a'.repeat(64);
  const now = 1_700_000_000_000;
  const token = signSession({ days: 30, epoch: 3, secret, now });
  assert.equal(verifySession(token, { epoch: 3, secret, now }), true);
  assert.equal(verifySession(token, { epoch: 3, secret, now: now + 29 * 86400_000 }), true);
  assert.equal(verifySession(token, { epoch: 3, secret, now: now + 31 * 86400_000 }), false);
  assert.equal(verifySession(token, { epoch: 4, secret, now }), false);
  assert.equal(verifySession(token, { epoch: 3, secret: 'b'.repeat(64), now }), false);
  const [body, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ iat: 0, exp: 9e9, e: 3 })).toString('base64url');
  assert.equal(verifySession(`${forged}.${sig}`, { epoch: 3, secret, now }), false);
  assert.equal(verifySession(`${body}.${sig}.x`, { epoch: 3, secret, now }), false);
  assert.equal(verifySession('', { epoch: 3, secret, now }), false);
});

test('session : le compte voyage dans le jeton, anciens jetons sans compte', () => {
  const secret = 'a'.repeat(64);
  const now = 1_700_000_000_000;
  assert.deepEqual(readSession(signSession({ days: 1, epoch: 2, secret, user: 'couple', now }), { secret, now }), { u: 'couple', e: 2 });
  assert.deepEqual(readSession(signSession({ days: 1, epoch: 2, secret, now }), { secret, now }), { u: undefined, e: 2 });
  assert.equal(readSession(signSession({ days: 1, epoch: 2, secret, now }), { secret, now: now + 2 * 86400_000 }), null);
});

test('ancien credentials.json → compte « mathis » partout, mêmes secrets', () => {
  const legacy = { passwordHash: 'h', totpSecret: 't', sessionSecret: 's', epoch: 7, lastTotpStep: 9 };
  assert.deepEqual(normalizeCredentials(legacy), {
    sessionSecret: 's',
    accounts: { mathis: { passwordHash: 'h', totpSecret: 't', epoch: 7, lastTotpStep: 9, hosts: ['*'] } },
  });
  const v2 = { sessionSecret: 's', accounts: { couple: { passwordHash: 'h', totpSecret: 't', epoch: 1, hosts: ['budget.mathis-rvrs.fr'] } } };
  assert.deepEqual(normalizeCredentials(v2), v2);
  assert.equal(normalizeCredentials({ accounts: {} }), null);
  assert.equal(normalizeCredentials({ sessionSecret: 's', accounts: [] }), null);
  assert.equal(normalizeCredentials(null), null);
});

test('findAccount : comptes complets seulement, pas de prototype', () => {
  const creds = normalizeCredentials(JSON.parse('{"sessionSecret":"s","accounts":{"__proto__":{"passwordHash":"h","totpSecret":"t","epoch":1,"hosts":["*"]},"a":{"passwordHash":"h","totpSecret":"t","epoch":1,"hosts":["*"]},"b":{"passwordHash":"h"}}}'));
  assert.ok(findAccount(creds, 'a'));
  assert.equal(findAccount(creds, 'b'), null);
  assert.equal(findAccount(creds, '__proto__'), null);
  assert.equal(findAccount(creds, 'constructor'), null);
  assert.equal(findAccount(creds, 'toString'), null);
  assert.equal(findAccount(null, 'a'), null);
});

test('périmètre des comptes', () => {
  assert.equal(hostAllowed(['*'], 'pma.mathis-rvrs.fr'), true);
  assert.equal(hostAllowed(['*'], ''), true);
  assert.equal(hostAllowed(['budget.mathis-rvrs.fr'], 'budget.mathis-rvrs.fr'), true);
  assert.equal(hostAllowed(['budget.mathis-rvrs.fr'], 'Budget.Mathis-rvrs.fr:443'), true);
  assert.equal(hostAllowed(['budget.mathis-rvrs.fr'], 'budget.mathis-rvrs.fr.'), true);
  assert.equal(hostAllowed(['budget.mathis-rvrs.fr'], 'pma.mathis-rvrs.fr'), false);
  assert.equal(hostAllowed(['budget.mathis-rvrs.fr'], ''), false);
  assert.equal(hostAllowed(['budget.mathis-rvrs.fr'], undefined), false);
  assert.equal(hostAllowed(undefined, 'budget.mathis-rvrs.fr'), false);
  assert.deepEqual(parseHosts(' Budget.mathis-rvrs.fr,budget.mathis-rvrs.fr ,'), ['budget.mathis-rvrs.fr']);
  assert.deepEqual(parseHosts('*'), ['*']);
  assert.throws(() => parseHosts(''), /au moins un hôte/);
  assert.throws(() => parseHosts('budget'), /hôte invalide/);
  assert.throws(() => parseHosts('a.fr/x'), /hôte invalide/);
});

test('limite de tentatives par IP et au total', () => {
  const lim = createLimiter({ perIp: 3, total: 5, windowMs: 1000 });
  for (let i = 0; i < 3; i++) lim.fail('1.1.1.1', 0);
  assert.ok(lim.waitMs('1.1.1.1', 10) > 0);
  assert.equal(lim.waitMs('2.2.2.2', 10), 0);
  assert.equal(lim.waitMs('1.1.1.1', 1001), 0);
  for (const ip of ['2.2.2.2', '3.3.3.3', '4.4.4.4', '5.5.5.5', '6.6.6.6']) lim.fail(ip, 2000);
  assert.ok(lim.waitMs('7.7.7.7', 2001) > 0, 'blocage global');
});

test('adresse de retour limitée au domaine en https', () => {
  const d = 'mathis-rvrs.fr';
  assert.equal(safeReturnUrl('https://travaux.mathis-rvrs.fr/a?b=1', d), 'https://travaux.mathis-rvrs.fr/a?b=1');
  assert.equal(safeReturnUrl('https://mathis-rvrs.fr/', d), 'https://mathis-rvrs.fr/');
  assert.equal(safeReturnUrl('http://travaux.mathis-rvrs.fr/', d), null);
  assert.equal(safeReturnUrl('https://evil.com/?x=.mathis-rvrs.fr', d), null);
  assert.equal(safeReturnUrl('https://mathis-rvrs.fr.evil.com/', d), null);
  assert.equal(safeReturnUrl('https://evilmathis-rvrs.fr/', d), null);
  assert.equal(safeReturnUrl('https://user:pw@travaux.mathis-rvrs.fr/', d), null);
  assert.equal(safeReturnUrl('//evil.com', d), null);
  assert.equal(safeReturnUrl('javascript:alert(1)', d), null);
});
