// Lance server.mjs sur un port libre avec un credentials.json temporaire (contenu donné).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ORIGIN = 'https://auth.mathis-rvrs.fr';

export function tempCredentials(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-test-'));
  const file = path.join(dir, 'credentials.json');
  if (content !== undefined) fs.writeFileSync(file, JSON.stringify(content));
  return file;
}

export async function startServer(file, env = {}) {
  const port = 18000 + Math.floor(Math.random() * 2000);
  const proc = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT, env: { ...process.env, PORT: String(port), CREDENTIALS_FILE: file, ...env }, stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${base}/health`)).ok) return { base, stop: () => proc.kill() };
    } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error('serveur non démarré');
}

// Attend que le serveur ait relu le fichier (fs.watchFile toutes les 2 s).
export async function until(check, tries = 40) {
  for (let i = 0; i < tries; i++) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}
