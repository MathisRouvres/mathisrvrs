<?php
/**
 * API du calendrier des tâches maison — maison.mathis-rvrs.fr (espace privé).
 *
 * Accès : le Caddy frontal ne laisse passer une requête vers maison.mathis-rvrs.fr qu'avec une
 * session valide de l'espace privé (deploy/auth, snippet « private ») ; il retire l'en-tête
 * X-Auth-User envoyé par le client et pose le nom du compte. L'API refuse donc tout appel qui
 * n'arrive pas par cet hôte avec cet en-tête (ex. mathis-rvrs.fr/maison-api.php, public).
 * Les écritures exigent un corps JSON et, si le navigateur envoie Origin, la même origine.
 *
 * Base MySQL du VPS (deploy/db), lue dans DATABASE_URL (/opt/site/.env). Tables créées au premier
 * appel. Les tâches répétées sont stockées comme une règle ; le navigateur déroule les dates
 * (src/features/maison/recurrence.ts) et la base garde, par date, ce qui est fait ou sauté.
 *
 *   GET  ?action=state&from=AAAA-MM-JJ&to=AAAA-MM-JJ → { people, tasks, marks }
 *   POST ?action=person         { id?, name, color, avatar }   → { person } (201 si créée)
 *   POST ?action=person-delete  { id }                         → { ok: true }
 *   POST ?action=task           { id?, title, notes, category, start, repeat, every, weekdays,
 *                                 until, duration, assignees, rotate } → { task } (201 si créée)
 *   POST ?action=task-delete    { id }                         → { ok: true }
 *   POST ?action=mark           { taskId, date, status: done|skipped|null, personId } → { ok: true }
 *
 * Erreurs : { error: forbidden|duplicate|full|invalid|not-found|unavailable, message }.
 */
declare(strict_types=1);

const MAX_PEOPLE = 30;
const MAX_TASKS = 500;
const MAX_NAME = 40;
const MAX_TITLE = 80;
const MAX_NOTES = 500;
const MAX_AVATAR = 150000;
const MAX_BODY = 400000;
const MAX_RANGE_DAYS = 400;
const AVATAR_RE = '#^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$#';
const ID_RE = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/';
const REPEATS = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
// Mêmes identifiants que src/features/maison/catalog.ts (CATEGORIES).
const CATEGORIES = ['menage', 'cuisine', 'linge', 'courses', 'dechets', 'exterieur', 'animaux', 'admin', 'entretien', 'autre'];

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$action = (string) ($_GET['action'] ?? '');
guard($method);
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
    error_log('maison-api: ' . $e->getMessage());
    fail(503, 'unavailable', 'Base de données indisponible, réessaie dans un instant.');
}

/** Seulement via maison.* derrière la connexion (X-Auth-User posé par le Caddy frontal). */
function guard(string $method): void
{
    $host = strtolower(explode(':', (string) ($_SERVER['HTTP_HOST'] ?? ''))[0]);
    $user = trim((string) ($_SERVER['HTTP_X_AUTH_USER'] ?? ''));
    if (!str_starts_with($host, 'maison.') || $user === '') {
        fail(403, 'forbidden', 'Accès réservé à l’espace privé.');
    }
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($method === 'POST' && $origin !== '' && strtolower((string) parse_url($origin, PHP_URL_HOST)) !== $host) {
        fail(403, 'forbidden', 'Origine refusée.');
    }
}

function route(PDO $pdo, string $method, string $action): void
{
    if ($action === 'state' && $method === 'GET') {
        load_state($pdo);
    }
    if ($method !== 'POST') {
        fail(405, 'invalid', 'Méthode non autorisée.');
    }

    $body = read_json_body();
    match ($action) {
        'person' => save_person($pdo, $body),
        'person-delete' => delete_row($pdo, 'maison_people', $body, 'Personne introuvable.'),
        'task' => save_task($pdo, $body),
        'task-delete' => delete_row($pdo, 'maison_tasks', $body, 'Tâche introuvable.'),
        'mark' => save_mark($pdo, $body),
        default => fail(404, 'invalid', 'Action inconnue.'),
    };
}

// ── Lecture ──────────────────────────────────────────────────────────────────

