#!/usr/bin/env bash
#
# scan.sh - Orchestrateur de tests de securite web (contexte AUTORISE uniquement).
#
# Agrege plusieurs outils open-source eprouves, chacun via Docker (aucune
# installation locale requise a part Docker + curl) :
#   - check en-tetes de securite (curl)        : CSP, HSTS, X-Frame-Options, ...
#   - testssl.sh (drwetter/testssl.sh)         : qualite TLS/SSL
#   - nuclei     (projectdiscovery/nuclei)     : CVE connues + mauvaises configs
#   - OWASP ZAP  (zaproxy/zap-stable)          : scan applicatif web
#
# PAR DEFAUT le scan est PASSIF / non intrusif : sans danger sur un site client
# en production. Le mode --active (ZAP full scan) est INTRUSIF et opt-in.
#
# !!! LEGAL !!! Ne scanner QUE des cibles pour lesquelles vous detenez une
# autorisation ecrite du proprietaire. Scanner sans autorisation est illegal.
# Voir security/README.md.
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Par defaut les rapports vont dans security/reports/. Sur le VPS, pointer SCAN_OUTPUT_DIR vers le
# volume lu par le dashboard (ex: SCAN_OUTPUT_DIR=/opt/dashboard/reports) pour les y publier.
REPORTS_DIR="${SCAN_OUTPUT_DIR:-${SCRIPT_DIR}/reports}"

IMG_TESTSSL="drwetter/testssl.sh:latest"
IMG_NUCLEI="projectdiscovery/nuclei:latest"
IMG_ZAP="zaproxy/zap-stable"

# Delais max (secondes) par outil, pour ne jamais rester bloque.
TIMEOUT_HEADERS=30
TIMEOUT_TESTSSL=600
TIMEOUT_NUCLEI=900
TIMEOUT_ZAP=900

# Etat global
TARGET=""
TARGETS_FILE=""
AUTHORIZED=0
ACTIVE=0
DRY_RUN=0
RUN_CONTAINERS=()

