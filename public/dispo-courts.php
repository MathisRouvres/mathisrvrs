<?php
/**
 * Terrains de padel libres près de La Rochelle, croisés avec les dispos dans /dispo.
 *
 *   GET ?week=YYYY-MM-DD (lundi, semaine en cours → +8 semaines)
 *   → { clubs: [{ id, name, url, status, slots: [{ start, duration, courts, price, url }] }] }
 *        status : ok | unavailable (club injoignable) | not-configured (source pas branchée)
 *        start : ISO UTC ; duration : minutes ; courts : terrains libres ; price : centimes ou null
 *
 * Sources :
 *   - Lagord Tennis Squash : Anybuddy, lu comme le fait sa page publique (sans compte).
 *   - Impact Stadium La Rochelle : Gestion Sports, avec le compte dédié de GS_IMPACT_EMAIL /
 *     GS_IMPACT_PASSWORD (/opt/site/.env). Session gardée dans un fichier cookie privé ; nouvelle
 *     connexion seulement quand elle a expiré, et pas plus d'un essai raté par quart d'heure.
 *     Seules les heures des terrains libres sont gardées (la réponse liste aussi des joueurs).
 * Chaque réponse de club est gardée 5 min (1 min en cas d'échec) dans un cache fichier : les
 * clubs ne sont pas appelés à chaque visite, et une semaine = une clé de cache, ce qui borne les
 * appels sortants.
 */
declare(strict_types=1);

const TIMEZONE = 'Europe/Paris';
const CACHE_TTL = 300;
const CACHE_FAIL_TTL = 60;
const MAX_WEEKS_AHEAD = 8;
const HTTP_TIMEOUT = 6;
const USER_AGENT = 'mathis-rvrs.fr-dispo/1.0 (+https://mathis-rvrs.fr/dispo)';

const GS_BASE = 'https://imp4ctstadium-admin.gestion-sports.com';
const GS_SUBDOMAIN = 'imp4ctstadium';
const GS_LOGIN_CLUB = 465;   // id_club du formulaire de connexion (groupe Impact)
const GS_CLUB = 330;         // Impact La Rochelle
const GS_PADEL = 951;
const GS_LOGIN_RETRY = 900;  // secondes entre deux connexions ratées

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
        'url' => GS_BASE . '/appli/Reservation',
        'fetch' => gs_credentials() === null ? null : static fn () => impact_slots($from, $to, $tz),
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

// ── Gestion Sports (Impact Stadium) ─────────────────────────────────────────

/** @return array{0: string, 1: string}|null email et mot de passe du compte dédié */
function gs_credentials(): ?array
{
    $email = (string) (getenv('GS_IMPACT_EMAIL') ?: ($_SERVER['GS_IMPACT_EMAIL'] ?? ''));
    $password = (string) (getenv('GS_IMPACT_PASSWORD') ?: ($_SERVER['GS_IMPACT_PASSWORD'] ?? ''));
    return $email !== '' && $password !== '' ? [$email, $password] : null;
}

/**
 * Terrains de padel libres d'Impact La Rochelle, jour par jour : un terrain est libre à une heure
 * quand son créneau n'a pas de réservation (`idResa` null ; sinon c'est un match ouvert).
 */
function impact_slots(DateTimeImmutable $from, DateTimeImmutable $to, DateTimeZone $tz): ?array
{
    $http = gs_client();
    $auth = gs_auth($http);
    if ($auth === null) {
        return null;
    }

    $slots = [];
    for ($day = $from->setTime(0, 0); $day <= $to; $day = $day->modify('+1 day')) {
        $courts = gs_api($http, $auth, [
            'event' => 'reservationManager.getAvailableSlotsForDay',
            'args' => ['day' => $day->format('Y-m-d'), 'idSport' => GS_PADEL, 'targetClubId' => GS_CLUB],
        ]);
        if (!is_array($courts) || !array_is_list($courts)) {
            error_log('dispo-courts: Gestion Sports, réponse inattendue');
            return null;
        }
        // Terrains libres par heure de début et durée.
        $free = [];
        foreach ($courts as $court) {
            foreach (is_array($court['slotsAvailable'] ?? null) ? $court['slotsAvailable'] : [] as $slot) {
                if (!is_array($slot) || ($slot['idResa'] ?? null) !== null || !is_string($slot['dateTimeStart'] ?? null)) {
                    continue;
                }
                foreach (is_array($slot['durations'] ?? null) ? $slot['durations'] : [] as $duration) {
                    $duration = (int) $duration;
                    if ($duration >= 30 && $duration <= 240) {
                        $key = $slot['dateTimeStart'] . '|' . $duration;
                        $free[$key] = ($free[$key] ?? 0) + 1;
                    }
                }
            }
        }
        foreach ($free as $key => $count) {
            [$start, $duration] = explode('|', $key);
            $local = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $start, $tz);
            if ($local === false) {
                continue;
            }
            $slots[] = [
                'start' => $local->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z'),
                'duration' => (int) $duration,
                'courts' => $count,
                'price' => null,
                'url' => GS_BASE . '/appli/Reservation',
            ];
        }
    }
    return $slots;
}

