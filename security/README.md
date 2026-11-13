# security/ — Scanner de sécurité web (contexte autorisé uniquement)

Orchestrateur de tests de sécurité pour **vos propres sites et ceux de vos
clients, avec autorisation écrite**. Il agrège plusieurs outils open-source
éprouvés, chacun exécuté via Docker — **aucune installation locale** autre que
Docker et `curl`.

---

## ⚠️ AUTORISATION — À LIRE AVANT TOUT SCAN

**Scanner un site sans l'autorisation écrite de son propriétaire est illégal**
(en France : art. 323-1 et suivants du Code pénal ; équivalents dans la plupart
des pays). Un scan, même passif, interroge activement le serveur de la cible.

Règles :

- Ne scannez **que** des cibles que vous possédez, ou pour lesquelles vous
  détenez une **autorisation écrite** (contrat, mandat, email signé) couvrant
  précisément le périmètre et la période du test.
- La confirmation d'autorisation est **obligatoire** pour lancer le script
  (`--i-am-authorized`, ou la ligne `I_AM_AUTHORIZED=yes` dans le fichier de
  cibles). Elle n'est pas une formalité : c'est votre déclaration de légalité.
- Le **mode actif** (`--active`) est intrusif. Ne l'utilisez jamais sur de la
  production client sans un accord renforcé et explicite, de préférence en
  dehors des heures de pointe.
- Conservez une trace écrite de chaque autorisation.

---

## Prérequis

- **Docker** installé et démarré (`docker info` doit répondre).
  Installation : https://docs.docker.com/get-docker/
- **curl** (préinstallé sur macOS et la plupart des Linux).
- Accès réseau sortant (le premier lancement télécharge les images Docker).

---

## Usage

Cible unique :

```bash
./security/scan.sh https://exemple.com --i-am-authorized
```

Plusieurs cibles (fichier) :

```bash
cp security/targets.example.txt security/targets.txt
# éditer security/targets.txt : ajouter les URLs + décommenter I_AM_AUTHORIZED=yes
./security/scan.sh --targets security/targets.txt
```

Valider sans rien scanner (vérifie les arguments et affiche le plan) :

```bash
./security/scan.sh https://exemple.com --i-am-authorized --dry-run
```

Mode actif / intrusif (ZAP full scan — autorisation renforcée requise) :

```bash
./security/scan.sh https://exemple.com --i-am-authorized --active
```

Aide :

```bash
./security/scan.sh --help
```

---

## Ce qui est scanné

| Module | Outil | Détecte | Intrusif ? |
|--------|-------|---------|------------|
| En-têtes HTTP | `curl` | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy manquants ; divulgation de version | Non (simple GET) |
| TLS/SSL | `drwetter/testssl.sh` | protocoles/chiffrements faibles, certificat, Heartbleed, etc. | Non |
| CVE / misconfig | `projectdiscovery/nuclei` | CVE connues, mauvaises configurations, fichiers exposés | Non (détection) |
| Appli web | `zaproxy/zap-stable` (ZAP baseline) | XSS, en-têtes, cookies, contenu mixte… par scan **passif** | Non (baseline) |
| Appli web (actif) | ZAP full scan via `--active` | injections actives, fuzzing | **Oui** |

**Par défaut, tout est passif** : sûr sur un site client en production.

### Injection SQL (sqlmap) — étape manuelle

`sqlmap` n'est **pas** lancé automatiquement (potentiellement destructif). Si un
paramètre paraît suspect, lancez-le manuellement, avec autorisation :

```bash
docker run --rm -it ghcr.io/sqlmapproject/sqlmap \
  -u 'https://cible/page?id=1' --batch --level=1 --risk=1
```

---

## Rapports

Chaque scan écrit dans :

```
security/reports/<host>-<timestamp>/
├── report.md              ← rapport consolidé lisible (commencer ici)
├── headers.txt            ← en-têtes HTTP bruts
├── headers-analysis.txt   ← analyse en-têtes de sécurité
├── testssl.txt            ← sortie testssl.sh
├── nuclei.txt             ← findings nuclei
└── zap-report.html/.md/.json ← rapport OWASP ZAP
```

Le dossier `reports/` est **gitignore** (résultats = données sensibles clients).
Idem `targets.txt` (noms de domaines clients privés).

### Lecture du rapport

- `[MANQUE] ...` sur un en-tête → en-tête de sécurité à ajouter côté serveur.
- Section TLS : lignes `VULNERABLE`/`NOT ok` → configuration TLS à corriger.
- nuclei : chaque ligne = un finding avec sa sévérité (`low`→`critical`).
- ZAP : ouvrir `zap-report.html` pour le détail par alerte.

Un finding est un **signal à vérifier**, pas une preuve de compromission.
Confirmez manuellement avant de conclure, et priorisez par sévérité.

---

## Dépannage

- `Docker introuvable` / `daemon ne répond pas` → démarrer Docker Desktop.
- `Autorisation absente` → ajouter `--i-am-authorized` (ou la ligne dans
  `targets.txt`).
- Cible injoignable / timeout → vérifier l'URL et le réseau ; les délais max par
  outil sont en haut de `scan.sh` (`TIMEOUT_*`).
- Premier lancement lent → téléchargement des images Docker (une seule fois).