# ---------------------------------------------------------------------------
# Sortie
# ---------------------------------------------------------------------------
c_red()  { printf '\033[31m%s\033[0m\n' "$*"; }
c_grn()  { printf '\033[32m%s\033[0m\n' "$*"; }
c_ylw()  { printf '\033[33m%s\033[0m\n' "$*"; }
info()   { printf '[*] %s\n' "$*"; }
ok()     { c_grn "[+] $*"; }
warn()   { c_ylw "[!] $*"; }
err()    { c_red "[x] $*" >&2; }
die()    { err "$*"; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  ./security/scan.sh <url> --i-am-authorized [--active] [--dry-run]
  ./security/scan.sh --targets security/targets.txt [--active] [--dry-run]

Arguments:
  <url>                 Cible unique (http:// ou https://).
  --i-am-authorized     Confirme que vous avez l'autorisation ecrite du
                        proprietaire de la cible. OBLIGATOIRE en mode cible unique.
  --targets <fichier>   Scanne chaque URL listee. Le fichier doit contenir une
                        ligne non commentee "I_AM_AUTHORIZED=yes" pour activer.
  --active              ZAP full scan (INTRUSIF). Jamais sur de la prod client
                        sans autorisation renforcee. Defaut = passif.
  --dry-run             Valide les arguments et affiche le plan sans rien scanner.
  -h, --help            Cette aide.

Exemple :
  ./security/scan.sh https://exemple.com --i-am-authorized

Rapports : security/reports/<host>-<timestamp>/ (gitignore).
sqlmap (injection SQL approfondie) est volontairement NON automatise : voir README.
EOF
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# run_timeout <secs> <cmd...> : execute une commande avec une limite de temps,
# portable macOS/Linux (pas de dependance a coreutils `timeout`).
run_timeout() {
  local secs="$1"; shift
  "$@" &
  local pid=$!
  ( sleep "$secs"; kill -TERM "$pid" 2>/dev/null ) &
  local watcher=$!
  local rc=0
  wait "$pid" 2>/dev/null || rc=$?
  kill -TERM "$watcher" 2>/dev/null || true
  wait "$watcher" 2>/dev/null || true
  return "$rc"
}

# Nettoie tout conteneur lance par ce script (en cas d'interruption/timeout).
cleanup() {
  local name
  for name in "${RUN_CONTAINERS[@]:-}"; do
    [ -n "$name" ] && docker rm -f "$name" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT INT TERM

host_of() {
  # Extrait le host d'une URL (sans scheme, port, path).
  local u="$1"
  u="${u#*://}"
  u="${u%%/*}"
  u="${u%%:*}"
  printf '%s' "$u"
}

require_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker introuvable. Installez Docker Desktop : https://docs.docker.com/get-docker/"
  docker info >/dev/null 2>&1 || die "Le daemon Docker ne repond pas. Demarrez Docker puis reessayez."
}

# Montage de sortie des conteneurs d'outils. Avec SCAN_DOCKER_VOLUME (ex : dashboard : ce script
# tourne dans un conteneur et lance les outils comme conteneurs FRERES via le socket Docker), un
# bind-mount serait interprete par le daemon hote, pas par ce conteneur : on monte donc le volume
# nomme et on ecrit dans son sous-dossier REL. Sinon, bind-mount classique du dossier de sortie.
# Definit MOUNT_ARGS (tableau) et TOUT (chemin de sortie vu par le conteneur d'outil).
tool_out() {
  local out="$1" mount="${2:-/out}"
  if [ -n "${SCAN_DOCKER_VOLUME:-}" ]; then
    MOUNT_ARGS=(-v "${SCAN_DOCKER_VOLUME}:${mount}")
    TOUT="${mount}/${REL}"
  else
    MOUNT_ARGS=(-v "${out}:${mount}")
    TOUT="${mount}"
  fi
}

# ---------------------------------------------------------------------------
# Modules de scan. Chacun ecrit dans $OUTDIR et ne doit JAMAIS faire echouer le
# run global : les erreurs sont capturees et notees dans le rapport.
# ---------------------------------------------------------------------------

# 1) En-tetes de securite HTTP via curl (passif : un simple GET).
scan_headers() {
  local url="$1" out="$2"
  local hfile="${out}/headers.txt"
  info "En-tetes HTTP (curl)..."
  if ! run_timeout "$TIMEOUT_HEADERS" curl -sSIL --max-time "$TIMEOUT_HEADERS" "$url" >"$hfile" 2>&1; then
    warn "curl : cible injoignable ou timeout (voir headers.txt)"
    echo "STATUS: ERREUR (injoignable/timeout)" >>"$hfile"
    return 0
  fi
  {
    echo "# Analyse des en-tetes de securite"
    echo
    local h
    for h in \
      "Strict-Transport-Security|HSTS (force HTTPS)" \
      "Content-Security-Policy|CSP (anti-XSS/injection)" \
      "X-Frame-Options|Anti-clickjacking" \
      "X-Content-Type-Options|Anti MIME-sniffing" \
      "Referrer-Policy|Fuite de referrer" \
      "Permissions-Policy|Restriction d'API navigateur" ; do
      local key="${h%%|*}" label="${h##*|}"
      if grep -iq "^${key}:" "$hfile"; then
        echo "- [OK]      ${key} present  (${label})"
      else
        echo "- [MANQUE]  ${key} absent   (${label})"
      fi
    done
    echo
    if grep -iqE '^(Server|X-Powered-By):' "$hfile"; then
      echo "Divulgation de version (a masquer si possible) :"
      grep -iE '^(Server|X-Powered-By):' "$hfile" | sed 's/^/  /'
    fi
  } >"${out}/headers-analysis.txt"
  ok "En-tetes analyses"
}

# 2) TLS/SSL via testssl.sh (passif).
scan_testssl() {
  local url="$1" out="$2"
  local name="scan_testssl_$$"
  RUN_CONTAINERS+=("$name")
  info "TLS/SSL (testssl.sh)... (peut prendre quelques minutes)"
  tool_out "$out"
  if run_timeout "$TIMEOUT_TESTSSL" docker run --rm --name "$name" \
        "${MOUNT_ARGS[@]}" "$IMG_TESTSSL" \
        --quiet --color 0 --logfile "${TOUT}/testssl.txt" "$url" \
        >"${out}/testssl-stdout.txt" 2>&1; then
    ok "TLS analyse (testssl.txt)"
  else
    warn "testssl.sh : echec ou timeout (voir testssl-stdout.txt)"
  fi
}

# 3) CVE + mauvaises configs via nuclei (passif : detection, pas d'exploitation).
scan_nuclei() {
  local url="$1" out="$2"
  local name="scan_nuclei_$$"
  RUN_CONTAINERS+=("$name")
  info "CVE / misconfig (nuclei)... (peut prendre quelques minutes)"
  tool_out "$out"
  if run_timeout "$TIMEOUT_NUCLEI" docker run --rm --name "$name" \
        "${MOUNT_ARGS[@]}" "$IMG_NUCLEI" \
        -u "$url" -nc -silent -severity low,medium,high,critical \
        -o "${TOUT}/nuclei.txt" \
        >"${out}/nuclei-stdout.txt" 2>&1; then
    ok "nuclei termine (nuclei.txt)"
  else
    warn "nuclei : echec ou timeout (voir nuclei-stdout.txt)"
  fi
  [ -s "${out}/nuclei.txt" ] || echo "(aucun resultat nuclei)" >"${out}/nuclei.txt"
}

# 4) Scan applicatif via OWASP ZAP. Baseline = passif ; full = actif (intrusif).
scan_zap() {
  local url="$1" out="$2"
  local name="scan_zap_$$"
  RUN_CONTAINERS+=("$name")
  local script="zap-baseline.py" mode="baseline (passif)"
  if [ "$ACTIVE" -eq 1 ]; then
    script="zap-full-scan.py"; mode="full (ACTIF/intrusif)"
  fi
  info "ZAP ${mode}..."
  # ZAP ecrit ses rapports dans /zap/wrk ; code de sortie != 0 si findings (normal).
  # tool_out monte /zap/wrk ; avec un volume nomme, les rapports vont dans le sous-dossier REL.
  tool_out "$out" /zap/wrk
  local pfx=""
  [ -n "${SCAN_DOCKER_VOLUME:-}" ] && pfx="${REL}/"
  run_timeout "$TIMEOUT_ZAP" docker run --rm --name "$name" \
      "${MOUNT_ARGS[@]}" "$IMG_ZAP" \
      "$script" -t "$url" -r "${pfx}zap-report.html" -w "${pfx}zap-report.md" -J "${pfx}zap-report.json" \
      >"${out}/zap-stdout.txt" 2>&1 \
    && ok "ZAP termine (zap-report.html)" \
    || warn "ZAP termine avec findings ou erreur (voir zap-stdout.txt / zap-report.html)"
}

# ---------------------------------------------------------------------------
# Rapport consolide
# ---------------------------------------------------------------------------
write_report() {
  local url="$1" out="$2" host="$3"
  local rpt="${out}/report.md"
  {
    echo "# Rapport de securite - ${host}"
    echo
    echo "- Cible      : ${url}"
    echo "- Date       : $(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo "- Mode       : $([ "$ACTIVE" -eq 1 ] && echo 'ACTIF (intrusif)' || echo 'passif (non intrusif)')"
    echo
    echo "## 1. En-tetes de securite HTTP"
    echo '```'
    cat "${out}/headers-analysis.txt" 2>/dev/null || echo "(non execute)"
    echo '```'
    echo
    echo "## 2. TLS / SSL (testssl.sh)"
    if grep -iqE 'VULNERABLE|NOT ok|high|critical' "${out}/testssl.txt" 2>/dev/null; then
      echo "Points d'attention detectes :"
      echo '```'
      grep -iE 'VULNERABLE|NOT ok|high|critical' "${out}/testssl.txt" | head -40
      echo '```'
    else
      echo "Aucun point critique evident (voir testssl.txt pour le detail)."
    fi
    echo
    echo "## 3. CVE / mauvaises configs (nuclei)"
    echo '```'
    head -100 "${out}/nuclei.txt" 2>/dev/null || echo "(non execute)"
    echo '```'
    echo
    echo "## 4. Scan applicatif (OWASP ZAP)"
    if [ -f "${out}/zap-report.md" ]; then
      echo "Resume (voir zap-report.html pour le detail complet) :"
      echo '```'
      head -80 "${out}/zap-report.md"
      echo '```'
    else
      echo "(rapport ZAP indisponible, voir zap-stdout.txt)"
    fi
    echo
    echo "## Etape manuelle : injection SQL (sqlmap)"
    echo "Non automatise car potentiellement intrusif. A lancer manuellement sur"
    echo "un parametre suspect, avec autorisation :"
    echo '```'
    echo "docker run --rm -it ghcr.io/sqlmapproject/sqlmap -u 'https://cible/page?id=1' --batch --level=1 --risk=1"
    echo '```'
    echo
    echo "## Fichiers bruts"
    echo "headers.txt, testssl.txt, nuclei.txt, zap-report.html/.md/.json"
  } >"$rpt"
  ok "Rapport consolide : ${rpt}"
}

# ---------------------------------------------------------------------------
# Scan d'une cible
# ---------------------------------------------------------------------------
scan_one() {
  local url="$1"
  case "$url" in
    http://*|https://*) ;;
    *) err "URL invalide (manque http:// ou https://) : ${url}"; return 1 ;;
  esac
  local host out
  host="$(host_of "$url")"
  # REL (nom du dossier de scan) est global : tool_out l'utilise pour le sous-dossier du volume
  # nomme. Un appelant (ex : dashboard) peut l'imposer via SCAN_REL pour connaitre le dossier d'avance.
  REL="${SCAN_REL:-${host}-$(date '+%Y%m%d-%H%M%S')}"
  out="${REPORTS_DIR}/${REL}"

  if [ "$DRY_RUN" -eq 1 ]; then
    info "DRY-RUN cible : ${url}"
    info "  -> rapport : ${out}/report.md"
    info "  -> modules : headers, testssl, nuclei, zap ($([ "$ACTIVE" -eq 1 ] && echo full/actif || echo baseline/passif))"
    return 0
  fi

  mkdir -p "$out"
  info "===== Scan de ${url} ====="
  info "Sortie : ${out}"
  scan_headers "$url" "$out"
  scan_testssl "$url" "$out"
  scan_nuclei  "$url" "$out"
  scan_zap     "$url" "$out"
  write_report "$url" "$out" "$host"
  echo
  ok "Termine : ${out}/report.md"
}

# ---------------------------------------------------------------------------
# Parsing des arguments
# ---------------------------------------------------------------------------
parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --i-am-authorized) AUTHORIZED=1 ;;
      --active)          ACTIVE=1 ;;
      --dry-run)         DRY_RUN=1 ;;
      --targets)         shift; TARGETS_FILE="${1:-}"; [ -n "$TARGETS_FILE" ] || die "--targets requiert un fichier" ;;
      -h|--help)         usage; exit 0 ;;
      http://*|https://*) TARGET="$1" ;;
      -*)                die "Option inconnue : $1 (voir --help)" ;;
      *)                 die "Argument inconnu : $1 (une URL doit commencer par http:// ou https://)" ;;
    esac
    shift
  done
}

