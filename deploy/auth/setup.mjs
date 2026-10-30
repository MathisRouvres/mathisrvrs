// Configuration du compte (dans le conteneur, terminal interactif) :
//   docker compose run --rm -it web node setup.mjs           mot de passe + nouveau secret TOTP
//   docker compose run --rm -it web node setup.mjs password  change seulement le mot de passe
//   docker compose run --rm web node setup.mjs revoke        déconnecte toutes les sessions
// Écrit /config/credentials.json (600) ; le service le recharge sans redémarrage.
import fs from 'node:fs';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { checkTotp, hashPassword, newTotpSecret, otpauthUri } from './lib.mjs';

const FILE = process.env.CREDENTIALS_FILE || '/config/credentials.json';
const mode = process.argv[2] || 'all';

function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return null;
  }
}

function write(creds) {
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(creds, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
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
    const a = await ask('Nouveau mot de passe (12 caractères min.) : ', { hidden: true });
    if (a.length < 12) {
      console.log('Trop court.');
      continue;
    }
    const b = await ask('Confirmer : ', { hidden: true });
    if (a === b) return a;
    console.log('Les deux saisies diffèrent.');
  }
}

async function main() {
  const current = read();
  if (mode === 'revoke') {
    if (!current) throw new Error(`${FILE} absent : lancer setup d'abord.`);
    write({ ...current, epoch: current.epoch + 1 });
    console.log(`Toutes les sessions sont déconnectées (époque ${current.epoch + 1}).`);
    return;
  }
  if (!process.stdin.isTTY) throw new Error('terminal interactif requis (docker compose run --rm -it …)');

  if (mode === 'password') {
    if (!current) throw new Error(`${FILE} absent : lancer setup d'abord.`);
    write({ ...current, passwordHash: hashPassword(await askPassword()), epoch: current.epoch + 1 });
    console.log('Mot de passe changé, sessions existantes déconnectées.');
    return;
  }

  const password = await askPassword();
  const totpSecret = newTotpSecret();
  const uri = otpauthUri(totpSecret);
  console.log("\nAjoute ce compte dans ton application d'authentification :");
  const qr = spawnSync('qrencode', ['-t', 'ANSIUTF8', uri], { encoding: 'utf8' });
  if (qr.status === 0) console.log(qr.stdout);
  console.log(`Saisie manuelle : ${totpSecret.match(/.{1,4}/g).join(' ')}  (TOTP, SHA1, 6 chiffres, 30 s)\n`);
  for (;;) {
    const code = (await ask("Code affiché par l'application : ")).trim();
    if (checkTotp(totpSecret, code) !== null) break;
    console.log("Code incorrect, réessaie (vérifie l'heure du téléphone).");
  }
  write({
    passwordHash: hashPassword(password),
    totpSecret,
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    epoch: (current?.epoch ?? 0) + 1,
    lastTotpStep: -1,
  });
  console.log(`Compte configuré (${FILE}).`);
}

main().catch((err) => {
  console.error(`Erreur : ${err.message}`);
  process.exit(1);
});
