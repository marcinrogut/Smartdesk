<?php

declare(strict_types=1);

use SmartDesk\Api\ApiResponse;
use SmartDesk\Api\Middleware\ApiAuth;
use SmartDesk\Api\Middleware\Cors;
use SmartDesk\Application\Exception\ValidationException;
use SmartDesk\Application\UseCase\Users\CreateUserHandler;
use SmartDesk\Domain\ValueObject\UserRole;
use SmartDesk\Infrastructure\Filesystem\LocalFileStorage;
use SmartDesk\Infrastructure\Persistence\DatabaseConnection;
use SmartDesk\Infrastructure\Persistence\PdoUserRepository;

require_once dirname(__DIR__, 4) . '/src/bootstrap.php';

Cors::handle();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ApiResponse::error('Method not allowed', 405);
    exit;
}

ApiAuth::requireAdmin();

$input = json_decode((string) file_get_contents('php://input'), true);
$input = is_array($input) ? $input : [];

try {
    $handler = new CreateUserHandler(
        new PdoUserRepository(DatabaseConnection::connect()),
        LocalFileStorage::fromEnvironment(),
    );

    $user = $handler->handle(
        (string) ($input['username'] ?? ''),
        (string) ($input['password'] ?? ''),
        UserRole::fromMixed($input['role'] ?? null),
    );

    ApiResponse::success($user, 'Konto utworzone.', 201);
} catch (ValidationException $exception) {
    ApiResponse::error($exception->getMessage(), 422, $exception->errors);
} catch (Throwable $exception) {
    error_log('Create user error: ' . $exception->getMessage());
    ApiResponse::error('Błąd serwera.', 500);
}
