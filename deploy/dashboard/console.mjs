// Actions prédéfinies sur le VPS pour la page /console du dashboard. Pas de shell : chaque action est
// une opération fixe, ses paramètres sont validés (IP, conteneur existant) et jamais interprétés.
//
// - Pare-feu SSH : la règle UFW « 22/tcp LIMIT » rejette une IP qui ouvre 6 connexions SSH ou plus
//   en 30 s (module xt_recent, liste DEFAULT) ; chaque nouvel essai prolonge le blocage. On lit et
//   on retire des entrées de /proc/net/xt_recent/DEFAULT de l'hôte via un conteneur éphémère
//   (image du dashboard, réseau de l'hôte, seule capacité NET_ADMIN, racine en lecture seule).
// - Conteneurs : logs, redémarrage, démarrage via l'API Docker.
// - Nettoyage : images sans tag et cache de build inutilisé.
import os from 'node:os';
import net from 'node:net';
import { dockerRequest, dockerGet } from './system.mjs';

const HELPER_IMAGE = process.env.HELPER_IMAGE || 'mathisrvrs-dashboard:local';
const RECENT_FILE = '/proc/net/xt_recent/DEFAULT';
export const UFW_LIMIT_HITS = 6; // --hitcount 6 --seconds 30 dans les règles générées par UFW

// --- Parseurs purs (testés) ---

// Lignes « src=1.2.3.4 ttl: 52 last_seen: 4473304986 oldest_pkt: 2 4469624070, 4473304986 ».
// last_seen est en jiffies : seul l'ordre compte (le plus récent d'abord).
export function parseRecent(text) {
  return text.split('\n')
    .map((l) => /^src=(\S+) ttl: \d+ last_seen: (\d+) oldest_pkt: \d+ ([\d, ]+)$/.exec(l.trim()))
    .filter(Boolean)
    .map((m) => ({ ip: m[1], lastSeen: Number(m[2]), hits: m[3].split(',').filter((s) => s.trim()).length }))
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

// Logs Docker : flux multiplexé (en-tête de 8 octets par bloc) pour un conteneur sans TTY, brut sinon.
export function demuxLogs(buf) {
  if (buf.length < 8 || buf[0] > 2 || buf[1] || buf[2] || buf[3]) return buf.toString('utf8');
  const parts = [];
  for (let i = 0; i + 8 <= buf.length;) {
    const n = buf.readUInt32BE(i + 4);
    parts.push(buf.subarray(i + 8, i + 8 + n));
    i += 8 + n;
  }
  return Buffer.concat(parts).toString('utf8');
}

export const validIp = (ip) => (net.isIP(String(ip || '')) ? String(ip) : '');

// --- Conteneur éphémère : script node fixe, données passées par variables d'environnement ---

async function runHelper(script, env = {}) {
  const created = await dockerRequest('POST', '/containers/create', {
    body: {
      Image: HELPER_IMAGE,
      Cmd: ['node', '-e', script],
      Env: Object.entries(env).map(([k, v]) => `${k}=${v}`),
      Labels: { 'fr.mathis-rvrs.dashboard.helper': '1' },
      HostConfig: { NetworkMode: 'host', CapDrop: ['ALL'], CapAdd: ['NET_ADMIN'], ReadonlyRootfs: true },
    },
  });
  if (created.status !== 201) throw new Error(`création du conteneur d'action → ${created.status} ${created.body.toString('utf8').slice(0, 200)}`);
  const { Id } = JSON.parse(created.body.toString('utf8'));
  try {
    const started = await dockerRequest('POST', `/containers/${Id}/start`);
    if (started.status !== 204) throw new Error(`démarrage du conteneur d'action → ${started.status}`);
    const waited = await dockerRequest('POST', `/containers/${Id}/wait`, { timeoutMs: 15_000 });
    const code = JSON.parse(waited.body.toString('utf8')).StatusCode;
    const logs = await dockerRequest('GET', `/containers/${Id}/logs?stdout=1&stderr=1`);
    const out = demuxLogs(logs.body);
    if (code !== 0) throw new Error(out.trim().split('\n')[0].slice(0, 200) || `action en échec (code ${code})`);
    return out;
  } finally {
    await dockerRequest('DELETE', `/containers/${Id}?force=1`).catch(() => {});
  }
}

// Prélude des scripts pare-feu : message court si l'hôte n'a pas de règle UFW LIMIT.
const RECENT_PRELUDE = `const fs = require('fs'); const F = ${JSON.stringify(RECENT_FILE)};
if (!fs.existsSync(F)) { console.error('pas de liste UFW LIMIT sur cet hôte (' + F + ' absent)'); process.exit(1); }`;

export async function sshLimitList() {
  return parseRecent(await runHelper(`${RECENT_PRELUDE}\nprocess.stdout.write(fs.readFileSync(F, 'utf8'));`));
}

// Retire une IP de la liste : son compteur repart de zéro, elle est débloquée aussitôt. Le noyau
// répond ENOENT si l'IP n'y est pas : déjà débloquée, ce n'est pas une erreur.
export async function sshLimitRemove(ip) {
  if (!validIp(ip)) throw new Error('IP invalide');
  await runHelper(`${RECENT_PRELUDE}
try { fs.writeFileSync(F, '-' + process.env.IP); } catch (e) { if (e.code !== 'ENOENT') { console.error(e.message); process.exit(1); } }`, { IP: ip });
}

// --- Conteneurs ---

// Docker donne au conteneur un hostname = début de son identifiant.
export const isSelf = (id) => id.startsWith(os.hostname());

// Conteneur désigné par son nom exact, parmi ceux qui existent (jamais d'identifiant libre).
export async function findContainer(name) {
  const list = await dockerGet('/containers/json?all=1');
  const c = list.find((x) => (x.Names || []).some((n) => n.replace(/^\//, '') === name));
  return c ? { id: c.Id, name, state: c.State, self: isSelf(c.Id) } : null;
}

export async function containerLogs(id, tail = 300) {
  const { status, body } = await dockerRequest('GET', `/containers/${encodeURIComponent(id)}/logs?stdout=1&stderr=1&timestamps=1&tail=${tail}`, { timeoutMs: 10_000 });
  if (status !== 200) throw new Error(`logs → ${status}`);
  return demuxLogs(body);
}

export async function containerAction(id, action) {
  if (action !== 'restart' && action !== 'start') throw new Error('action inconnue');
  const { status, body } = await dockerRequest('POST', `/containers/${encodeURIComponent(id)}/${action}?t=10`, { timeoutMs: 60_000 });
  if (status !== 204 && status !== 304) throw new Error(`${action} → ${status} ${body.toString('utf8').slice(0, 200)}`);
}

// --- Nettoyage : images sans tag (anciennes versions remplacées par un rebuild) + cache de build ---

export async function dockerPrune() {
  const images = await dockerRequest('POST', '/images/prune', { timeoutMs: 300_000 });
  if (images.status !== 200) throw new Error(`images/prune → ${images.status}`);
  const build = await dockerRequest('POST', '/build/prune', { timeoutMs: 300_000 });
  if (build.status !== 200) throw new Error(`build/prune → ${build.status}`);
  const i = JSON.parse(images.body.toString('utf8'));
  const b = JSON.parse(build.body.toString('utf8'));
  return { images: (i.ImagesDeleted || []).length, bytes: (i.SpaceReclaimed || 0) + (b.SpaceReclaimed || 0) };
}
