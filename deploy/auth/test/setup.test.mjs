// Commandes non interactives de setup.mjs, sur un credentials.json temporaire.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hashPassword, newTotpSecret } from '../lib.mjs';
import { ROOT, tempCredentials } from './helpers.mjs';

const run = (file, ...args) =>
  spawnSync(process.execPath, ['setup.mjs', ...args], {
    cwd: ROOT, env: { ...process.env, CREDENTIALS_FILE: file }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const account = (hosts, epoch = 1) => ({ passwordHash: hashPassword('x'.repeat(12)), totpSecret: newTotpSecret(), epoch, lastTotpStep: -1, hosts });

test('ancien format : list le montre comme « mathis », revoke le convertit sans perte', () => {
  const legacy = { passwordHash: 'scrypt$1$1$1$a$b', totpSecret: 'ABCD', sessionSecret: 's'.repeat(64), epoch: 3, lastTotpStep: 42 };
  const file = tempCredentials(legacy);
  const list = run(file, 'list');
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /^mathis\t\*\t\(époque 3\)$/m);
  assert.deepEqual(read(file), legacy, 'list ne réécrit pas');
  const revoke = run(file, 'revoke');
  assert.equal(revoke.status, 0, revoke.stderr);
  assert.deepEqual(read(file), {
    sessionSecret: legacy.sessionSecret,
    accounts: { mathis: { passwordHash: legacy.passwordHash, totpSecret: legacy.totpSecret, epoch: 4, lastTotpStep: 42, hosts: ['*'] } },
  });
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('revoke d\'un compte, hosts, remove', () => {
  const file = tempCredentials({ sessionSecret: 's'.repeat(64), accounts: { mathis: account(['*'], 2), couple: account(['budget.mathis-rvrs.fr'], 5) } });
  assert.equal(run(file, 'revoke', 'couple').status, 0);
  assert.equal(read(file).accounts.couple.epoch, 6);
  assert.equal(read(file).accounts.mathis.epoch, 2, 'les autres comptes gardent leurs sessions');
  assert.equal(run(file, 'revoke').status, 0);
  assert.deepEqual([read(file).accounts.mathis.epoch, read(file).accounts.couple.epoch], [3, 7]);

  assert.equal(run(file, 'hosts', 'couple', 'Budget.mathis-rvrs.fr, travaux.mathis-rvrs.fr').status, 0);
  assert.deepEqual(read(file).accounts.couple.hosts, ['budget.mathis-rvrs.fr', 'travaux.mathis-rvrs.fr']);
  const bad = run(file, 'hosts', 'couple', 'pas un hôte/');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /hôte invalide/);

  assert.equal(run(file, 'remove', 'couple').status, 0);
  assert.deepEqual(Object.keys(read(file).accounts), ['mathis']);
  assert.match(run(file, 'remove', 'couple').stderr, /inconnu/);
});

test('add : contrôles avant toute saisie, fichier intact', () => {
  const file = tempCredentials({ sessionSecret: 's'.repeat(64), accounts: { mathis: account(['*']), couple: account(['budget.mathis-rvrs.fr']) } });
  const before = fs.readFileSync(file, 'utf8');
  assert.match(run(file, 'add', 'nouveau').stderr, /--hosts/);
  assert.match(run(file, 'add', 'Pas Valide', '--hosts', 'budget.mathis-rvrs.fr').stderr, /nom de compte/);
  assert.match(run(file, 'add', 'nouveau', '--hosts', '').stderr, /au moins un hôte/);
  assert.match(run(file, 'add', 'couple', '--hosts', 'budget.mathis-rvrs.fr').stderr, /déjà présent/);
  assert.match(run(file, 'add', 'nouveau', '--hosts', 'budget.mathis-rvrs.fr').stderr, /terminal interactif/);
  assert.match(run(file, 'password', 'inconnu').stderr, /inconnu/);
  assert.match(run(file).stderr, /terminal interactif/, 'setup.mjs sans argument : compte mathis, interactif');
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('fichier illisible : erreur, jamais écrasé', () => {
  const file = tempCredentials();
  fs.writeFileSync(file, '{ pas du json');
  const res = run(file, 'revoke');
  assert.equal(res.status, 1);
  assert.equal(fs.readFileSync(file, 'utf8'), '{ pas du json');
  fs.writeFileSync(file, JSON.stringify({ accounts: {} }));
  assert.match(run(file, 'list').stderr, /illisible/);
});
