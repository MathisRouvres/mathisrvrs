// Métriques du VPS pour la page /server du dashboard, sans dépendance.
//
// Le conteneur ne monte pas la racine de l'hôte : on s'appuie sur ce que Docker laisse voir.
// - /proc/stat, /proc/meminfo, /proc/loadavg, /proc/uptime ne sont pas isolés par Docker (sans
//   lxcfs) : ils donnent les valeurs de l'hôte entier.
// - statfs('/') sur l'overlay du conteneur renvoie le système de fichiers qui porte Docker
//   (le disque principal du VPS).
// - Le socket Docker (déjà monté pour les scans) donne l'hôte, les conteneurs et leur usage.
//   Uniquement des GET en lecture.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
const SAMPLE_MS = 5_000;
const HISTORY_POINTS = 720; // 1 h à un point toutes les 5 s
const DF_TTL_MS = 10 * 60_000; // /system/df est coûteux (taille des volumes) : 10 min de cache

const readProc = (file) => {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
};

// --- Parseurs purs (testés) ---

// Ligne agrégée « cpu » de /proc/stat. guest/guest_nice sont déjà comptés dans user/nice.
export function parseCpuStat(text) {
  const line = text.split('\n').find((l) => l.startsWith('cpu '));
  if (!line) return null;
  const [user, nice, system, idle, iowait = 0, irq = 0, softirq = 0, steal = 0] =
    line.trim().split(/\s+/).slice(1).map(Number);
  const total = user + nice + system + idle + iowait + irq + softirq + steal;
  return { total, idle: idle + iowait, iowait, steal };
}

// Pourcentages entre deux relevés de /proc/stat.
export function cpuUsage(prev, cur) {
  if (!prev || !cur) return null;
  const dt = cur.total - prev.total;
  if (dt <= 0) return null;
  const pct = (v) => Math.min(100, Math.max(0, (v / dt) * 100));
  return {
    busy: pct(dt - (cur.idle - prev.idle)),
    iowait: pct(cur.iowait - prev.iowait),
    steal: pct(cur.steal - prev.steal),
  };
}

// /proc/meminfo en octets. « Utilisée » = total - MemAvailable (comme `free`).
export function parseMeminfo(text) {
  const kb = {};
  for (const l of text.split('\n')) {
    const m = /^(\w+):\s+(\d+)/.exec(l);
    if (m) kb[m[1]] = Number(m[2]) * 1024;
  }
  if (!kb.MemTotal) return null;
  const available = kb.MemAvailable ?? kb.MemFree ?? 0;
  return {
    total: kb.MemTotal,
    used: kb.MemTotal - available,
    available,
    cache: (kb.Cached || 0) + (kb.Buffers || 0),
    swapTotal: kb.SwapTotal || 0,
    swapUsed: (kb.SwapTotal || 0) - (kb.SwapFree || 0),
  };
}

// Usage d'un conteneur depuis /containers/<id>/stats?stream=false.
export function containerUsage(s) {
  const cpuDelta = (s.cpu_stats?.cpu_usage?.total_usage ?? 0) - (s.precpu_stats?.cpu_usage?.total_usage ?? 0);
  const sysDelta = (s.cpu_stats?.system_cpu_usage ?? 0) - (s.precpu_stats?.system_cpu_usage ?? 0);
  const cpus = s.cpu_stats?.online_cpus || s.cpu_stats?.cpu_usage?.percpu_usage?.length || 1;
  const cpu = cpuDelta > 0 && sysDelta > 0 ? (cpuDelta / sysDelta) * cpus * 100 : 0;
  // Comme `docker stats` : le cache de pages récupérable n'est pas compté.
  const ms = s.memory_stats || {};
  const cache = ms.stats?.inactive_file ?? ms.stats?.total_inactive_file ?? ms.stats?.cache ?? 0;
  const mem = Math.max(0, (ms.usage || 0) - cache);
  let rx = 0;
  let tx = 0;
  for (const n of Object.values(s.networks || {})) { rx += n.rx_bytes || 0; tx += n.tx_bytes || 0; }
  return { cpu, mem, memLimit: ms.limit || 0, rx, tx };
}

// --- Relevés hôte ---

export function hostSnapshot() {
  const mem = parseMeminfo(readProc('/proc/meminfo')) ?? {
    total: os.totalmem(), used: os.totalmem() - os.freemem(), available: os.freemem(), cache: 0, swapTotal: 0, swapUsed: 0,
  };
  let disk = null;
  try {
    const s = fs.statfsSync('/');
    const used = (s.blocks - s.bfree) * s.bsize;
    const avail = s.bavail * s.bsize;
    disk = { total: s.blocks * s.bsize, used, avail, inodes: s.files, inodesUsed: s.files - s.ffree };
  } catch { /* statfs indisponible */ }
  const loadavg = readProc('/proc/loadavg').split(/\s+/);
  const procs = /^\d+\/(\d+)$/.exec(loadavg[3] || '')?.[1];
  return {
    cores: os.availableParallelism?.() ?? os.cpus().length,
    cpuModel: (os.cpus()[0]?.model?.trim() || '').replace(/^unknown$/i, ''),
    load: os.loadavg(),
    uptime: os.uptime(),
    kernel: os.release(),
    procs: procs ? Number(procs) : null,
    mem,
    disk,
  };
}

