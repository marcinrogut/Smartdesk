<?php

declare(strict_types=1);

namespace SmartDesk\Api;

/**
 * Tryb pracy aplikacji odczytywany ze zmiennej APP_ENV.
 * Brak konfiguracji traktowany jest jako "production", więc domyślnie
 * szczegóły błędów nie są ujawniane.
 */
final class Environment
{
    public static function isDevelopment(): bool
    {
        $value = $_ENV['APP_ENV'] ?? getenv('APP_ENV');

        return strtolower(trim((string) $value)) === 'development';
    }
}
