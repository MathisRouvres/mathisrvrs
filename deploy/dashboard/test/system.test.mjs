// Tests des parseurs de métriques (system.mjs) : node --test test/*.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCpuStat, cpuUsage, parseMeminfo, containerUsage } from '../system.mjs';

test('parseCpuStat lit la ligne agrégée', () => {
  const s = parseCpuStat('cpu  100 0 50 800 20 0 10 20 0 0\ncpu0 1 2 3 4\n');
  assert.deepEqual(s, { total: 1000, idle: 820, iowait: 20, steal: 20 });
  assert.equal(parseCpuStat(''), null);
});

test('cpuUsage calcule les pourcentages entre deux relevés', () => {
  const a = { total: 1000, idle: 800, iowait: 0, steal: 0 };
  const b = { total: 2000, idle: 1550, iowait: 50, steal: 100 };
  const u = cpuUsage(a, b);
  assert.equal(u.busy, 25);
  assert.equal(u.iowait, 5);
  assert.equal(u.steal, 10);
  assert.equal(cpuUsage(null, b), null);
  assert.equal(cpuUsage(b, b), null);
});

test('parseMeminfo : utilisée = total - MemAvailable', () => {
  const m = parseMeminfo('MemTotal: 4000 kB\nMemFree: 500 kB\nMemAvailable: 1000 kB\nBuffers: 100 kB\nCached: 900 kB\nSwapTotal: 2000 kB\nSwapFree: 1500 kB\n');
  assert.equal(m.total, 4000 * 1024);
  assert.equal(m.used, 3000 * 1024);
  assert.equal(m.cache, 1000 * 1024);
  assert.equal(m.swapUsed, 500 * 1024);
  assert.equal(parseMeminfo('rien'), null);
});

test('containerUsage reproduit docker stats', () => {
  const u = containerUsage({
    cpu_stats: { cpu_usage: { total_usage: 300 }, system_cpu_usage: 2000, online_cpus: 2 },
    precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
    memory_stats: { usage: 1000, limit: 8000, stats: { inactive_file: 200 } },
    networks: { eth0: { rx_bytes: 10, tx_bytes: 20 }, eth1: { rx_bytes: 5, tx_bytes: 5 } },
  });
  assert.equal(u.cpu, 40);
  assert.equal(u.mem, 800);
  assert.equal(u.rx, 15);
  assert.equal(u.tx, 25);
  // conteneur sans relevé précédent : pas de NaN
  assert.equal(containerUsage({}).cpu, 0);
});
