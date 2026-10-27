<?php

declare(strict_types=1);

namespace SmartDesk\Api\Middleware;

use RuntimeException;
use SmartDesk\Api\ApiResponse;
use SmartDesk\Api\TokenService;
use SmartDesk\Domain\Entity\User;
use SmartDesk\Infrastructure\Persistence\DatabaseConnection;
use SmartDesk\Infrastructure\Persistence\PdoUserRepository;

/**
 * Weryfikacja tokenu Bearer i ról dla endpointów API.
 * Stan konta sprawdzany jest w bazie przy każdym żądaniu, więc wyłączenie
 * użytkownika natychmiast unieważnia jego token.
 */
final class ApiAuth
{
    private static ?TokenService $tokenService = null;
    private static ?User $currentUser = null;

    public static function requireAuth(): User
    {
        if (self::$currentUser instanceof User) {
            return self::$currentUser;
        }

        $service = self::tokenService();
        $token = self::bearerToken();

        if ($token === null) {
            self::fail(401, 'Brak tokenu autoryzacji.');
        }

        $payload = $service->verify($token);
        if ($payload === null) {
            self::fail(401, 'Nieprawidłowy lub wygasły token.');
        }

        $repository = new PdoUserRepository(DatabaseConnection::connect());

        $userId = $payload['user_id'] ?? null;
        if (!is_int($userId) && !is_numeric($userId)) {
            self::fail(401, 'Nieprawidłowy lub wygasły token.');
        }

        $user = $repository->findById(is_int($userId) ? $userId : (int) $userId);

        if ($user === null) {
            self::fail(401, 'Nieprawidłowy lub wygasły token.');
        }

        if (!$user->enabled) {
            self::fail(403, 'Konto zostało wyłączone.');
        }

        self::$currentUser = $user;

        return $user;
    }

    public static function requireAdmin(): User
    {
        $user = self::requireAuth();

        if (!$user->isAdmin()) {
            self::fail(403, 'Brak uprawnień administratora.');
        }

        return $user;
    }

    public static function isAuthenticated(): bool
    {
        $token = self::bearerToken();
        if ($token === null) {
            return false;
        }

        try {
            return self::tokenService()->verify($token) !== null;
        } catch (RuntimeException) {
            return false;
        }
    }

    /** Reset stanu — używane wyłącznie w testach. */
    public static function reset(): void
    {
        self::$tokenService = null;
        self::$currentUser = null;
    }

    private static function tokenService(): TokenService
    {
        if (self::$tokenService === null) {
            try {
                self::$tokenService = new TokenService();
            } catch (RuntimeException) {
                self::fail(500, 'Uwierzytelnianie API nie jest skonfigurowane.');
            }
        }

        return self::$tokenService;
    }

    private static function bearerToken(): ?string
    {
        $header = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');

        if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches) === 1) {
            return trim($matches[1]);
        }

        return null;
    }

    private static function fail(int $statusCode, string $message): never
    {
        ApiResponse::error($message, $statusCode);
        exit;
    }
}
