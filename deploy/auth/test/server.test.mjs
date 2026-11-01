// Parcours HTTP complet du service, sur un vrai serveur et un credentials.json temporaire à
// l'ANCIEN format (un seul compte) : il doit fonctionner tel quel comme compte « mathis ».
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hashPassword, newTotpSecret, signSession, totpAt } from '../lib.mjs';
import { ORIGIN, startServer, tempCredentials, until } from './helpers.mjs';

const PASSWORD = 'mot de passe de test assez long';
const secret = newTotpSecret();
const legacy = {
  passwordHash: hashPassword(PASSWORD), totpSecret: secret, sessionSecret: 'c'.repeat(64), epoch: 1, lastTotpStep: -1,
};
const file = tempCredentials(legacy);

let base;
let stop;
test.before(async () => {
  ({ base, stop } = await startServer(file));
});
test.after(() => stop());

const step = () => Math.floor(Date.now() / 30000);
const login = (fields, { origin = ORIGIN, ip = '203.0.113.9' } = {}) =>
  fetch(`${base}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin, 'X-Forwarded-For': ip },
    body: new URLSearchParams({ user: 'mathis', ...fields }),
  });
const verify = (cookie, method = 'GET', host = 'travaux.mathis-rvrs.fr') =>
  fetch(`${base}/verify`, {
    redirect: 'manual',
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      'X-Forwarded-Method': method, 'X-Forwarded-Host': host, 'X-Forwarded-Uri': '/plans?id=3',
    },
  });

let cookie = '';

test('sans session : redirection vers la connexion avec adresse de retour', async () => {
  const res = await verify('');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), `${ORIGIN}/login?rd=${encodeURIComponent('https://travaux.mathis-rvrs.fr/plans?id=3')}`);
  assert.equal(res.headers.get('x-auth-user'), null);
  assert.equal((await verify('', 'POST')).status, 401);
});

test('ancien format : session émise avant les comptes (sans « u ») toujours valide, partout', async () => {
  const old = `__Secure-mr_session=${signSession({ days: 30, epoch: 1, secret: legacy.sessionSecret })}`;
  for (const host of ['travaux.mathis-rvrs.fr', 'job.mathis-rvrs.fr', 'arbitre.mathis-rvrs.fr', 'pma.mathis-rvrs.fr', 'budget.mathis-rvrs.fr']) {
    const res = await verify(old, 'GET', host);
    assert.equal(res.status, 200, host);
    assert.equal(res.headers.get('x-auth-user'), 'mathis', host);
  }
});

test('page de connexion : en-têtes de sécurité, adresse de retour étrangère ignorée', async () => {
  const res = await fetch(`${base}/login?rd=${encodeURIComponent('https://evil.com/')}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'.*frame-ancestors 'none'/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const html = await res.text();
  assert.doesNotMatch(html, /evil\.com/);
  assert.match(html, /name="user"[^>]*autocomplete="username"/);
});

test('envoi depuis une autre origine refusé', async () => {
  const res = await login({ password: PASSWORD, code: totpAt(secret, step()) }, { origin: 'https://evil.com' });
  assert.equal(res.status, 403);
});

