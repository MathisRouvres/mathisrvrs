// Compte sans TOTP (« couple », limité à budget.) : mot de passe seul, limite d'échecs par identifiant.
// « mathis » (accès partout) exige toujours son code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, newTotpSecret, totpAt } from '../lib.mjs';
import { ORIGIN, startServer, tempCredentials } from './helpers.mjs';

const COUPLE_PASSWORD = 'budget88';
const MATHIS_PASSWORD = 'mot de passe de mathis';
const mathisTotp = newTotpSecret();
const sessionSecret = 'e'.repeat(64);
const accounts = () => ({
  mathis: { passwordHash: hashPassword(MATHIS_PASSWORD), totpSecret: mathisTotp, epoch: 1, lastTotpStep: -1, hosts: ['*'] },
  couple: { passwordHash: hashPassword(COUPLE_PASSWORD), totpSecret: null, epoch: 1, lastTotpStep: -1, hosts: ['budget.mathis-rvrs.fr'] },
  // Modifié à la main : accès partout sans TOTP, ignoré par le service.
  admin: { passwordHash: hashPassword(MATHIS_PASSWORD), totpSecret: null, epoch: 1, lastTotpStep: -1, hosts: ['*'] },
});

const step = () => Math.floor(Date.now() / 30000);
const login = (base, fields, ip) =>
  fetch(`${base}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: ORIGIN, 'X-Forwarded-For': ip },
    body: new URLSearchParams(fields),
  });
const verify = (base, cookie, host) =>
  fetch(`${base}/verify`, { redirect: 'manual', headers: { Cookie: cookie, 'X-Forwarded-Method': 'GET', 'X-Forwarded-Host': host, 'X-Forwarded-Uri': '/' } });

test('mot de passe seul pour couple, code ignoré ; mathis et admin refusés sans code', async () => {
  const { base, stop } = await startServer(tempCredentials({ sessionSecret, accounts: accounts() }));
  try {
    const form = await (await fetch(`${base}/login`)).text();
    assert.doesNotMatch(form.match(/<input id="code"[^>]*>/)[0], /required/, 'champ code facultatif pour tous');

    const res = await login(base, { user: 'couple', password: COUPLE_PASSWORD, code: '' }, '198.51.100.1');
    assert.equal(res.status, 303);
    const cookie = res.headers.get('set-cookie').split(';')[0];
    const ok = await verify(base, cookie, 'budget.mathis-rvrs.fr');
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('x-auth-user'), 'couple');
    assert.equal((await verify(base, cookie, 'pma.mathis-rvrs.fr')).status, 403);
    assert.equal((await login(base, { user: 'couple', password: COUPLE_PASSWORD, code: '000000' }, '198.51.100.1')).status, 303);
    assert.equal((await login(base, { user: 'couple', password: 'mauvais1', code: '' }, '198.51.100.1')).status, 401);

    assert.equal((await login(base, { user: 'mathis', password: MATHIS_PASSWORD, code: '' }, '198.51.100.2')).status, 401);
    assert.equal((await login(base, { user: 'admin', password: MATHIS_PASSWORD, code: '' }, '198.51.100.2')).status, 401);
    assert.equal((await login(base, { user: 'mathis', password: MATHIS_PASSWORD, code: totpAt(mathisTotp, step()) }, '198.51.100.3')).status, 303);
  } finally {
    stop();
  }
});

test('10 échecs par heure sur un compte sans TOTP ou un identifiant inconnu, quelle que soit l\'IP', async () => {
  const { base, stop } = await startServer(tempCredentials({ sessionSecret, accounts: accounts() }));
  try {
    for (const user of ['couple', 'fantome']) {
      for (let i = 0; i < 10; i++) {
        assert.equal((await login(base, { user, password: `faux-${i}`, code: '' }, `192.0.2.${i + (user === 'couple' ? 0 : 100)}`)).status, 401);
      }
      const blocked = await login(base, { user, password: COUPLE_PASSWORD, code: '' }, '192.0.2.250');
      assert.equal(blocked.status, 429, `${user} bloqué même depuis une nouvelle IP`);
      assert.match(await blocked.text(), /Trop de tentatives/);
    }
  } finally {
    stop();
  }
});

test('mathis n\'est pas bloqué par identifiant (son TOTP le protège)', async () => {
  const { base, stop } = await startServer(tempCredentials({ sessionSecret, accounts: accounts() }));
  try {
    for (let i = 0; i < 12; i++) await login(base, { user: 'mathis', password: `faux-${i}`, code: '123456' }, `203.0.113.${i}`);
    const res = await login(base, { user: 'mathis', password: MATHIS_PASSWORD, code: totpAt(mathisTotp, step()) }, '203.0.113.200');
    assert.equal(res.status, 303);
  } finally {
    stop();
  }
});