# Verifie la porte d'autorisation (fichier targets).
targets_authorized() {
  grep -qE '^[[:space:]]*I_AM_AUTHORIZED=yes[[:space:]]*$' "$1"
}

main() {
  parse_args "$@"

  if [ "$ACTIVE" -eq 1 ]; then
    warn "MODE ACTIF : scan INTRUSIF. Reserve aux cibles avec autorisation renforcee."
  fi

  # Mode batch (fichier de cibles)
  if [ -n "$TARGETS_FILE" ]; then
    [ -f "$TARGETS_FILE" ] || die "Fichier de cibles introuvable : ${TARGETS_FILE}"
    targets_authorized "$TARGETS_FILE" \
      || die "Autorisation absente. Ajoutez une ligne 'I_AM_AUTHORIZED=yes' au fichier ${TARGETS_FILE} pour confirmer que vous avez l'autorisation ecrite des proprietaires."
    [ "$DRY_RUN" -eq 1 ] || require_docker
    local line rc=0
    while IFS= read -r line || [ -n "$line" ]; do
      case "$line" in
        ''|\#*|I_AM_AUTHORIZED=*) continue ;;
      esac
      scan_one "$line" || rc=1
    done <"$TARGETS_FILE"
    return "$rc"
  fi

  # Mode cible unique
  [ -n "$TARGET" ] || { usage; die "Aucune cible fournie."; }
  [ "$AUTHORIZED" -eq 1 ] \
    || die "Autorisation absente. Ajoutez --i-am-authorized pour confirmer que vous detenez l'autorisation ecrite du proprietaire de la cible."
  [ "$DRY_RUN" -eq 1 ] || require_docker
  scan_one "$TARGET"
}

main "$@"