// --- Échantillonneur : CPU instantané + historique 1 h (CPU, RAM) ---

let lastStat = parseCpuStat(readProc('/proc/stat'));
const history = [];
let currentCpu = null;

function sample() {
  const stat = parseCpuStat(readProc('/proc/stat'));
  const usage = cpuUsage(lastStat, stat);
  lastStat = stat;
  if (!usage) return;
  currentCpu = usage;
  const mem = parseMeminfo(readProc('/proc/meminfo'));
  history.push({ t: Date.now(), cpu: usage.busy, mem: mem ? (mem.used / mem.total) * 100 : null });
  if (history.length > HISTORY_POINTS) history.shift();
}
setInterval(sample, SAMPLE_MS).unref();

export const cpuNow = () => currentCpu;
export const cpuHistory = () => history.slice();

// --- Docker (lecture seule, via le socket) ---

function dockerGet(p, timeoutMs = 4_000) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: DOCKER_SOCKET, path: p, method: 'GET', headers: { Host: 'docker' }, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`docker ${p} → ${res.statusCode}`));
          try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(e); }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error(`docker ${p} → délai dépassé`)));
    req.on('error', reject);
    req.end();
  });
}

let dfCache = null; // { at, data } une fois résolu, { at, promise } pendant le calcul

function dockerDf() {
  if (dfCache && Date.now() - dfCache.at < DF_TTL_MS) return dfCache.data ? Promise.resolve(dfCache.data) : dfCache.promise;
  const promise = dockerGet('/system/df', 15_000).then((d) => {
    const sum = (arr, f) => (arr || []).reduce((n, x) => n + (f(x) || 0), 0);
    const images = d.Images || [];
    const cache = d.BuildCache || [];
    const data = {
      images: { count: images.length, size: sum(images, (i) => i.Size), reclaimable: sum(images.filter((i) => !i.Containers), (i) => i.Size) },
      containers: { count: (d.Containers || []).length, size: sum(d.Containers, (c) => c.SizeRw) },
      volumes: { count: (d.Volumes || []).length, size: sum(d.Volumes, (v) => Math.max(0, v.UsageData?.Size ?? 0)) },
      buildCache: { count: cache.length, size: sum(cache, (b) => b.Size), reclaimable: sum(cache.filter((b) => !b.InUse), (b) => b.Size) },
    };
    dfCache = { at: Date.now(), data };
    return data;
  });
  dfCache = { at: Date.now(), promise };
  promise.catch(() => { dfCache = null; });
  return promise;
}

// Tout ce que Docker sait de l'hôte et des conteneurs. Chaque partie échoue indépendamment.
export async function dockerSnapshot() {
  const [info, list, df] = await Promise.allSettled([
    dockerGet('/info'),
    dockerGet('/containers/json?all=1'),
    dockerDf(),
  ]);
  let containers = null;
  if (list.status === 'fulfilled') {
    // stream=false : Docker attend un 2e relevé (~1 s) pour le CPU. Requêtes en parallèle.
    const stats = await Promise.allSettled(list.value.map((c) =>
      c.State === 'running'
        ? dockerGet(`/containers/${encodeURIComponent(c.Id)}/stats?stream=false`, 5_000)
        : Promise.reject(new Error('arrêté'))));
    containers = list.value
      .map((c, i) => ({
        name: (c.Names?.[0] || c.Id.slice(0, 12)).replace(/^\//, ''),
        image: c.Image,
        state: c.State,
        status: c.Status,
        usage: stats[i].status === 'fulfilled' ? containerUsage(stats[i].value) : null,
      }))
      .sort((a, b) => (b.usage?.mem ?? -1) - (a.usage?.mem ?? -1));
  }
  const i = info.status === 'fulfilled' ? info.value : null;
  return {
    error: list.status === 'rejected' ? String(list.reason?.message || list.reason) : '',
    host: i && {
      name: i.Name,
      os: i.OperatingSystem,
      kernel: i.KernelVersion,
      docker: i.ServerVersion,
      running: i.ContainersRunning,
      stopped: i.ContainersStopped,
      images: i.Images,
    },
    containers,
    df: df.status === 'fulfilled' ? df.value : null,
  };
}