function load_state(PDO $pdo): never
{
    $from = clean_date($_GET['from'] ?? null);
    $to = clean_date($_GET['to'] ?? null);
    $days = (strtotime($to) - strtotime($from)) / 86400;
    if ($days < 0 || $days > MAX_RANGE_DAYS) {
        fail(422, 'invalid', 'Période invalide.');
    }

    $people = $pdo->query('SELECT id, name, color, avatar FROM maison_people ORDER BY created_at, name')->fetchAll();

    $assignees = [];
    foreach ($pdo->query('SELECT task_id, person_id FROM maison_task_people ORDER BY task_id, position') as $row) {
        $assignees[$row['task_id']][] = $row['person_id'];
    }
    $tasks = array_map(
        static fn (array $row): array => task_json($row, $assignees[$row['id']] ?? []),
        $pdo->query('SELECT * FROM maison_tasks ORDER BY start_date, title')->fetchAll()
    );

    $query = $pdo->prepare(
        'SELECT task_id, occurrence, status, person_id FROM maison_marks WHERE occurrence BETWEEN ? AND ?'
    );
    $query->execute([$from, $to]);
    $marks = array_map(
        static fn (array $row): array => [
            'taskId' => $row['task_id'],
            'date' => $row['occurrence'],
            'status' => $row['status'],
            'personId' => $row['person_id'],
        ],
        $query->fetchAll()
    );

    respond(200, ['people' => $people, 'tasks' => $tasks, 'marks' => $marks]);
}

function task_json(array $row, array $assignees): array
{
    return [
        'id' => $row['id'],
        'title' => $row['title'],
        'notes' => $row['notes'],
        'category' => $row['category'],
        'start' => $row['start_date'],
        'repeat' => $row['repeat_kind'],
        'every' => (int) $row['every_n'],
        'weekdays' => $row['weekdays'] === '' ? [] : array_map('intval', explode(',', $row['weekdays'])),
        'until' => $row['until_date'],
        'duration' => $row['duration'] === null ? null : (int) $row['duration'],
        'assignees' => $assignees,
        'rotate' => (bool) $row['rotate'],
    ];
}

// ── Écritures ────────────────────────────────────────────────────────────────

function save_person(PDO $pdo, array $body): never
{
    $id = isset($body['id']) ? clean_id($body['id']) : null;
    $name = clean_text($body['name'] ?? null, MAX_NAME, 'Prénom');
    $color = $body['color'] ?? null;
    if (!is_string($color) || !preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
        fail(422, 'invalid', 'Couleur invalide.');
    }
    $color = strtolower($color);
    $avatar = clean_avatar($body['avatar'] ?? null);

    try {
        if ($id === null) {
            if ((int) $pdo->query('SELECT COUNT(*) FROM maison_people')->fetchColumn() >= MAX_PEOPLE) {
                fail(409, 'full', 'Nombre maximum de personnes atteint (' . MAX_PEOPLE . ').');
            }
            $id = uuid();
            $pdo->prepare('INSERT INTO maison_people (id, name, color, avatar) VALUES (?, ?, ?, ?)')
                ->execute([$id, $name, $color, $avatar]);
            respond(201, ['person' => compact('id', 'name', 'color', 'avatar')]);
        }
        ensure_exists($pdo, 'maison_people', $id, 'Personne introuvable.');
        $pdo->prepare('UPDATE maison_people SET name = ?, color = ?, avatar = ? WHERE id = ?')
            ->execute([$name, $color, $avatar, $id]);
    } catch (PDOException $e) {
        // 1062 : prénom déjà pris (comparaison sans casse ni accents, collation de la table).
        if (($e->errorInfo[1] ?? 0) === 1062) {
            fail(409, 'duplicate', 'Ce prénom existe déjà.');
        }
        throw $e;
    }
    respond(200, ['person' => compact('id', 'name', 'color', 'avatar')]);
}

