<?php
/**
 * Stats Winamax des joueurs du club de poker (dashboard /poker) — mathis-rvrs.fr.
 *
 * Les chiffres viennent de pokstats.com, lus depuis une session pokstats connectée (le serveur
 * n'a pas d'accès à pokstats) par scripts/poker-collect.js, qui envoie un snapshot ici.
 * Snapshots gardés dans le MySQL du VPS (DATABASE_URL, même base que /dispo), 20 derniers.
 *
 * Accès réservé : en-tête X-Club-Key égal à POKER_CLUB_KEY (variable d'environnement, 16
 * caractères min). Sans clé configurée, tout est refusé.
 *
 *   GET  ?action=snapshot            → { snapshot, importedAt } ou { snapshot: null }
 *   POST ?action=import  {snapshot}  → 201 { ok: true, players }
 *        Accepté aussi depuis https://www.pokstats.com (CORS) : le script de collecte tourne
 *        dans un onglet pokstats.
 *
 * Erreurs : { error: forbidden|invalid|not-configured|unavailable, message }.
 */
declare(strict_types=1);

const MAX_BODY = 4_000_000;
const MAX_PLAYERS = 200;
const MAX_DAYS = 400;
const MAX_TOURNAMENTS = 100;
const KEEP_SNAPSHOTS = 20;
const COLLECTOR_ORIGIN = 'https://www.pokstats.com';
const DAY_RE = '/^\d{4}-\d{2}-\d{2}$/';
const ISO_RE = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$action = (string) ($_GET['action'] ?? '');

if (($_SERVER['HTTP_ORIGIN'] ?? '') === COLLECTOR_ORIGIN && $action === 'import') {
    header('Access-Control-Allow-Origin: ' . COLLECTOR_ORIGIN);
    header('Vary: Origin');
    if ($method === 'OPTIONS') {
        header('Access-Control-Allow-Methods: POST');
        header('Access-Control-Allow-Headers: Content-Type, X-Club-Key');
        header('Access-Control-Max-Age: 600');
        http_response_code(204);
        exit;
    }
}

require_key();

