// Tests du dashboard : node --test test/*.test.mjs (sans dépendance).
// Un dossier de rapports temporaire est peuplé avant d'importer server.mjs (qui écoute au import).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 8399;
const SCAN = 'example.com-20260101-120000';
let tmp;
let mod;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-'));
  const dir = path.join(tmp, SCAN);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'report.md'),
    '# Rapport de securite - example.com\n\n- Date       : 2026-01-01 12:00:00\n- Mode       : passif (non intrusif)\n\n## 1. En-tetes\n```\n[MANQUE] CSP\n```\n');
  fs.writeFileSync(path.join(dir, 'headers-analysis.txt'), '- [MANQUE] Content-Security-Policy\n- [OK] X-Frame-Options\n');
  fs.writeFileSync(path.join(dir, 'nuclei.txt'), '[cve-2021-1] example.com\n[misconfig] example.com\n');
  fs.writeFileSync(path.join(dir, 'zap-report.html'), '<!doctype html><html><body>ZAP</body></html>');
  process.env.PORT = String(PORT);
  process.env.REPORTS_DIR = tmp;
  process.env.ORIGIN = `http://127.0.0.1:${PORT}`;
  process.env.SCAN_SCRIPT = '/usr/bin/true'; // n'exécute pas un vrai scan en test
  process.env.SCAN_DOCKER_VOLUME = '';
  mod = await import('../server.mjs');
  // laisse le serveur se lier
  await new Promise((r) => setTimeout(r, 150));
});

after(async () => {
  await new Promise((r) => mod.server.close(r));
  fs.rmSync(tmp, { recursive: true, force: true });
});

const get = (p, headers = {}) => fetch(`http://127.0.0.1:${PORT}${p}`, { headers });

test('health liste les scans', async () => {
  const res = await get('/health');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.scans, 1);
});

test('portail affiche les cartes et le compte', async () => {
  const res = await get('/', { 'X-Auth-User': 'mathis' });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Dashboard/);
  assert.match(html, /mathis-rvrs\.fr\/stats/);
  assert.match(html, /prospect\.mathis-rvrs\.fr/);
  assert.doesNotMatch(html, /Poker/);
  assert.match(html, /\/security/);
  assert.match(html, /Connecté : mathis/);
});

test('liste security montre le scan', async () => {
  const res = await get('/security');
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /example\.com/);
  assert.match(html, />2<\/span>\s*nuclei/);
});

test('page de scan rend le markdown', async () => {
  const res = await get(`/security/${SCAN}`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /<h1>Rapport de securite - example\.com<\/h1>/);
  assert.match(html, /Fichiers bruts/);
});

test('fichier brut servi', async () => {
  const res = await get(`/security/${SCAN}/raw/report.md`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/plain/);
});

test('scan inexistant → 404', async () => {
  const res = await get('/security/pas-un-scan');
  assert.equal(res.status, 404);
});

test('path traversal bloqué', async () => {
  const res = await get(`/security/${SCAN}/raw/..%2F..%2Fetc%2Fpasswd`);
  assert.equal(res.status, 404);
});

test('POST / refusé', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/`, { method: 'POST' });
  assert.equal(res.status, 404);
});

const postScan = (body, origin = `http://127.0.0.1:${PORT}`) =>
  fetch(`http://127.0.0.1:${PORT}/security/scan`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(origin ? { Origin: origin } : {}) },
    body,
  });

test('scan refusé si autorisation non cochée', async () => {
  const res = await postScan('url=https://example.com');
  assert.equal(res.status, 400);
});

test('scan refusé si origine étrangère (CSRF)', async () => {
  const res = await postScan('url=https://example.com&authorized=yes', 'https://evil.test');
  assert.equal(res.status, 403);
});

test('scan refusé si URL invalide', async () => {
  const res = await postScan('url=ftp://x&authorized=yes');
  assert.equal(res.status, 400);
});

test('scan lancé → 303 + dossier créé', async () => {
  const before = fs.readdirSync(tmp).length;
  const res = await postScan('url=https://scan-me.example.org&authorized=yes');
  assert.equal(res.status, 303);
  const loc = res.headers.get('location');
  assert.match(loc, /^\/security\/scan-me\.example\.org-\d{8}-\d{6}$/);
  const rel = decodeURIComponent(loc.split('/').pop());
  assert.ok(fs.existsSync(path.join(tmp, rel, 'report.md')));
  assert.equal(fs.readdirSync(tmp).length, before + 1);
});
