<?php
/**
 * Endpoint contact — mathis-rvrs.fr
 * Reçoit POST JSON, envoie vers rouvresmathis@gmail.com via mail() OVH.
 */
declare(strict_types=1);

const RECIPIENT = 'rouvresmathis@gmail.com';
const FROM_ADDRESS = 'contact@mathis-rvrs.fr';
const FROM_NAME = 'mathis-rvrs.fr';
const SUBJECT = 'Nouveau message depuis mathis-rvrs.fr';
const MIN_SUBMIT_MS = 3000;
const MAX_NAME = 100;
const MAX_EMAIL = 150;
const MAX_MESSAGE = 3000;
const MIN_MESSAGE = 10;

json_headers();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_exit(405, false, 'Méthode non autorisée.');
}

$payload = read_json_body();
if ($payload === null) {
    json_exit(400, false, 'Requête invalide.');
}

// Honeypot — réponse silencieuse pour les bots
$honeypot = trim((string) ($payload['website'] ?? ''));
if ($honeypot !== '') {
    json_exit(200, true, '');
}

$name = sanitize_text((string) ($payload['name'] ?? ''), MAX_NAME);
$email = sanitize_email((string) ($payload['email'] ?? ''), MAX_EMAIL);
$message = sanitize_text((string) ($payload['message'] ?? ''), MAX_MESSAGE);
$formStartedAt = filter_var($payload['formStartedAt'] ?? 0, FILTER_VALIDATE_INT) ?: 0;

if ($name === '') {
    json_exit(422, false, 'Le nom est obligatoire.');
}

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_exit(422, false, 'Adresse email invalide.');
}

if ($message === '' || mb_strlen($message) < MIN_MESSAGE) {
    json_exit(422, false, 'Le message doit contenir au moins ' . MIN_MESSAGE . ' caractères.');
}

if ($formStartedAt > 0) {
    $elapsed = (int) round(microtime(true) * 1000) - $formStartedAt;
    if ($elapsed < MIN_SUBMIT_MS) {
        json_exit(429, false, 'Envoi trop rapide. Réessayez dans quelques secondes.');
    }
}

$safeName = sanitize_header_value($name);
$safeEmail = sanitize_header_value($email);
$ip = sanitize_header_value((string) ($_SERVER['REMOTE_ADDR'] ?? 'inconnue'));
$date = date('d/m/Y H:i:s');

$body = implode("\n", [
    'Nouveau message depuis mathis-rvrs.fr',
    '',
    'Nom : ' . $name,
    'Email : ' . $email,
    'Date : ' . $date,
    'IP : ' . $ip,
    '',
    'Message :',
    '----------',
    $message,
]);

$encodedSubject = '=?UTF-8?B?' . base64_encode(SUBJECT) . '?=';

$headers = implode("\r\n", [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . FROM_NAME . ' <' . FROM_ADDRESS . '>',
    'Reply-To: ' . $safeName . ' <' . $safeEmail . '>',
    'X-Mailer: PHP/' . phpversion(),
]);

// Paramètre -f requis sur OVH pour l'envelope sender (SPF)
$sent = @mail(RECIPIENT, $encodedSubject, $body, $headers, '-f' . FROM_ADDRESS);

if (!$sent) {
    json_exit(500, false, 'Impossible d\'envoyer le message pour le moment. Réessayez plus tard.');
}

json_exit(200, true, '');

function read_json_body(): ?array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return null;
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function sanitize_text(string $value, int $maxLen): string
{
    $value = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '');
    if (mb_strlen($value) > $maxLen) {
        $value = mb_substr($value, 0, $maxLen);
    }
    return $value;
}

function sanitize_email(string $value, int $maxLen): string
{
    $value = sanitize_header_value(trim($value));
    if (strlen($value) > $maxLen) {
        $value = substr($value, 0, $maxLen);
    }
    return $value;
}

function sanitize_header_value(string $value): string
{
    return str_replace(["\r", "\n", "\0", '%0a', '%0d', '%0A', '%0D'], '', $value);
}

function json_headers(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
}

function json_exit(int $code, bool $success, string $message): void
{
    http_response_code($code);
    $payload = ['success' => $success];
    if ($message !== '') {
        $payload['message'] = $message;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