$pdo = null;
try {
    $pdo = connect();
    with_schema($pdo, static function () use ($pdo, $method, $action): void {
        if ($method === 'GET' && $action === 'snapshot') {
            $row = $pdo->query('SELECT data, created_at FROM poker_snapshots ORDER BY id DESC LIMIT 1')->fetch();
            respond(200, $row
                ? ['snapshot' => json_decode($row['data'], true), 'importedAt' => gmdate('c', strtotime($row['created_at'] . ' UTC'))]
                : ['snapshot' => null]);
        }
        if ($method === 'POST' && $action === 'import') {
            $snapshot = clean_snapshot(read_json_body());
            $pdo->prepare('INSERT INTO poker_snapshots (data) VALUES (?)')
                ->execute([json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
            $pdo->exec(sprintf(
                'DELETE FROM poker_snapshots WHERE id NOT IN (SELECT id FROM (SELECT id FROM poker_snapshots ORDER BY id DESC LIMIT %d) AS kept)',
                KEEP_SNAPSHOTS
            ));
            respond(201, ['ok' => true, 'players' => count($snapshot['players'])]);
        }
        fail(404, 'invalid', 'Action inconnue.');
    });
} catch (PDOException $e) {
    error_log('poker-club: ' . $e->getMessage());
    fail(503, 'unavailable', 'Base de données indisponible, réessaie dans un instant.');
}

// ── Accès ────────────────────────────────────────────────────────────────────

function require_key(): void
{
    $expected = (string) (getenv('POKER_CLUB_KEY') ?: ($_SERVER['POKER_CLUB_KEY'] ?? ''));
    if (strlen($expected) < 16) {
        fail(503, 'not-configured', 'Le dashboard poker n’est pas encore configuré sur le serveur.');
    }
    $given = (string) ($_SERVER['HTTP_X_CLUB_KEY'] ?? '');
    // Clé longue (openssl rand -hex 24) : pas de pause sur échec, qui bloquerait un worker
    // FrankenPHP partagé avec contact.php et dispo-api.php sans gêner une attaque.
    if ($given === '' || !hash_equals($expected, $given)) {
        fail(403, 'forbidden', 'Clé incorrecte.');
    }
}

// ── Validation du snapshot ───────────────────────────────────────────────────

/** Recopie champ par champ : seul ce qui est attendu, typé et borné, est stocké. */
function clean_snapshot(array $data): array
{
    $since = $data['since'] ?? null;
    $generatedAt = $data['generatedAt'] ?? null;
    $players = $data['players'] ?? null;
    if (!is_string($since) || !valid_day($since) || !is_string($generatedAt) || !valid_iso($generatedAt)) {
        fail(422, 'invalid', 'Snapshot invalide (since, generatedAt).');
    }
    if (!is_array($players) || !array_is_list($players) || count($players) === 0 || count($players) > MAX_PLAYERS) {
        fail(422, 'invalid', 'Snapshot invalide (players).');
    }
    $players = array_map('clean_player', $players);

    $seen = [];
    foreach ($players as $player) {
        $key = mb_strtolower($player['nickname']);
        if (isset($seen[$key])) {
            fail(422, 'invalid', 'Pseudo en double : ' . $player['nickname']);
        }
        $seen[$key] = true;
    }
    // Session pokstats expirée ou pokstats en panne : aucun joueur lu. Refusé, sinon ce snapshot
    // vide deviendrait le dernier et masquerait les bons.
    if (!array_filter($players, static fn ($p) => $p['found'])) {
        fail(422, 'invalid', 'Aucun joueur trouvé : snapshot refusé.');
    }

    return [
        'source' => 'pokstats.com',
        'room' => 'WINAMAX',
        'gameType' => 'SCHEDULED',
        'since' => $since,
        'generatedAt' => $generatedAt,
        'players' => $players,
    ];
}

function clean_player(mixed $p): array
{
    if (!is_array($p)) {
        fail(422, 'invalid', 'Joueur invalide.');
    }
    $player = [
        'nickname' => text($p['nickname'] ?? null, 40, 'nickname'),
        'found' => ($p['found'] ?? false) === true,
    ];
    if (!$player['found']) {
        $player['error'] = text(($p['error'] ?? '') === '' ? 'not-found' : $p['error'], 40, 'error');
        $player['candidates'] = array_map(
            static fn ($c) => text($c, 40, 'candidates'),
            array_slice(is_array($p['candidates'] ?? null) ? array_values($p['candidates']) : [], 0, 5)
        );
        return $player;
    }

    $c = is_array($p['career'] ?? null) ? $p['career'] : fail(422, 'invalid', 'Carrière manquante.');
    $player['pokstatsName'] = text($p['pokstatsName'] ?? $player['nickname'], 40, 'pokstatsName');
    $player['updatedAt'] = iso_or_null($p['updatedAt'] ?? null);
    $player['career'] = [
        'stake' => num($c['stake'] ?? 0),
        'rake' => num($c['rake'] ?? 0),
        'profit' => num($c['profit'] ?? 0),
        'count' => (int) num($c['count'] ?? 0),
        'entries' => (int) num($c['entries'] ?? 0),
        'itm' => num($c['itm'] ?? 0),
        'abi' => num($c['abi'] ?? 0),
        'score' => num($c['score'] ?? 0),
        'firstGame' => iso_or_null($c['firstGame'] ?? null),
        'lastGame' => iso_or_null($c['lastGame'] ?? null),
    ];
    $player['days'] = rows($p['days'] ?? [], MAX_DAYS, static function (array $d): array {
        if (count($d) !== 5 || !is_string($d[0]) || !valid_day($d[0])) {
            fail(422, 'invalid', 'Jour invalide.');
        }
        return [$d[0], (int) num($d[1]), (int) num($d[2]), num($d[3]), num($d[4])];
    });
    $player['tournaments'] = rows($p['tournaments'] ?? [], MAX_TOURNAMENTS, static function (array $t): array {
        if (count($t) !== 7 || !is_string($t[0]) || !valid_iso($t[0])) {
            fail(422, 'invalid', 'Tournoi invalide.');
        }
        // Nom affiché seulement : tronqué et nettoyé plutôt que refusé.
        $name = is_string($t[3]) ? trim((string) preg_replace('/[\x00-\x1F\x7F]+/', ' ', $t[3])) : '';
        $name = $name === '' ? 'Tournoi' : mb_substr($name, 0, 120);
        return [$t[0], num($t[1]), (int) num($t[2]), $name, num($t[4]), num($t[5]), (int) num($t[6])];
    });
    $player['tournamentsComplete'] = ($p['tournamentsComplete'] ?? false) === true;
    return $player;
}

function rows(mixed $list, int $max, callable $clean): array
{
    if (!is_array($list) || !array_is_list($list) || count($list) > $max) {
        fail(422, 'invalid', 'Liste invalide ou trop longue.');
    }
    return array_map(static fn ($row) => is_array($row) && array_is_list($row) ? $clean($row) : fail(422, 'invalid', 'Ligne invalide.'), $list);
}

function text(mixed $value, int $max, string $field): string
{
    if (!is_string($value) || $value === '' || mb_strlen($value) > $max || preg_match('/[\x00-\x1F\x7F]/', $value)) {
        fail(422, 'invalid', "Champ invalide : $field.");
    }
    return $value;
}

/** Nombre fini et borné ; null (stat absente chez pokstats) compte pour 0. */
function num(mixed $value): float|int
{
    if ($value === null) {
        return 0;
    }
    if (!is_int($value) && !is_float($value)) {
        fail(422, 'invalid', 'Nombre attendu.');
    }
    if (!is_finite((float) $value) || abs((float) $value) > 1e9) {
        fail(422, 'invalid', 'Nombre hors bornes.');
    }
    return $value;
}

function iso_or_null(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }
    if (!is_string($value) || !valid_iso($value)) {
        fail(422, 'invalid', 'Date invalide.');
    }
    return $value;
}

/** YYYY-MM-DD qui existe au calendrier (le format seul laisserait passer 2026-13-45). */
function valid_day(string $value): bool
{
    return preg_match(DAY_RE, $value) === 1
        && checkdate((int) substr($value, 5, 2), (int) substr($value, 8, 2), (int) substr($value, 0, 4));
}

/** Instant UTC ISO 8601 réel : le navigateur planterait sur une date impossible. */
function valid_iso(string $value): bool
{
    if (preg_match(ISO_RE, $value) !== 1 || !valid_day(substr($value, 0, 10))) {
        return false;
    }
    [$h, $m, $s] = array_map('intval', explode(':', substr($value, 11, 8)));
    return $h < 24 && $m < 60 && $s < 60;
}

// ── Base de données ──────────────────────────────────────────────────────────

function connect(): PDO
{
    $url = getenv('DATABASE_URL') ?: (string) ($_SERVER['DATABASE_URL'] ?? '');
    $parts = $url !== '' ? parse_url($url) : false;
    if (
        !is_array($parts) || ($parts['scheme'] ?? '') !== 'mysql' || empty($parts['host'])
        || !in_array('mysql', PDO::getAvailableDrivers(), true)
    ) {
        fail(503, 'not-configured', 'La base de données n’est pas configurée sur le serveur.');
    }
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $parts['host'],
        $parts['port'] ?? 3306,
        ltrim($parts['path'] ?? '', '/')
    );
    $pdo = new PDO($dsn, rawurldecode($parts['user'] ?? ''), rawurldecode($parts['pass'] ?? ''), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_TIMEOUT => 3,
    ]);
    $pdo->exec("SET time_zone = '+00:00'"); // created_at lu comme UTC (importedAt)
    return $pdo;
}

/** Exécute `$fn` ; si la table manque (première utilisation), la crée puis recommence. */
function with_schema(PDO $pdo, callable $fn): void
{
    try {
        $fn();
    } catch (PDOException $e) {
        if ($e->getCode() !== '42S02') {
            throw $e;
        }
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS poker_snapshots (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                data LONGTEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci'
        );
        $fn();
    }
}

// ── Requête / réponse ────────────────────────────────────────────────────────

function read_json_body(): array
{
    $type = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (!str_starts_with($type, 'application/json')) {
        fail(415, 'invalid', 'Corps JSON attendu.');
    }
    $raw = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
    if ($raw === false || $raw === '' || strlen($raw) > MAX_BODY) {
        fail(413, 'invalid', 'Requête trop volumineuse ou vide.');
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail(400, 'invalid', 'JSON invalide.');
    }
    return $data;
}

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $error, string $message): never
{
    respond($status, ['error' => $error, 'message' => $message]);
}