function save_task(PDO $pdo, array $body): never
{
    $id = isset($body['id']) ? clean_id($body['id']) : null;
    $title = clean_text($body['title'] ?? null, MAX_TITLE, 'Titre');
    $notes = clean_notes($body['notes'] ?? '');
    $category = $body['category'] ?? null;
    if (!in_array($category, CATEGORIES, true)) {
        fail(422, 'invalid', 'Catégorie invalide.');
    }
    $start = clean_date($body['start'] ?? null);
    $repeat = $body['repeat'] ?? null;
    if (!in_array($repeat, REPEATS, true)) {
        fail(422, 'invalid', 'Répétition invalide.');
    }
    $every = $body['every'] ?? 1;
    if (!is_int($every) || $every < 1 || $every > 99) {
        fail(422, 'invalid', 'Fréquence de 1 à 99.');
    }
    $weekdays = $repeat === 'weekly' ? clean_weekdays($body['weekdays'] ?? []) : [];
    $until = $body['until'] ?? null;
    if ($until !== null) {
        $until = clean_date($until);
        if ($repeat === 'none' || $until < $start) {
            fail(422, 'invalid', 'La date de fin doit suivre la date de début.');
        }
    }
    $duration = $body['duration'] ?? null;
    if ($duration !== null && (!is_int($duration) || $duration < 1 || $duration > 600)) {
        fail(422, 'invalid', 'Durée de 1 à 600 minutes.');
    }
    $assignees = $body['assignees'] ?? [];
    if (!is_array($assignees) || !array_is_list($assignees) || count($assignees) > MAX_PEOPLE) {
        fail(422, 'invalid', 'Liste de personnes invalide.');
    }
    $assignees = array_values(array_unique(array_map('clean_id', $assignees)));
    $rotate = ($body['rotate'] ?? false) === true && $repeat !== 'none' && count($assignees) > 1;

    $pdo->beginTransaction();
    if ($assignees !== []) {
        $placeholders = implode(',', array_fill(0, count($assignees), '?'));
        $found = $pdo->prepare("SELECT COUNT(*) FROM maison_people WHERE id IN ($placeholders) FOR SHARE");
        $found->execute($assignees);
        if ((int) $found->fetchColumn() !== count($assignees)) {
            $pdo->rollBack();
            fail(404, 'not-found', 'Une des personnes n’existe plus, recharge la page.');
        }
    }
    $values = [$title, $notes, $category, $start, $repeat, $every, implode(',', $weekdays), $until, $duration, (int) $rotate];
    $created = $id === null;
    if ($created) {
        if ((int) $pdo->query('SELECT COUNT(*) FROM maison_tasks')->fetchColumn() >= MAX_TASKS) {
            $pdo->rollBack();
            fail(409, 'full', 'Nombre maximum de tâches atteint (' . MAX_TASKS . ').');
        }
        $id = uuid();
        $pdo->prepare(
            'INSERT INTO maison_tasks (title, notes, category, start_date, repeat_kind, every_n, weekdays, until_date, duration, rotate, id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([...$values, $id]);
    } else {
        $exists = $pdo->prepare('SELECT 1 FROM maison_tasks WHERE id = ? FOR UPDATE');
        $exists->execute([$id]);
        if (!$exists->fetchColumn()) {
            $pdo->rollBack();
            fail(404, 'not-found', 'Tâche introuvable.');
        }
        $pdo->prepare(
            'UPDATE maison_tasks SET title = ?, notes = ?, category = ?, start_date = ?, repeat_kind = ?, every_n = ?,
             weekdays = ?, until_date = ?, duration = ?, rotate = ? WHERE id = ?'
        )->execute([...$values, $id]);
        $pdo->prepare('DELETE FROM maison_task_people WHERE task_id = ?')->execute([$id]);
    }
    $insert = $pdo->prepare('INSERT INTO maison_task_people (task_id, person_id, position) VALUES (?, ?, ?)');
    foreach ($assignees as $position => $personId) {
        $insert->execute([$id, $personId, $position]);
    }
    $pdo->commit();

    $task = [
        'id' => $id, 'title' => $title, 'notes' => $notes, 'category' => $category, 'start' => $start,
        'repeat' => $repeat, 'every' => $every, 'weekdays' => $weekdays, 'until' => $until,
        'duration' => $duration, 'assignees' => $assignees, 'rotate' => $rotate,
    ];
    respond($created ? 201 : 200, ['task' => $task]);
}

function save_mark(PDO $pdo, array $body): never
{
    $taskId = clean_id($body['taskId'] ?? null);
    $date = clean_date($body['date'] ?? null);
    $status = $body['status'] ?? null;
    if ($status !== null && !in_array($status, ['done', 'skipped'], true)) {
        fail(422, 'invalid', 'Statut invalide.');
    }
    $personId = $body['personId'] ?? null;
    if ($personId !== null) {
        $personId = clean_id($personId);
        ensure_exists($pdo, 'maison_people', $personId, 'Personne introuvable.');
    }
    ensure_exists($pdo, 'maison_tasks', $taskId, 'Tâche introuvable.');

    if ($status === null) {
        $pdo->prepare('DELETE FROM maison_marks WHERE task_id = ? AND occurrence = ?')->execute([$taskId, $date]);
    } else {
        $pdo->prepare(
            'INSERT INTO maison_marks (task_id, occurrence, status, person_id) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status), person_id = VALUES(person_id), marked_at = CURRENT_TIMESTAMP'
        )->execute([$taskId, $date, $status, $status === 'done' ? $personId : null]);
    }
    respond(200, ['ok' => true]);
}

/** Supprime une personne ou une tâche ; les liens et marques suivent (clés étrangères). */
function delete_row(PDO $pdo, string $table, array $body, string $missing): never
{
    $id = clean_id($body['id'] ?? null);
    $delete = $pdo->prepare("DELETE FROM $table WHERE id = ?");
    $delete->execute([$id]);
    if ($delete->rowCount() === 0) {
        fail(404, 'not-found', $missing);
    }
    respond(200, ['ok' => true]);
}

function ensure_exists(PDO $pdo, string $table, string $id, string $missing): void
{
    $query = $pdo->prepare("SELECT 1 FROM $table WHERE id = ?");
    $query->execute([$id]);
    if (!$query->fetchColumn()) {
        fail(404, 'not-found', $missing);
    }
}

// ── Validation ───────────────────────────────────────────────────────────────

function clean_text(mixed $value, int $max, string $label): string
{
    if (!is_string($value)) {
        fail(422, 'invalid', "$label manquant.");
    }
    $text = preg_replace('/[\p{Cc}\p{Cf}]/u', '', $value);
    $text = trim((string) preg_replace('/\s+/u', ' ', (string) $text));
    if ($text === '' || mb_strlen($text) > $max) {
        fail(422, 'invalid', "$label de 1 à $max caractères.");
    }
    return $text;
}

function clean_notes(mixed $value): string
{
    if (!is_string($value)) {
        fail(422, 'invalid', 'Notes invalides.');
    }
    // Retours à la ligne gardés, autres caractères de contrôle retirés.
    $notes = trim((string) preg_replace('/(?!\n)[\p{Cc}\p{Cf}]/u', '', str_replace("\r\n", "\n", $value)));
    if (mb_strlen($notes) > MAX_NOTES) {
        fail(422, 'invalid', 'Notes de ' . MAX_NOTES . ' caractères maximum.');
    }
    return $notes;
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
    if (!is_string($value) || !preg_match(ID_RE, $value)) {
        fail(422, 'invalid', 'Identifiant invalide.');
    }
    return $value;
}

/** Date AAAA-MM-JJ existante (années 2000 à 2100). */
function clean_date(mixed $value): string
{
    if (
        !is_string($value) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m)
        || !checkdate((int) $m[2], (int) $m[3], (int) $m[1]) || (int) $m[1] < 2000 || (int) $m[1] > 2100
    ) {
        fail(422, 'invalid', 'Date invalide.');
    }
    return $value;
}

