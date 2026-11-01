// Comptes multiples : un compte limité (« couple » → budget.) ne passe que sur ses hôtes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hashPassword, newTotpSecret, signSession, totpAt } from '../lib.mjs';
import { ORIGIN, startServer, tempCredentials, until } from './helpers.mjs';

const PASSWORD = 'mot de passe du couple, assez long';
const coupleTotp = newTotpSecret();
const sessionSecret = 'd'.repeat(64);
const file = tempCredentials({
  sessionSecret,
  accounts: {
    mathis: { passwordHash: hashPassword('autre mot de passe long'), totpSecret: newTotpSecret(), epoch: 4, lastTotpStep: -1, hosts: ['*'] },
    couple: { passwordHash: hashPassword(PASSWORD), totpSecret: coupleTotp, epoch: 1, lastTotpStep: -1, hosts: ['budget.mathis-rvrs.fr'] },
  },
});

let base;
let stop;
test.before(async () => {
  ({ base, stop } = await startServer(file, {
    AUTH_APPS: 'Travaux=https://travaux.mathis-rvrs.fr,Budget=https://budget.mathis-rvrs.fr,phpMyAdmin=https://pma.mathis-rvrs.fr',
  }));
});
test.after(() => stop());

const step = () => Math.floor(Date.now() / 30000);
const cookieFor = (payload) => `__Secure-mr_session=${signSession({ days: 1, secret: sessionSecret, ...payload })}`;
const verify = (cookie, host, extra = {}) =>
  fetch(`${base}/verify`, {
    redirect: 'manual',
    headers: { Cookie: cookie, 'X-Forwarded-Method': 'GET', ...(host ? { 'X-Forwarded-Host': host } : {}), 'X-Forwarded-Uri': '/', ...extra },
  });
const login = (fields, ip) =>
  fetch(`${base}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: ORIGIN, 'X-Forwarded-For': ip },
    body: new URLSearchParams(fields),
  });

let coupleCookie = '';

test('connexion du compte limité : retour vers un hôte interdit remplacé par l\'accueil', async () => {
  const res = await login({ user: 'couple', password: PASSWORD, code: totpAt(coupleTotp, step()), rd: 'https://pma.mathis-rvrs.fr/' }, '203.0.113.20');
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/');
  coupleCookie = res.headers.get('set-cookie').split(';')[0];
});

test('compte limité : 200 + X-Auth-User sur son hôte, 403 ailleurs', async () => {
  const ok = await verify(coupleCookie, 'budget.mathis-rvrs.fr');
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('x-auth-user'), 'couple');
  assert.equal((await verify(coupleCookie, 'BUDGET.mathis-rvrs.fr:443')).status, 200, 'casse et port ignorés');
  for (const host of ['pma.mathis-rvrs.fr', 'travaux.mathis-rvrs.fr', 'budget.mathis-rvrs.fr.evil.com', 'xbudget.mathis-rvrs.fr', '']) {
    const res = await verify(coupleCookie, host);
    assert.equal(res.status, 403, host || '(sans hôte)');
    assert.equal(res.headers.get('x-auth-user'), null);
    assert.match(await res.text(), /n'a pas accès/);
  }
});

test('compte limité : connexion avec un retour autorisé, accueil limité à ses sites', async () => {
  const res = await login({ user: 'couple', password: PASSWORD, code: totpAt(coupleTotp, step() + 1), rd: 'https://budget.mathis-rvrs.fr/mois' }, '203.0.113.21');
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), 'https://budget.mathis-rvrs.fr/mois');
  const home = await (await fetch(`${base}/`, { headers: { Cookie: coupleCookie } })).text();
  assert.match(home, /Connecté \(couple\)/);
  assert.match(home, /budget\.mathis-rvrs\.fr/);
  assert.doesNotMatch(home, /pma\.|travaux\./);
  const redirected = await fetch(`${base}/login?rd=${encodeURIComponent('https://pma.mathis-rvrs.fr/')}`, { redirect: 'manual', headers: { Cookie: coupleCookie } });
  assert.equal(redirected.headers.get('location'), '/');
});

test('compte « * » : accès partout avec son nom', async () => {
  const c = cookieFor({ epoch: 4, user: 'mathis' });
  for (const host of ['pma.mathis-rvrs.fr', 'budget.mathis-rvrs.fr', '']) {
    const res = await verify(c, host);
    assert.equal(res.status, 200, host);
    assert.equal(res.headers.get('x-auth-user'), 'mathis');
  }
});

test('jetons refusés : compte inconnu, prototype, mauvaise époque, autre compte', async () => {
  for (const payload of [
    { epoch: 1, user: 'inconnu' },
    { epoch: 1, user: '__proto__' },
    { epoch: 1, user: 'constructor' },
    { epoch: 2, user: 'couple' },
    { epoch: 1, user: 'mathis' }, // époque de couple, pas de mathis
  ]) {
    assert.equal((await verify(cookieFor(payload), 'budget.mathis-rvrs.fr')).status, 302, JSON.stringify(payload));
  }
});

test('connexion par prototype refusée sans planter', async () => {
  assert.equal((await login({ user: '__proto__', password: PASSWORD, code: '123456' }, '203.0.113.22')).status, 401);
  assert.equal((await login({ user: 'couple', password: 'autre mot de passe long', code: totpAt(coupleTotp, step()) }, '203.0.113.22')).status, 401);
});

test('changement de périmètre : effet immédiat sur la session en cours', async () => {
  const current = JSON.parse(fs.readFileSync(file, 'utf8'));
  current.accounts.couple.hosts = ['budget.mathis-rvrs.fr', 'travaux.mathis-rvrs.fr'];
  fs.writeFileSync(file, JSON.stringify(current));
  assert.ok(await until(async () => (await verify(coupleCookie, 'travaux.mathis-rvrs.fr')).status === 200));
  delete current.accounts.couple;
  fs.writeFileSync(file, JSON.stringify(current));
  assert.ok(await until(async () => (await verify(coupleCookie, 'budget.mathis-rvrs.fr')).status === 302), 'compte supprimé');
});
