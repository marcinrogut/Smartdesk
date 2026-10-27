<?php
declare(strict_types=1);

/* Smartdesk – small PHP prototype. Data and uploaded files stay outside public URLs. */
const DATA_FILE = __DIR__ . '/data/users.json';
const STORAGE = __DIR__ . '/storage/users';

foreach ([dirname(DATA_FILE), STORAGE] as $directory) {
    if (!is_dir($directory)) mkdir($directory, 0770, true);
}
session_name('smartdesk_session');
session_start();

function respond(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function readUsers(): array {
    if (!file_exists(DATA_FILE)) {
        $admin = ['id' => 1, 'username' => 'admin', 'password' => password_hash('admin', PASSWORD_DEFAULT), 'role' => 'admin', 'enabled' => true, 'created_at' => date(DATE_ATOM)];
        file_put_contents(DATA_FILE, json_encode([$admin], JSON_PRETTY_PRINT));
        makeHome(1);
        return [$admin];
    }
    return json_decode((string) file_get_contents(DATA_FILE), true) ?: [];
}
function saveUsers(array $users): void { file_put_contents(DATA_FILE, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX); }
function makeHome(int $id): void {
    foreach (['Documents', 'Pictures', 'Downloads'] as $folder) {
        $path = STORAGE . '/' . $id . '/' . $folder;
        if (!is_dir($path)) mkdir($path, 0770, true);
    }
}
function currentUser(): array {
    $id = $_SESSION['user_id'] ?? null;
    foreach (readUsers() as $user) if ($user['id'] === $id && $user['enabled']) return $user;
    unset($_SESSION['user_id']);
    respond(['error' => 'Wymagane logowanie.'], 401);
}
function cleanPart(string $value): string {
    $value = trim(str_replace('\\', '/', $value));
    if ($value === '' || $value === '.' || str_contains($value, '/') || str_contains($value, '..') || str_contains($value, "\0")) respond(['error' => 'Nieprawidłowa ścieżka.'], 422);
    return $value;
}
function userPath(array $user, string $relative = ''): string {
    $base = realpath(STORAGE . '/' . $user['id']);
    if (!$base) { makeHome($user['id']); $base = realpath(STORAGE . '/' . $user['id']); }
    $relative = trim(str_replace('\\', '/', $relative), '/');
    if ($relative !== '' && (str_contains($relative, '..') || str_contains($relative, "\0"))) respond(['error' => 'Nieprawidłowa ścieżka.'], 422);
    return $base . ($relative === '' ? '' : '/' . $relative);
}
function requestBody(): array { return json_decode((string) file_get_contents('php://input'), true) ?: []; }
function publicUser(array $user): array { return ['id'=>$user['id'], 'username'=>$user['username'], 'role'=>$user['role'], 'enabled'=>$user['enabled']]; }

$route = $_GET['api'] ?? '';
if ($route !== '') {
    if ($route === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = requestBody();
        foreach (readUsers() as $user) {
            if ($user['username'] === ($body['username'] ?? '') && password_verify($body['password'] ?? '', $user['password'])) {
                if (!$user['enabled']) respond(['error' => 'To konto zostało wyłączone.'], 403);
                session_regenerate_id(true); $_SESSION['user_id'] = $user['id']; respond(['user' => publicUser($user)]);
            }
        }
        respond(['error' => 'Nieprawidłowy login lub hasło.'], 401);
    }
    if ($route === 'logout') { session_destroy(); respond(['ok' => true]); }
    $user = currentUser();
    if ($route === 'me') respond(['user' => publicUser($user)]);
    if ($route === 'files') {
        $relative = $_GET['path'] ?? '';
        $path = userPath($user, $relative);
        if (!is_dir($path)) respond(['error' => 'Folder nie istnieje.'], 404);
        $items = [];
        foreach (scandir($path) ?: [] as $name) if ($name !== '.' && $name !== '..') {
            $item = $path . '/' . $name;
            $items[] = ['name'=>$name, 'type'=>is_dir($item) ? 'folder' : 'file', 'size'=>is_file($item) ? filesize($item) : null, 'modified'=>date(DATE_ATOM, filemtime($item))];
        }
        usort($items, fn($a,$b) => ($a['type'] === $b['type']) ? strcasecmp($a['name'], $b['name']) : ($a['type'] === 'folder' ? -1 : 1));
        respond(['path' => trim($relative, '/'), 'items' => $items]);
    }
    if ($route === 'folder' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = requestBody(); $parent = userPath($user, $body['path'] ?? ''); $name = cleanPart((string)($body['name'] ?? ''));
        if (!is_dir($parent) || !mkdir($parent . '/' . $name, 0770)) respond(['error' => 'Nie można utworzyć folderu.'], 422);
        respond(['ok'=>true], 201);
    }
    if ($route === 'upload' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $target = userPath($user, $_POST['path'] ?? ''); $file = $_FILES['file'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK || !is_dir($target)) respond(['error' => 'Przesłanie pliku nie powiodło się.'], 422);
        $name = cleanPart(basename($file['name']));
        if (!move_uploaded_file($file['tmp_name'], $target . '/' . $name)) respond(['error'=>'Nie zapisano pliku.'], 500);
        respond(['ok'=>true], 201);
    }
    if ($route === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = requestBody(); $path = userPath($user, cleanPart((string)($body['path'] ?? '')));
        if (is_dir($path)) { if (count(scandir($path) ?: []) > 2 || !rmdir($path)) respond(['error'=>'Można usuwać tylko puste foldery.'], 422); }
        elseif (!is_file($path) || !unlink($path)) respond(['error'=>'Nie można usunąć elementu.'], 422);
        respond(['ok'=>true]);
    }
    if ($route === 'download') {
        $path = userPath($user, cleanPart((string)($_GET['path'] ?? '')));
        if (!is_file($path)) respond(['error'=>'Plik nie istnieje.'], 404);
        header('Content-Type: application/octet-stream'); header('Content-Length: ' . filesize($path)); header('Content-Disposition: attachment; filename="' . rawurlencode(basename($path)) . '"'); readfile($path); exit;
    }
    if ($route === 'users' && $user['role'] === 'admin') {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') respond(['users' => array_map('publicUser', readUsers())]);
        $body = requestBody(); $username = trim((string)($body['username'] ?? '')); $password = (string)($body['password'] ?? ''); $role = ($body['role'] ?? 'user') === 'admin' ? 'admin' : 'user';
        if (!preg_match('/^[a-zA-Z0-9_.-]{3,40}$/', $username) || strlen($password) < 4) respond(['error'=>'Login (3–40 znaków) i hasło (min. 4 znaki) są wymagane.'], 422);
        $users = readUsers(); foreach ($users as $existing) if (strcasecmp($existing['username'], $username) === 0) respond(['error'=>'Taki login już istnieje.'], 422);
        if ($role === 'admin') foreach ($users as &$existing) if ($existing['role'] === 'admin') $existing['enabled'] = false;
        $id = max(array_column($users, 'id')) + 1; $new = ['id'=>$id,'username'=>$username,'password'=>password_hash($password,PASSWORD_DEFAULT),'role'=>$role,'enabled'=>true,'created_at'=>date(DATE_ATOM)];
        $users[] = $new; saveUsers($users); makeHome($id); respond(['user'=>publicUser($new)], 201);
    }
    respond(['error' => 'Nie znaleziono zasobu.'], 404);
}
readUsers();
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/public/index.html');
