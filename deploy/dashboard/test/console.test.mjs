// Tests des parseurs de la console (console.mjs) : node --test test/*.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecent, demuxLogs, validIp } from '../console.mjs';

test('parseRecent lit la liste xt_recent, plus récentes d’abord', () => {
  const list = parseRecent([
    'src=203.0.113.7 ttl: 46 last_seen: 4473304986 oldest_pkt: 1 4473304986',
    'src=198.51.100.2 ttl: 54 last_seen: 4475890453 oldest_pkt: 6 4475890000, 4475890100, 4475890200, 4475890300, 4475890400, 4475890453',
    'src=2001:db8::1 ttl: 54 last_seen: 4400000000 oldest_pkt: 2 4399999999, 4400000000',
    'ligne inattendue',
    '',
  ].join('\n'));
  assert.deepEqual(list.map((e) => [e.ip, e.hits]), [['198.51.100.2', 6], ['203.0.113.7', 1], ['2001:db8::1', 2]]);
});

test('demuxLogs : flux multiplexé et flux brut', () => {
  const frame = (stream, s) => {
    const p = Buffer.from(s);
    const h = Buffer.alloc(8);
    h[0] = stream;
    h.writeUInt32BE(p.length, 4);
    return Buffer.concat([h, p]);
  };
  // caractère multi-octet coupé entre deux blocs : recollé avant décodage
  const e = Buffer.from('é');
  const split = Buffer.concat([frame(1, 'ligne 1\n'), frame(2, ''), Buffer.from([1, 0, 0, 0, 0, 0, 0, 1]), e.subarray(0, 1), Buffer.from([1, 0, 0, 0, 0, 0, 0, 1]), e.subarray(1)]);
  assert.equal(demuxLogs(split), 'ligne 1\né');
  assert.equal(demuxLogs(Buffer.from('sortie TTY brute\n')), 'sortie TTY brute\n');
});

test('validIp refuse tout ce qui n’est pas une IP', () => {
  assert.equal(validIp('203.0.113.7'), '203.0.113.7');
  assert.equal(validIp('2001:db8::1'), '2001:db8::1');
  assert.equal(validIp('1.2.3.4; rm -rf /'), '');
  assert.equal(validIp(''), '');
  assert.equal(validIp(undefined), '');
});
