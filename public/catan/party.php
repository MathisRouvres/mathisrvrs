<?php
/**
 * Relais de partie entre amis.
 *
 * Le jeu est deterministe : une graine et une liste d'actions ordonnee suffisent a
 * reconstruire une partie identique sur chaque appareil. Ce fichier n'est donc pas un
 * serveur de jeu — il ne connait aucune regle — mais une simple boite aux lettres : il
 * conserve la graine, la liste des joueurs et la suite des actions, et les rend a qui
 * presente le bon code.
 *
 * Contraintes de l'hebergement mutualise : pas de base de donnees, pas de processus
 * persistant, pas de websocket. Un fichier JSON par partie, verrouille a l'ecriture, et
 * des clients qui interrogent le relais a intervalle regulier.
 *
 * Les parties vivent dans le repertoire temporaire du compte, hors de l'espace web : le
 * code de partie est le seul secret, et personne ne peut lister les parties en cours.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1 : illisibles
const CODE_LENGTH = 5;
const MAX_SEATS = 4;
const MAX_ACTIONS = 4000;      // une partie complete en compte environ 500
const MAX_ACTION_BYTES = 512;
const MAX_NAME_LENGTH = 16;
const PARTY_LIFETIME = 43200;  // 12 heures : au-dela, la partie est abandonnee
const MAX_PARTIES = 200;

function store_dir(): string
{
    $dir = sys_get_temp_dir() . '/hexland-parties';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function fail(string $reason, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $reason]);
    exit;
}

function succeed(array $payload): void
{
    echo json_encode(['ok' => true] + $payload);
    exit;
}

function path_for(string $code): string
{
    return store_dir() . '/' . $code . '.json';
}

/** Valide un code : la forme est verifiee avant tout acces disque. */
function clean_code(string $raw): string
{
    $code = strtoupper(trim($raw));
    if (!preg_match('/^[' . CODE_ALPHABET . ']{' . CODE_LENGTH . '}$/', $code)) {
        fail('code invalide');
    }
    return $code;
}

function clean_name(string $raw): string
{
    $name = trim(preg_replace('/[^\p{L}\p{N} _-]/u', '', $raw) ?? '');
    $name = mb_substr($name, 0, MAX_NAME_LENGTH);
    return $name === '' ? 'Joueur' : $name;
}

function body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '' || strlen($raw) > 64000) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** Supprime les parties abandonnees. Appele a chaque creation : pas de tache planifiee. */
function collect_garbage(): void
{
    $files = glob(store_dir() . '/*.json') ?: [];
    $now = time();
    foreach ($files as $file) {
        if ($now - (int)@filemtime($file) > PARTY_LIFETIME) {
            @unlink($file);
        }
    }
}

function count_parties(): int
{
    return count(glob(store_dir() . '/*.json') ?: []);
}

function random_code(): string
{
    $code = '';
    $alphabet = CODE_ALPHABET;
    for ($i = 0; $i < CODE_LENGTH; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $code;
}

/**
 * Lit, modifie et reecrit une partie sous verrou exclusif.
 *
 * Deux joueurs peuvent repondre a une offre d'echange en meme temps : sans verrou, la
 * seconde ecriture ecraserait la premiere et une action disparaitrait de la partie.
 */
function with_party(string $code, callable $mutate)
{
    $path = path_for($code);
    $handle = @fopen($path, 'c+');
    if ($handle === false) {
        fail('partie introuvable', 404);
    }
    if (!flock($handle, LOCK_EX)) {
        fclose($handle);
        fail('partie occupee, reessayez', 503);
    }
    $raw = stream_get_contents($handle);
    $party = $raw === '' ? null : json_decode($raw, true);
    if (!is_array($party)) {
        flock($handle, LOCK_UN);
        fclose($handle);
        fail('partie introuvable', 404);
    }
    $result = $mutate($party);
    if ($result['save'] ?? false) {
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($party));
        fflush($handle);
    }
    flock($handle, LOCK_UN);
    fclose($handle);
    return $result['payload'] ?? [];
}