// Formulaire réel d'un navigateur : Origin peut valoir « null » ; Sec-Fetch-Site tranche.
const rawPost = (headers) =>
  fetch(`${base}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Forwarded-For': '198.51.100.7', ...headers },
    body: new URLSearchParams({ user: 'mathis', password: 'faux', code: '000000' }),
  });

test('Origin null : accepté seulement si Sec-Fetch-Site vaut same-origin', async () => {
  assert.equal((await rawPost({ Origin: 'null', 'Sec-Fetch-Site': 'same-origin' })).status, 401);
  assert.equal((await rawPost({ 'Sec-Fetch-Site': 'same-origin' })).status, 401);
  assert.equal((await rawPost({ Origin: 'null', 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await rawPost({ Origin: 'null' })).status, 403);
  assert.equal((await rawPost({})).status, 403);
  assert.equal((await rawPost({ Origin: 'https://evil.com', 'Sec-Fetch-Site': 'same-origin' })).status, 403);
});

test('page de connexion : politique de référent same-origin', async () => {
  const res = await fetch(`${base}/login`);
  assert.equal(res.headers.get('referrer-policy'), 'same-origin');
});

test('mauvais identifiant, mot de passe ou code refusés', async () => {
  assert.equal((await login({ password: 'faux', code: totpAt(secret, step()) }, { ip: '198.51.100.1' })).status, 401);
  assert.equal((await login({ password: PASSWORD, code: '000000' }, { ip: '198.51.100.1' })).status, 401);
  assert.equal((await login({ user: 'inconnu', password: PASSWORD, code: totpAt(secret, step()) }, { ip: '198.51.100.3' })).status, 401);
  assert.equal((await login({ user: '', password: PASSWORD, code: totpAt(secret, step()) }, { ip: '198.51.100.3' })).status, 401);
});

test('connexion réussie : cookie de domaine, retour vers le dashboard, X-Auth-User', async () => {
  const res = await login({ user: ' Mathis ', password: PASSWORD, code: totpAt(secret, step()), rd: 'https://travaux.mathis-rvrs.fr/plans' });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), 'https://travaux.mathis-rvrs.fr/plans');
  const setCookie = res.headers.get('set-cookie');
  assert.match(setCookie, /^__Secure-mr_session=[^;]+; Domain=mathis-rvrs\.fr; Path=\/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax$/);
  cookie = setCookie.split(';')[0];
  const ok = await verify(cookie);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('x-auth-user'), 'mathis');
  assert.equal((await verify(cookie, 'POST')).status, 200);
  assert.equal((await verify(cookie, 'GET', 'pma.mathis-rvrs.fr')).status, 200);
});

test('migration : après connexion, le fichier passe au nouveau format sans rien perdre', () => {
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(saved.sessionSecret, legacy.sessionSecret);
  assert.deepEqual(Object.keys(saved.accounts), ['mathis']);
  const m = saved.accounts.mathis;
  assert.equal(m.passwordHash, legacy.passwordHash);
  assert.equal(m.totpSecret, legacy.totpSecret);
  assert.equal(m.epoch, 1);
  assert.deepEqual(m.hosts, ['*']);
  assert.ok(m.lastTotpStep >= step() - 1);
  assert.equal(saved.passwordHash, undefined);
});

test('un code déjà utilisé ne sert pas deux fois', async () => {
  const res = await login({ password: PASSWORD, code: totpAt(secret, step()) }, { ip: '198.51.100.2' });
  assert.equal(res.status, 401);
});

test('limite : 5 échecs par IP puis 429', async () => {
  for (let i = 0; i < 5; i++) await login({ password: 'faux', code: '123456' }, { ip: '192.0.2.50' });
  const res = await login({ password: PASSWORD, code: totpAt(secret, step() + 1) }, { ip: '192.0.2.50' });
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get('retry-after')) > 0);
});

test('révocation (époque) : la session existante est refusée', async () => {
  const current = JSON.parse(fs.readFileSync(file, 'utf8'));
  current.accounts.mathis.epoch = 2;
  fs.writeFileSync(file, JSON.stringify(current));
  assert.ok(await until(async () => (await verify(cookie)).status === 302));
});

test('déconnexion : cookie effacé, origine exigée', async () => {
  const bad = await fetch(`${base}/logout`, { method: 'POST', redirect: 'manual', headers: { Origin: 'https://evil.com' } });
  assert.equal(bad.status, 403);
  const res = await fetch(`${base}/logout`, { method: 'POST', redirect: 'manual', headers: { Origin: ORIGIN } });
  assert.equal(res.status, 303);
  assert.match(res.headers.get('set-cookie'), /Max-Age=0/);
});
