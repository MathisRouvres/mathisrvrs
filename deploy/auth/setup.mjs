// Comptes de l'espace privé (dans le conteneur ; -it pour les commandes qui demandent une saisie) :
//   docker compose run --rm -it web node setup.mjs                             compte « mathis » (accès partout) : mot de passe + nouveau secret TOTP
//   docker compose run --rm -it web node setup.mjs add <compte> --hosts h1,h2  nouveau compte limité à ces hôtes : mot de passe + TOTP
//     … --no-totp                                                               mot de passe seul (interdit avec --hosts *)
//   docker compose run --rm -it web node setup.mjs reset <compte>              mot de passe + nouveau secret TOTP d'un compte (sans TOTP : mot de passe)
//   docker compose run --rm -it web node setup.mjs totp <compte> on            ajoute un TOTP à un compte qui n'en a pas
//   docker compose run --rm web node setup.mjs totp <compte> off               retire le TOTP (comptes limités à des hôtes listés seulement)
//   docker compose run --rm -it web node setup.mjs password [compte]           change seulement le mot de passe (« mathis » par défaut)
//   docker compose run --rm web node setup.mjs hosts <compte> h1,h2|*          change les hôtes autorisés
//   docker compose run --rm web node setup.mjs revoke [compte]                 déconnecte les sessions du compte, sinon de tous
//   docker compose run --rm web node setup.mjs remove <compte>                 supprime le compte
//   docker compose run --rm web node setup.mjs list                            comptes et hôtes autorisés
// Écrit /config/credentials.json (600) ; le service le recharge sans redémarrage. Un ancien fichier
// (un seul compte) est converti : il devient le compte « mathis », sessions en cours conservées.
import fs from 'node:fs';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import {
  ACCOUNT_NAME, LEGACY_ACCOUNT, MIN_PASSWORD_LENGTH, accountError, checkTotp, hashPassword, newTotpSecret, normalizeCredentials,
  otpauthUri, parseHosts,
} from './lib.mjs';

const FILE = process.env.CREDENTIALS_FILE || '/config/credentials.json';
const [mode = 'all', ...args] = process.argv.slice(2);