/** Session cURL dont les cookies vivent dans un fichier privé (réutilisés d'un appel à l'autre). */
function gs_client(): CurlHandle
{
    $jar = cache_dir() . '/gs-session.txt';
    if (!is_file($jar)) {
        @touch($jar);
        @chmod($jar, 0600);
    }
    $http = curl_init();
    curl_setopt_array($http, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => HTTP_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_USERAGENT => USER_AGENT,
        CURLOPT_COOKIEFILE => $jar,
        CURLOPT_COOKIEJAR => $jar,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    ]);
    return $http;
}

/**
 * Identité de session (`idUser`, `csrf`) : celle en cours si elle est encore valide, sinon après
 * une nouvelle connexion avec le compte dédié.
 * @return array{idUser: string, csrf: string}|null
 */
function gs_auth(CurlHandle $http): ?array
{
    $check = static function () use ($http): ?array {
        $anonymous = null;
        $data = gs_api($http, $anonymous, ['event' => 'userManager.checkAuth', 'url' => GS_SUBDOMAIN]);
        $user = $data['data'] ?? null;
        return ($data['status'] ?? '') === 'ok' && is_array($user) && !empty($user['idUser']) && !empty($user['csrf_token'])
            ? ['idUser' => (string) $user['idUser'], 'csrf' => (string) $user['csrf_token']]
            : null;
    };
    $auth = $check();
    if ($auth !== null) {
        return $auth;
    }

    $failed = cache_dir() . '/gs-login-failed';
    if (is_file($failed) && filemtime($failed) > time() - GS_LOGIN_RETRY) {
        return null;
    }
    [$email, $password] = gs_credentials() ?? ['', ''];
    gs_request($http, '/connexion.php', null);
    $login = gs_request($http, '/traitement/connexion.php', http_build_query([
        'ajax' => 'connexionUser',
        'id_club' => GS_LOGIN_CLUB,
        'email' => $email,
        'form_ajax' => 1,
        'pass' => $password,
        'compte' => 'user',
        'playeridonesignal' => '',
        'identifiant' => 'identifiant',
        'externCo' => 'true',
    ]), ['Content-Type: application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With: XMLHttpRequest']);
    $result = json_decode($login['body'] ?? '', true);
    $auth = ($result['status'] ?? '') === 'ok' ? $check() : null;
    if ($auth === null) {
        error_log('dispo-courts: connexion Gestion Sports refusée (' . (is_array($result) ? (string) ($result['status'] ?? '?') : 'pas de JSON') . ')');
        @touch($failed);
        return null;
    }
    @unlink($failed);
    return $auth;
}

/**
 * Appel de l'API de l'application Gestion Sports (`/gs-api`). `$auth` = en-têtes d'identité ; son
 * jeton CSRF suit le nouveau jeton renvoyé par le serveur.
 * @param array{idUser: string, csrf: string}|null $auth
 */
function gs_api(CurlHandle $http, ?array &$auth, array $payload): mixed
{
    $headers = ['Content-Type: application/json', 'Accept: application/json'];
    if ($auth !== null) {
        $headers[] = 'X-User-ID: ' . $auth['idUser'];
        $headers[] = 'X-Club-ID: ' . GS_CLUB;
        $headers[] = 'X-XSRF-TOKEN: ' . $auth['csrf'];
    }
    $response = gs_request($http, '/gs-api', json_encode($payload), $headers);
    if ($response === null) {
        return null;
    }
    if ($auth !== null && isset($response['headers']['x-new-csrf-token'])) {
        $auth['csrf'] = $response['headers']['x-new-csrf-token'];
    }
    return json_decode($response['body'], true);
}

/**
 * GET (`$body` null) ou POST sur Gestion Sports.
 * @return array{status: int, body: string, headers: array<string, string>}|null
 */
function gs_request(CurlHandle $http, string $path, ?string $body, array $headers = []): ?array
{
    $received = [];
    curl_setopt_array($http, [
        CURLOPT_URL => GS_BASE . $path,
        CURLOPT_HTTPGET => $body === null,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$received): int {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) {
                $received[strtolower(trim($parts[0]))] = trim($parts[1]);
            }
            return strlen($line);
        },
    ]);
    if ($body !== null) {
        curl_setopt($http, CURLOPT_POSTFIELDS, $body);
    }
    $result = curl_exec($http);
    $status = (int) curl_getinfo($http, CURLINFO_RESPONSE_CODE);
    if (!is_string($result) || $status === 0 || $status >= 500) {
        error_log(sprintf('dispo-courts: Gestion Sports %s → %s', $path, $status ?: curl_error($http)));
        return null;
    }
    return ['status' => $status, 'body' => $result, 'headers' => $received];
}

// ── Outils ───────────────────────────────────────────────────────────────────

function cache_dir(): string
{
    $dir = sys_get_temp_dir() . '/dispo-courts';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

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
    $file = cache_dir() . '/' . preg_replace('/[^a-z0-9-]/', '', $key) . '.json';
    $stored = is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;
    if (is_array($stored) && ($stored['expires'] ?? 0) > time()) {
        return $stored['value'];
    }

    $value = $fetch();
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
