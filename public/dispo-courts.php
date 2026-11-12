<?php
/**
 * Terrains de padel libres près de La Rochelle, croisés avec les dispos dans /dispo.
 *
 *   GET ?week=YYYY-MM-DD (lundi, semaine en cours → +8 semaines)
 *   → { clubs: [{ id, name, url, status, slots: [{ start, duration, courts, price, url }] }] }
 *        status : ok | unavailable (club injoignable) | not-configured (source pas branchée)
 *        start : ISO UTC ; duration : minutes ; courts : terrains libres ; price : centimes ou null
 *
 * Sources : Anybuddy (Lagord Tennis Squash), lu comme le fait sa page publique ; Impact Stadium
 * (Gestion Sports, compte requis) pas encore branché. Chaque réponse de club est gardée 5 min
 * (1 min en cas d'échec) dans un cache fichier : les clubs ne sont pas appelés à chaque visite,
 * et une semaine = une clé de cache, ce qui borne les appels sortants.
 */
declare(strict_types=1);

const TIMEZONE = 'Europe/Paris';
const CACHE_TTL = 300;
const CACHE_FAIL_TTL = 60;
const MAX_WEEKS_AHEAD = 8;
const HTTP_TIMEOUT = 6;
const USER_AGENT = 'mathis-rvrs.fr-dispo/1.0 (+https://mathis-rvrs.fr/dispo)';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    fail(405, 'Méthode non autorisée.');
}

$tz = new DateTimeZone(TIMEZONE);
[$from, $to] = week_range((string) ($_GET['week'] ?? ''), $tz);

$clubs = [
    [
        'id' => 'lagord',
        'name' => 'Lagord Tennis Squash',
        'url' => 'https://www.anybuddyapp.com/fr/club/lagord-tennis-squash/padel',
        'fetch' => static fn () => anybuddy_slots('lagord-tennis-squash', $from, $to, $tz),
    ],
    [
        'id' => 'impact',
        'name' => 'Impact Stadium',
        'url' => 'https://imp4ctstadium.gestion-sports.com/',
        'fetch' => null,
    ],
];

$result = [];
foreach ($clubs as $club) {
    $entry = ['id' => $club['id'], 'name' => $club['name'], 'url' => $club['url'], 'status' => 'not-configured', 'slots' => []];
    if ($club['fetch'] !== null) {
        $slots = cached($club['id'] . '-' . $from->format('Y-m-d'), $club['fetch']);
        $entry['status'] = $slots === null ? 'unavailable' : 'ok';
        $entry['slots'] = $slots ?? [];
    }
    $result[] = $entry;
}
respond(200, ['clubs' => $result]);

/**
 * Lundi demandé → [début du jour (aujourd'hui si la semaine est en cours), dimanche 23:59].
 * @return array{0: DateTimeImmutable, 1: DateTimeImmutable}
 */
function week_range(string $week, DateTimeZone $tz): array
{
    $monday = preg_match('/^\d{4}-\d{2}-\d{2}$/', $week)
        ? DateTimeImmutable::createFromFormat('!Y-m-d', $week, $tz)
        : false;
    if ($monday === false || $monday->format('Y-m-d') !== $week || $monday->format('N') !== '1') {
        fail(422, 'Semaine invalide (lundi au format AAAA-MM-JJ).');
    }
    $today = new DateTimeImmutable('today', $tz);
    $thisMonday = $today->modify('monday this week');
    if ($monday < $thisMonday || $monday > $thisMonday->modify('+' . MAX_WEEKS_AHEAD . ' weeks')) {
        fail(422, 'Semaine hors de la période proposée.');
    }
    return [max($monday, $today), $monday->modify('+6 days 23:59')];
}

// ── Anybuddy ─────────────────────────────────────────────────────────────────

/**
 * Créneaux libres d'un club Anybuddy : un créneau par heure de début, `services` = un terrain
 * libre chacun (durée, prix en centimes). Heures locales du club (Europe/Paris).
 */
