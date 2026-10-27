<?php

/**
 * Smartdesk - bootstrap aplikacji.
 *
 * Ładowany automatycznie przez Composer (autoload.files) oraz jawnie przez
 * cienkie endpointy w public/api/v1/. Odpowiada za: autoloader, zmienne
 * środowiskowe oraz automatyczną migrację schematu i konto domyślnego admina.
 */

declare(strict_types=1);

use SmartDesk\Infrastructure\Persistence\DatabaseConnection;
use SmartDesk\Infrastructure\Persistence\DatabaseInitializer;

if (defined('SMARTDESK_BOOTSTRAPPED')) {
    return;
}
define('SMARTDESK_BOOTSTRAPPED', true);

if (!defined('SMARTDESK_ROOT')) {
    define('SMARTDESK_ROOT', dirname(__DIR__));
}

require_once SMARTDESK_ROOT . '/vendor/autoload.php';

// Zmienne środowiskowe: .env.local (dev) ma pierwszeństwo przed .env (prod).
foreach (['/.env.local', '/.env'] as $envSuffix) {
    $envFile = SMARTDESK_ROOT . $envSuffix;
    if (!is_file($envFile)) {
        continue;
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        if (preg_match('~^["\'](.*)["\']$~', $value, $matches) === 1) {
            $value = $matches[1];
        }

        $_ENV[$key] = $value;
        putenv("$key=$value");
    }

    break;
}

// Automatyczna migracja schematu oraz konto domyślnego administratora.
// Wykonywane wyłącznie w kontekście HTTP (nie w CLI/testach).
if (PHP_SAPI !== 'cli') {
    try {
        $initializer = new DatabaseInitializer(DatabaseConnection::connect());
        $initializer->migrate();
        $initializer->ensureDefaultAdmin();
    } catch (Throwable) {
        // Brak bazy podczas pierwszego uruchomienia nie może wywalić całej aplikacji.
    }
}
