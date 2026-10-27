<?php

declare(strict_types=1);

namespace SmartDesk\Api\Middleware;

/**
 * Nagłówki CORS na podstawie allowlisty z API_ALLOWED_ORIGINS (lista rozdzielona
 * przecinkami). Domyślnie brak nagłówków — przy deployu same-origin (SPA i API
 * na tej samej domenie) CORS nie jest wymagany.
 */
final class Cors
{
    public static function handle(): void
    {
        $allowed = self::allowedOrigins();
        $requestOrigin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');

        if ($requestOrigin !== '' && in_array($requestOrigin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $requestOrigin);
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            header('Access-Control-Max-Age: 86400');
        }

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    /**
     * @return list<string>
     */
    private static function allowedOrigins(): array
    {
        $raw = (string) ($_ENV['API_ALLOWED_ORIGINS'] ?? getenv('API_ALLOWED_ORIGINS') ?: '');
        if ($raw === '') {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', $raw))));
    }
}