function anybuddy_slots(string $club, DateTimeImmutable $from, DateTimeImmutable $to, DateTimeZone $tz): ?array
{
    $query = http_build_query([
        'clubSlug' => $club,
        'dateFrom' => $from->format('Y-m-d'),
        'dateTo' => $to->format('Y-m-d\TH:i'),
        'activity' => 'padel',
    ]);
    $data = http_json('https://www.anybuddyapp.com/api/v1/availabilities?' . $query);
    if (!is_array($data) || !array_key_exists('data', $data)) {
        return null;
    }

    $slots = [];
    foreach (is_array($data['data']) ? $data['data'] : [] as $row) {
        $local = is_array($row) && is_string($row['startDateTime'] ?? null)
            ? DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $row['startDateTime'], $tz)
            : false;
        if ($local === false || !is_array($row['services'] ?? null)) {
            continue;
        }
        // Un créneau par durée proposée à cette heure : nombre de terrains et prix le plus bas.
        $byDuration = [];
        foreach ($row['services'] as $service) {
            $duration = is_array($service) ? (int) ($service['duration'] ?? 0) : 0;
            if ($duration < 30 || $duration > 240) {
                continue;
            }
            $raw = $service['discountPrice'] ?? $service['price'] ?? null;
            $price = is_numeric($raw) ? (int) $raw : null;
            $current = $byDuration[$duration] ?? ['courts' => 0, 'price' => null];
            $byDuration[$duration] = [
                'courts' => $current['courts'] + 1,
                'price' => $price === null ? $current['price'] : min($price, $current['price'] ?? $price),
            ];
        }
        foreach ($byDuration as $duration => $info) {
            $slots[] = [
                'start' => $local->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z'),
                'duration' => $duration,
                'courts' => $info['courts'],
                'price' => $info['price'],
                'url' => 'https://www.anybuddyapp.com/fr/club/' . rawurlencode($club) . '/padel?date=' . $local->format('Y-m-d'),
            ];
        }
    }
    return $slots;
}

// ── Outils ───────────────────────────────────────────────────────────────────

function http_json(string $url): mixed
{
    $context = stream_context_create(['http' => [
        'method' => 'GET',
        'timeout' => HTTP_TIMEOUT,
        'ignore_errors' => true,
        'header' => "Accept: application/json\r\nUser-Agent: " . USER_AGENT . "\r\n",
    ]]);
    $body = @file_get_contents($url, false, $context, 0, 2_000_000);
    $status = preg_match('#^HTTP/\S+ (\d{3})#', $http_response_header[0] ?? '', $m) ? (int) $m[1] : 0;
    if ($body === false || $status !== 200) {
        error_log(sprintf('dispo-courts: %s → %s', strtok($url, '?'), $status ?: 'pas de réponse'));
        return null;
    }
    return json_decode($body, true);
}

/** Résultat de `$fetch` gardé CACHE_TTL secondes (CACHE_FAIL_TTL s'il a échoué : null). */
function cached(string $key, callable $fetch): ?array
{
    $dir = sys_get_temp_dir() . '/dispo-courts';
    $file = $dir . '/' . preg_replace('/[^a-z0-9-]/', '', $key) . '.json';
    $stored = is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;
    if (is_array($stored) && ($stored['expires'] ?? 0) > time()) {
        return $stored['value'];
    }

    $value = $fetch();
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $tmp = $file . '.' . bin2hex(random_bytes(4));
    $payload = ['expires' => time() + ($value === null ? CACHE_FAIL_TTL : CACHE_TTL), 'value' => $value];
    if (@file_put_contents($tmp, json_encode($payload)) !== false) {
        @rename($tmp, $file);
    }
    return $value;
}

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $message): never
{
    respond($status, ['error' => 'invalid', 'message' => $message]);
}
