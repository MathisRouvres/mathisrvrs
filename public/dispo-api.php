<?php
/**
 * API du calendrier /dispo — mathis-rvrs.fr.
 *
 * Base MySQL du VPS (deploy/db), lue dans DATABASE_URL (écrit par create-app-db.sh dans
 * /opt/site/.env). Les tables sont créées au premier appel.
 *
 * Pas de compte : toute personne qui a le lien peut créer un profil (60 max), changer une
 * photo et cocher des créneaux. Les écritures exigent un corps JSON (Content-Type
 * application/json) : un autre site ne peut pas les envoyer sans pré-vérification CORS, refusée.
 *
 *   GET  ?action=people                      → { people: [{ id, name, avatar }] }
 *   POST ?action=people  { name, avatar }    → 201 { person }
 *   POST ?action=avatar  { id, avatar }      → { ok: true }
 *   GET  ?action=slots&from=ISO&to=ISO       → { slots: [{ personId, start }] }
 *   POST ?action=slots   { personId, add: [ISO], remove: [ISO] } → { ok: true }
 *
 * Erreurs : { error: duplicate|full|invalid|not-found|unavailable, message }.
 */
declare(strict_types=1);

const MAX_PEOPLE = 60;
const MAX_NAME = 40;
const MAX_AVATAR = 150000;
const MAX_BODY = 400000;
const MAX_SLOTS_PER_REQUEST = 1000;
const SLOT_SECONDS = 1800;
const MAX_RANGE_SECONDS = 15 * 86400;
const AVATAR_RE = '#^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$#';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$action = (string) ($_GET['action'] ?? '');
$pdo = null;

try {
    $pdo = connect();
    with_schema($pdo, static function () use ($pdo, $method, $action): void {
        route($pdo, $method, $action);
    });
} catch (PDOException $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('dispo-api: ' . $e->getMessage());
    fail(503, 'unavailable', 'Base de données indisponible, réessaie dans un instant.');
}

function route(PDO $pdo, string $method, string $action): void
{
    if ($action === 'people' && $method === 'GET') {
        $rows = $pdo->query('SELECT id, name, avatar FROM dispo_people ORDER BY created_at, name')->fetchAll();
        respond(200, ['people' => $rows]);
    }
    if ($action === 'slots' && $method === 'GET') {
        list_slots($pdo);
    }
    if ($method !== 'POST') {
        fail(405, 'invalid', 'Méthode non autorisée.');
    }

    $body = read_json_body();
    match ($action) {
        'people' => create_person($pdo, $body),
        'avatar' => update_avatar($pdo, $body),
        'slots' => save_slots($pdo, $body),
        default => fail(404, 'invalid', 'Action inconnue.'),
    };
}

function create_person(PDO $pdo, array $body): never
{
    $name = clean_name($body['name'] ?? null);
    $avatar = clean_avatar($body['avatar'] ?? null);

    $count = (int) $pdo->query('SELECT COUNT(*) FROM dispo_people')->fetchColumn();
    if ($count >= MAX_PEOPLE) {
        fail(409, 'full', 'Nombre maximum de profils atteint.');
    }

    $person = ['id' => uuid(), 'name' => $name, 'avatar' => $avatar];
    try {
        $pdo->prepare('INSERT INTO dispo_people (id, name, avatar) VALUES (?, ?, ?)')
            ->execute([$person['id'], $name, $avatar]);
    } catch (PDOException $e) {
        // 1062 : nom déjà pris (comparaison sans casse ni accents, collation de la table).
        if (($e->errorInfo[1] ?? 0) === 1062) {
            fail(409, 'duplicate', 'Ce prénom existe déjà : choisis-le dans la liste.');
        }
        throw $e;
    }
    respond(201, ['person' => $person]);
}

function update_avatar(PDO $pdo, array $body): never
{
    $id = clean_id($body['id'] ?? null);
    $avatar = clean_avatar($body['avatar'] ?? null);
    $exists = $pdo->prepare('SELECT 1 FROM dispo_people WHERE id = ?');
    $exists->execute([$id]);
    if (!$exists->fetchColumn()) {
        fail(404, 'not-found', 'Profil introuvable.');
    }
    $pdo->prepare('UPDATE dispo_people SET avatar = ? WHERE id = ?')->execute([$avatar, $id]);
    respond(200, ['ok' => true]);
}

function list_slots(PDO $pdo): never
{
    $from = parse_time($_GET['from'] ?? null);
    $to = parse_time($_GET['to'] ?? null);
    if ($to <= $from || $to - $from > MAX_RANGE_SECONDS) {
        fail(422, 'invalid', 'Période invalide.');
    }
    $query = $pdo->prepare(
        'SELECT person_id, slot_start FROM dispo_slots WHERE slot_start >= ? AND slot_start < ? ORDER BY slot_start'
    );
    $query->execute([$from, $to]);
    $slots = array_map(
        static fn (array $row): array => [
            'personId' => $row['person_id'],
            'start' => gmdate('Y-m-d\TH:i:s\Z', (int) $row['slot_start']),
        ],
        $query->fetchAll()
    );
    respond(200, ['slots' => $slots]);
}

