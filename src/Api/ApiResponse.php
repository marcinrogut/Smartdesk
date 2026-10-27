<?php

declare(strict_types=1);

namespace SmartDesk\Api;

/** Wspólna koperta odpowiedzi API v1. */
final class ApiResponse
{
    public static function success(mixed $data = null, string $message = 'OK', int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('c'),
        ], JSON_UNESCAPED_UNICODE);
    }

    /**
     * @param array<string, string>|null $errors
     */
    public static function error(string $message, int $statusCode = 400, ?array $errors = null): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        $response = [
            'success' => false,
            'message' => $message,
            'data' => null,
            'timestamp' => date('c'),
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE);
    }
}
