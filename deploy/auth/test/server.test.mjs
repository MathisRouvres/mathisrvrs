// Parcours HTTP complet du service, sur un vrai serveur et un credentials.json temporaire.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { hashPassword, newTotpSecret, totpAt } from '../lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://auth.mathis-rvrs.fr';
const PASSWORD = 'mot de passe de test assez long';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-test-'));
const file = path.join(dir, 'credentials.json');
const secret = newTotpSecret();
fs.writeFileSync(file, JSON.stringify({
  passwordHash: hashPassword(PASSWORD), totpSecret: secret, sessionSecret: 'c'.repeat(64), epoch: 1, lastTotpStep: -1,
}));

const port = 18000 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
let proc;

test.before(async () => {
  proc = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT, env: { ...process.env, PORT: String(port), CREDENTIALS_FILE: file }, stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${base}/health`)).ok) return;
    } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('serveur non démarré');
});
test.after(() => proc.kill());

const step = () => Math.floor(Date.now() / 30000);
const login = (fields, { origin = ORIGIN, ip = '203.0.113.9' } = {}) =>
  fetch(`${base}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin, 'X-Forwarded-For': ip },
    body: new URLSearchParams(fields),
  });
const verify = (cookie, method = 'GET') =>
  fetch(`${base}/verify`, {
    redirect: 'manual',
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      'X-Forwarded-Method': method, 'X-Forwarded-Host': 'travaux.mathis-rvrs.fr', 'X-Forwarded-Uri': '/plans?id=3',
    },
  });

let cookie = '';

test('sans session : redirection vers la connexion avec adresse de retour', async () => {
  const res = await verify('');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), `${ORIGIN}/login?rd=${encodeURIComponent('https://travaux.mathis-rvrs.fr/plans?id=3')}`);
  assert.equal((await verify('', 'POST')).status, 401);
});

test('page de connexion : en-têtes de sécurité, adresse de retour étrangère ignorée', async () => {
  const res = await fetch(`${base}/login?rd=${encodeURIComponent('https://evil.com/')}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'.*frame-ancestors 'none'/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await res.text(), /evil\.com/);
});

test('envoi depuis une autre origine refusé', async () => {
  const res = await login({ password: PASSWORD, code: totpAt(secret, step()) }, { origin: 'https://evil.com' });
  assert.equal(res.status, 403);
});

test('mauvais mot de passe ou mauvais code refusés', async () => {
  assert.equal((await login({ password: 'faux', code: totpAt(secret, step()) }, { ip: '198.51.100.1' })).status, 401);
  assert.equal((await login({ password: PASSWORD, code: '000000' }, { ip: '198.51.100.1' })).status, 401);
});

test('connexion réussie : cookie de domaine, retour vers le dashboard', async () => {
  const res = await login({ password: PASSWORD, code: totpAt(secret, step()), rd: 'https://travaux.mathis-rvrs.fr/plans' });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), 'https://travaux.mathis-rvrs.fr/plans');
  const setCookie = res.headers.get('set-cookie');
  assert.match(setCookie, /^__Secure-mr_session=[^;]+; Domain=mathis-rvrs\.fr; Path=\/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax$/);
  cookie = setCookie.split(';')[0];
  assert.equal((await verify(cookie)).status, 200);
  assert.equal((await verify(cookie, 'POST')).status, 200);
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
  fs.writeFileSync(file, JSON.stringify({ ...current, epoch: 2 }));
  for (let i = 0; i < 40 && (await verify(cookie)).status === 200; i++) await new Promise((r) => setTimeout(r, 100));
  assert.equal((await verify(cookie)).status, 302);
});

test('déconnexion : cookie effacé, origine exigée', async () => {
  const bad = await fetch(`${base}/logout`, { method: 'POST', redirect: 'manual', headers: { Origin: 'https://evil.com' } });
  assert.equal(bad.status, 403);
  const res = await fetch(`${base}/logout`, { method: 'POST', redirect: 'manual', headers: { Origin: ORIGIN } });
  assert.equal(res.status, 303);
  assert.match(res.headers.get('set-cookie'), /Max-Age=0/);
});