/** @return list<int> jours ISO (1 = lundi) triés, sans doublon */
function clean_weekdays(mixed $value): array
{
    if (!is_array($value) || !array_is_list($value) || count($value) > 7) {
        fail(422, 'invalid', 'Jours invalides.');
    }
    foreach ($value as $day) {
        if (!is_int($day) || $day < 1 || $day > 7) {
            fail(422, 'invalid', 'Jours invalides.');
        }
    }
    $days = array_values(array_unique($value));
    sort($days);
    return $days;
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
    $options = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';
    // Prénom unique sans casse ni accents (« Léa » = « lea ») ; couleur « #rrggbb ».
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS maison_people (
            id CHAR(36) NOT NULL PRIMARY KEY,
            name VARCHAR(40) NOT NULL,
            color CHAR(7) NOT NULL,
            avatar MEDIUMTEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY maison_people_name (name)
        ) $options"
    );
    // Règle de répétition : repeat_kind (none|daily|weekly|monthly|yearly) tous les every_n ;
    // weekdays = jours ISO « 1,4 » (hebdomadaire seulement) ; until_date incluse.
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS maison_tasks (
            id CHAR(36) NOT NULL PRIMARY KEY,
            title VARCHAR(80) NOT NULL,
            notes VARCHAR(500) NOT NULL DEFAULT '',
            category VARCHAR(20) NOT NULL,
            start_date DATE NOT NULL,
            repeat_kind VARCHAR(8) NOT NULL,
            every_n SMALLINT UNSIGNED NOT NULL DEFAULT 1,
            weekdays VARCHAR(13) NOT NULL DEFAULT '',
            until_date DATE NULL,
            duration SMALLINT UNSIGNED NULL,
            rotate TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) $options"
    );
    // Personnes chargées d'une tâche, dans l'ordre du tour de rôle.
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS maison_task_people (
            task_id CHAR(36) NOT NULL,
            person_id CHAR(36) NOT NULL,
            position TINYINT UNSIGNED NOT NULL,
            PRIMARY KEY (task_id, person_id),
            CONSTRAINT maison_task_people_task FOREIGN KEY (task_id) REFERENCES maison_tasks (id) ON DELETE CASCADE,
            CONSTRAINT maison_task_people_person FOREIGN KEY (person_id) REFERENCES maison_people (id) ON DELETE CASCADE
        ) $options"
    );
    // Une occurrence (tâche + date) faite ou sautée ; absente = à faire.
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS maison_marks (
            task_id CHAR(36) NOT NULL,
            occurrence DATE NOT NULL,
            status VARCHAR(8) NOT NULL,
            person_id CHAR(36) NULL,
            marked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (task_id, occurrence),
            KEY maison_marks_occurrence (occurrence),
            CONSTRAINT maison_marks_task FOREIGN KEY (task_id) REFERENCES maison_tasks (id) ON DELETE CASCADE,
            CONSTRAINT maison_marks_person FOREIGN KEY (person_id) REFERENCES maison_people (id) ON DELETE SET NULL
        ) $options"
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