// null si le fichier n'existe pas ; erreur s'il existe mais est illisible (jamais écrasé).
function read() {
  let text;
  try {
    text = fs.readFileSync(FILE, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  const creds = normalizeCredentials(JSON.parse(text));
  if (!creds) throw new Error(`${FILE} illisible : corriger ou supprimer le fichier à la main.`);
  return creds;
}

// Dernier garde-fou avant écriture : aucun compte inutilisable, jamais d'accès partout sans TOTP.
function write(creds) {
  for (const [name, a] of Object.entries(creds.accounts)) {
    const err = accountError(a);
    if (err) throw new Error(`compte « ${name} » : ${err} (fichier non modifié).`);
  }
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(creds, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
}

function requireFile(creds) {
  if (!creds) throw new Error(`${FILE} absent : lancer setup d'abord.`);
  return creds;
}

function accountName(value) {
  const name = String(value || '').trim().toLowerCase();
  if (!ACCOUNT_NAME.test(name)) throw new Error('nom de compte requis : lettres minuscules, chiffres, - ou _ (32 max.)');
  return name;
}

function requireAccount(creds, name) {
  if (!Object.hasOwn(requireFile(creds).accounts, name)) throw new Error(`compte « ${name} » inconnu (voir : setup.mjs list).`);
  return creds.accounts[name];
}

function requireTty() {
  if (!process.stdin.isTTY) throw new Error('terminal interactif requis (docker compose run --rm -it …)');
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Rien n'est affiché pendant la saisie.
      rl._writeToOutput = (s) => {
        if (s.includes(question)) process.stdout.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function askPassword() {
  for (;;) {
    const a = await ask(`Nouveau mot de passe (${MIN_PASSWORD_LENGTH} caractères min.) : `, { hidden: true });
    if (a.length < MIN_PASSWORD_LENGTH) {
      console.log('Trop court.');
      continue;
    }
    const b = await ask('Confirmer : ', { hidden: true });
    if (a === b) return a;
    console.log('Les deux saisies diffèrent.');
  }
}

// Nouveau secret TOTP, affiché en QR code et vérifié par un code de l'application.
async function askTotpSecret(name) {
  const totpSecret = newTotpSecret();
  const uri = otpauthUri(totpSecret, { account: name });
  console.log("\nAjoute ce compte dans ton application d'authentification :");
  const qr = spawnSync('qrencode', ['-t', 'ANSIUTF8', uri], { encoding: 'utf8' });
  if (qr.status === 0) console.log(qr.stdout);
  console.log(`Saisie manuelle : ${totpSecret.match(/.{1,4}/g).join(' ')}  (TOTP, SHA1, 6 chiffres, 30 s)\n`);
  for (;;) {
    const code = (await ask("Code affiché par l'application : ")).trim();
    if (checkTotp(totpSecret, code) !== null) return totpSecret;
    console.log("Code incorrect, réessaie (vérifie l'heure du téléphone).");
  }
}

function noTotpAllowed(hosts) {
  if (hosts.includes('*')) throw new Error('un compte avec accès partout (*) garde toujours son TOTP.');
}

// Mot de passe + nouveau secret TOTP (sauf totp: false) ; l'époque augmente : les sessions du
// compte sont déconnectées.
async function enroll(creds, name, hosts, { totp = true } = {}) {
  if (!totp) noTotpAllowed(hosts);
  requireTty();
  console.log(`Compte « ${name} », accès : ${hosts.join(', ')}${totp ? '' : ', sans TOTP'}`);
  const password = await askPassword();
  const totpSecret = totp ? await askTotpSecret(name) : null;
  // Relu après la saisie : une connexion d'un autre compte a pu réécrire le fichier entre-temps.
  const latest = read() || creds || { sessionSecret: crypto.randomBytes(32).toString('hex'), accounts: {} };
  const previous = Object.hasOwn(latest.accounts, name) ? latest.accounts[name] : null;
  latest.accounts[name] = {
    passwordHash: hashPassword(password),
    totpSecret,
    epoch: (previous?.epoch ?? 0) + 1,
    lastTotpStep: -1,
    hosts,
  };
  write(latest);
  console.log(`Compte « ${name} » configuré (${FILE}).`);
}

async function main() {
  const creds = read();

  if (mode === 'all') {
    const hosts = creds && Object.hasOwn(creds.accounts, LEGACY_ACCOUNT) ? creds.accounts[LEGACY_ACCOUNT].hosts : ['*'];
    return enroll(creds, LEGACY_ACCOUNT, hosts);
  }

  if (mode === 'add') {
    const name = accountName(args[0]);
    const i = args.indexOf('--hosts');
    if (i < 0) throw new Error('usage : setup.mjs add <compte> --hosts budget.mathis-rvrs.fr[,autre.mathis-rvrs.fr]');
    const hosts = parseHosts(args[i + 1]);
    if (creds && Object.hasOwn(creds.accounts, name)) throw new Error(`compte « ${name} » déjà présent (setup.mjs reset ${name} pour le refaire).`);
    return enroll(creds, name, hosts, { totp: !args.includes('--no-totp') });
  }

  if (mode === 'reset') {
    const name = accountName(args[0]);
    const account = requireAccount(creds, name);
    return enroll(creds, name, account.hosts, { totp: account.totpSecret !== null });
  }

  if (mode === 'totp') {
    const name = accountName(args[0]);
    const account = requireAccount(creds, name);
    if (args[1] === 'off') {
      noTotpAllowed(account.hosts);
      Object.assign(account, { totpSecret: null, lastTotpStep: -1 });
      write(creds);
      console.log(`« ${name} » se connecte maintenant par mot de passe seul.`);
      return;
    }
    if (args[1] !== 'on') throw new Error('usage : setup.mjs totp <compte> on|off');
    if (account.totpSecret !== null) throw new Error(`« ${name} » a déjà un TOTP (setup.mjs reset ${name} pour en changer).`);
    requireTty();
    const totpSecret = await askTotpSecret(name);
    const latest = read();
    const fresh = requireAccount(latest, name);
    Object.assign(fresh, { totpSecret, lastTotpStep: -1, epoch: fresh.epoch + 1 });
    write(latest);
    console.log(`TOTP ajouté à « ${name} », ses sessions existantes sont déconnectées.`);
    return;
  }

  if (mode === 'password') {
    const name = accountName(args[0] || LEGACY_ACCOUNT);
    requireAccount(creds, name);
    requireTty();
    const passwordHash = hashPassword(await askPassword());
    const latest = read();
    const account = requireAccount(latest, name);
    Object.assign(account, { passwordHash, epoch: account.epoch + 1 });
    write(latest);
    console.log(`Mot de passe de « ${name} » changé, ses sessions existantes sont déconnectées.`);
    return;
  }

  if (mode === 'hosts') {
    const name = accountName(args[0]);
    const account = requireAccount(creds, name);
    account.hosts = parseHosts(args[1]);
    if (account.totpSecret === null) noTotpAllowed(account.hosts);
    write(creds);
    console.log(`Accès de « ${name} » : ${account.hosts.join(', ')} (effet immédiat sur ses sessions).`);
    return;
  }

  if (mode === 'revoke') {
    requireFile(creds);
    const names = args[0] ? [accountName(args[0])] : Object.keys(creds.accounts);
    for (const name of names) requireAccount(creds, name).epoch += 1;
    write(creds);
    console.log(args[0] ? `Sessions de « ${names[0]} » déconnectées.` : `Toutes les sessions sont déconnectées (${names.join(', ')}).`);
    return;
  }

  if (mode === 'remove') {
    const name = accountName(args[0]);
    requireAccount(creds, name);
    delete creds.accounts[name];
    write(creds);
    console.log(`Compte « ${name} » supprimé, ses sessions ne valent plus rien.`);
    return;
  }

  if (mode === 'list') {
    for (const [name, a] of Object.entries(requireFile(creds).accounts)) {
      const totp = a.totpSecret === null ? 'sans TOTP' : 'TOTP';
      console.log(`${name}\t${(a.hosts || []).join(', ')}\t${totp}\t(époque ${a.epoch})`);
    }
    return;
  }

  throw new Error(`commande inconnue : ${mode} (add, reset, totp, password, hosts, revoke, remove, list)`);
}

main().catch((err) => {
  console.error(`Erreur : ${err.message}`);
  process.exit(1);
});