function save_slots(PDO $pdo, array $body): never
{
    $personId = clean_id($body['personId'] ?? null);
    $add = clean_slot_list($body['add'] ?? []);
    $remove = clean_slot_list($body['remove'] ?? []);
    if (count($add) + count($remove) > MAX_SLOTS_PER_REQUEST) {
        fail(422, 'invalid', 'Trop de créneaux à la fois.');
    }
    $now = time();
    foreach ($add as $start) {
        if ($start < $now - 86400 || $start > $now + 366 * 86400) {
            fail(422, 'invalid', 'Créneau hors de la période autorisée.');
        }
    }

    $pdo->beginTransaction();
    $exists = $pdo->prepare('SELECT 1 FROM dispo_people WHERE id = ? FOR SHARE');
    $exists->execute([$personId]);
    if (!$exists->fetchColumn()) {
        $pdo->rollBack();
        fail(404, 'not-found', 'Profil introuvable.');
    }
    $insert = $pdo->prepare('INSERT IGNORE INTO dispo_slots (person_id, slot_start) VALUES (?, ?)');
    foreach ($add as $start) {
        $insert->execute([$personId, $start]);
    }
    $delete = $pdo->prepare('DELETE FROM dispo_slots WHERE person_id = ? AND slot_start = ?');
    foreach ($remove as $start) {
        $delete->execute([$personId, $start]);
    }
    $pdo->commit();
    respond(200, ['ok' => true]);
}

// ── Validation ───────────────────────────────────────────────────────────────

function clean_name(mixed $value): string
{
    if (!is_string($value)) {
        fail(422, 'invalid', 'Indique ton prénom.');
    }
    $name = preg_replace('/[\p{Cc}\p{Cf}]/u', '', $value);
    $name = trim((string) preg_replace('/\s+/u', ' ', (string) $name));
    if ($name === '' || mb_strlen($name) > MAX_NAME) {
        fail(422, 'invalid', 'Prénom de 1 à ' . MAX_NAME . ' caractères.');
    }
    return $name;
}

function clean_avatar(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }
    if (!is_string($value) || strlen($value) > MAX_AVATAR || !preg_match(AVATAR_RE, $value)) {
        fail(422, 'invalid', 'Photo refusée (JPEG, PNG ou WebP, 150 Ko max).');
    }
    return $value;
}

function clean_id(mixed $value): string
{
    if (!is_string($value) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $value)) {
        fail(422, 'invalid', 'Profil invalide.');
    }
    return $value;
}

/** @return list<int> horodatages Unix alignés sur 30 min, sans doublon */
function clean_slot_list(mixed $value): array
{
    if (!is_array($value) || !array_is_list($value)) {
        fail(422, 'invalid', 'Liste de créneaux invalide.');
    }
    $starts = [];
    foreach ($value as $item) {
        $start = parse_time($item);
        if ($start % SLOT_SECONDS !== 0) {
            fail(422, 'invalid', 'Créneau non aligné sur 30 minutes.');
        }
        $starts[$start] = $start;
    }
    return array_values($starts);
}

function parse_time(mixed $value): int
{
    if (!is_string($value) || strlen($value) > 40) {
        fail(422, 'invalid', 'Date invalide.');
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s.vP', $value)
        ?: DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:sP', $value);
    if ($date === false) {
        fail(422, 'invalid', 'Date invalide.');
    }
    return $date->getTimestamp();
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
        fail(503, 'unavailable', 'Le calendrier n’est pas encore configuré sur le serveur.');
    }
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $parts['host'],
        $parts['port'] ?? 3306,
        ltrim($parts['path'] ?? '', '/')
    );
    return new PDO($dsn, rawurldecode($parts['user'] ?? ''), rawurldecode($parts['pass'] ?? ''), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_TIMEOUT => 3,
    ]);
}

/** Exécute `$fn` ; si une table manque (première utilisation), la crée puis recommence. */
function with_schema(PDO $pdo, callable $fn): void
{
    try {
        $fn();
    } catch (PDOException $e) {
        if ($e->getCode() !== '42S02') {
            throw $e;
        }
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        create_schema($pdo);
        $fn();
    }
}

function create_schema(PDO $pdo): void
{
    // Nom unique sans casse ni accents (« Léa » = « lea ») ; créneau = début en secondes Unix (UTC).
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS dispo_people (
            id CHAR(36) NOT NULL PRIMARY KEY,
            name VARCHAR(40) NOT NULL,
            avatar MEDIUMTEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY dispo_people_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS dispo_slots (
            person_id CHAR(36) NOT NULL,
            slot_start INT UNSIGNED NOT NULL,
            PRIMARY KEY (person_id, slot_start),
            KEY dispo_slots_start (slot_start),
            CONSTRAINT dispo_slots_person FOREIGN KEY (person_id) REFERENCES dispo_people (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci'
    );
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

function uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
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