/** Etat public d'une partie : ce que tout membre a le droit de connaitre. */
function summary(array $party, int $since): array
{
    $actions = array_slice($party['actions'], max(0, $since));
    return [
        'code' => $party['code'],
        'seed' => $party['seed'],
        'mode' => $party['mode'],
        'seats' => $party['seats'],
        'players' => $party['players'],
        'started' => $party['started'],
        'since' => max(0, $since),
        'total' => count($party['actions']),
        'actions' => $actions,
    ];
}

$action = $_GET['action'] ?? '';

if ($action === 'create') {
    collect_garbage();
    if (count_parties() >= MAX_PARTIES) {
        fail('trop de parties en cours, reessayez plus tard', 503);
    }
    $data = body();
    $seed = (int)($data['seed'] ?? 0);
    $mode = (int)($data['mode'] ?? 0);
    $seats = (int)($data['seats'] ?? 4);
    if ($seed <= 0 || $seats < 2 || $seats > MAX_SEATS) {
        fail('parametres de partie invalides');
    }
    $code = random_code();
    for ($attempt = 0; $attempt < 8 && file_exists(path_for($code)); $attempt++) {
        $code = random_code();
    }
    $party = [
        'code' => $code,
        'seed' => $seed,
        'mode' => $mode,
        'seats' => $seats,
        'players' => [['seat' => 0, 'name' => clean_name((string)($data['name'] ?? ''))]],
        'started' => false,
        'actions' => [],
        'created' => time(),
    ];
    file_put_contents(path_for($code), json_encode($party), LOCK_EX);
    succeed(['party' => summary($party, 0), 'seat' => 0]);
}

if ($action === 'join') {
    $code = clean_code((string)($_GET['code'] ?? ''));
    $data = body();
    $name = clean_name((string)($data['name'] ?? ''));
    $payload = with_party($code, function (array &$party) use ($name) {
        if ($party['started']) {
            fail('la partie a deja commence', 409);
        }
        $taken = array_column($party['players'], 'seat');
        $seat = -1;
        for ($candidate = 0; $candidate < (int)$party['seats']; $candidate++) {
            if (!in_array($candidate, $taken, true)) {
                $seat = $candidate;
                break;
            }
        }
        if ($seat < 0) {
            fail('la partie est complete', 409);
        }
        $party['players'][] = ['seat' => $seat, 'name' => $name];
        return ['save' => true, 'payload' => ['seat' => $seat]];
    });
    $party = json_decode((string)file_get_contents(path_for($code)), true);
    succeed(['party' => summary($party, 0), 'seat' => $payload['seat']]);
}

if ($action === 'start') {
    $code = clean_code((string)($_GET['code'] ?? ''));
    $payload = with_party($code, function (array &$party) {
        $party['started'] = true;
        return ['save' => true, 'payload' => ['party' => summary($party, 0)]];
    });
    succeed($payload);
}

if ($action === 'poll') {
    $code = clean_code((string)($_GET['code'] ?? ''));
    $since = (int)($_GET['since'] ?? 0);
    $payload = with_party($code, function (array &$party) use ($since) {
        return ['save' => false, 'payload' => ['party' => summary($party, $since)]];
    });
    succeed($payload);
}

if ($action === 'push') {
    $code = clean_code((string)($_GET['code'] ?? ''));
    $data = body();
    $index = (int)($data['index'] ?? -1);
    $entry = $data['action'] ?? null;
    if (!is_array($entry) || strlen((string)json_encode($entry)) > MAX_ACTION_BYTES) {
        fail('action invalide');
    }
    $payload = with_party($code, function (array &$party) use ($index, $entry) {
        $total = count($party['actions']);
        if ($total >= MAX_ACTIONS) {
            fail('partie trop longue', 409);
        }
        // Concurrence optimiste : l'action porte le rang qu'elle croit occuper. Si un autre
        // joueur a ecrit entre-temps, on refuse et le client se resynchronise avant de
        // rejouer son coup. Une action ne peut donc jamais s'inserer au mauvais rang.
        if ($index !== $total) {
            return ['save' => false, 'payload' => [
                'accepted' => false,
                'party' => summary($party, max(0, $index)),
            ]];
        }
        $party['actions'][] = $entry;
        return ['save' => true, 'payload' => ['accepted' => true, 'total' => $total + 1]];
    });
    succeed($payload);
}

fail('action inconnue', 404);
