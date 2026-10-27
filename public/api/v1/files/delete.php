<?php

declare(strict_types=1);

use SmartDesk\Api\ApiResponse;
use SmartDesk\Api\Middleware\ApiAuth;
use SmartDesk\Api\Middleware\Cors;
use SmartDesk\Application\Exception\ValidationException;
use SmartDesk\Application\UseCase\Files\DeleteEntryHandler;
use SmartDesk\Domain\Exception\InvalidPathException;
use SmartDesk\Domain\ValueObject\RelativePath;
use SmartDesk\Infrastructure\Filesystem\LocalFileStorage;

require_once dirname(__DIR__, 4) . '/src/bootstrap.php';

Cors::handle();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ApiResponse::error('Method not allowed', 405);
    exit;
}

$user = ApiAuth::requireAuth();

$input = json_decode((string) file_get_contents('php://input'), true);
$input = is_array($input) ? $input : [];

try {
    $path = RelativePath::fromString(is_string($input['path'] ?? null) ? $input['path'] : null);

    if ($path->isEmpty()) {
        ApiResponse::error('Nieprawidłowa ścieżka.', 422, ['path' => 'Nie wskazano elementu.']);
        exit;
    }

    (new DeleteEntryHandler(LocalFileStorage::fromEnvironment()))->handle($user->id, $path);

    ApiResponse::success(null, 'Element usunięty.');
} catch (InvalidPathException) {
    ApiResponse::error('Nieprawidłowa ścieżka.', 422, ['path' => 'Nieprawidłowa ścieżka.']);
} catch (ValidationException $exception) {
    ApiResponse::error($exception->getMessage(), 422, $exception->errors);
} catch (Throwable $exception) {
    if ($exception->getMessage() === 'NOT_FOUND') {
        ApiResponse::error('Element nie istnieje.', 404);
        exit;
    }

    error_log('Delete error: ' . $exception->getMessage());
    ApiResponse::error('Błąd serwera.', 500);
}
