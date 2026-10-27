<?php

declare(strict_types=1);

use SmartDesk\Api\ApiResponse;
use SmartDesk\Api\Middleware\ApiAuth;
use SmartDesk\Api\Middleware\Cors;
use SmartDesk\Application\UseCase\Files\ListDirectoryHandler;
use SmartDesk\Domain\Exception\InvalidPathException;
use SmartDesk\Domain\ValueObject\RelativePath;
use SmartDesk\Infrastructure\Filesystem\LocalFileStorage;

require_once dirname(__DIR__, 4) . '/src/bootstrap.php';

Cors::handle();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ApiResponse::error('Method not allowed', 405);
    exit;
}

$user = ApiAuth::requireAuth();

try {
    $directory = RelativePath::fromString(is_string($_GET['path'] ?? null) ? $_GET['path'] : null);
    $handler = new ListDirectoryHandler(LocalFileStorage::fromEnvironment());

    ApiResponse::success($handler->handle($user->id, $directory), 'Zawartość katalogu.');
} catch (InvalidPathException) {
    ApiResponse::error('Nieprawidłowa ścieżka.', 422, ['path' => 'Nieprawidłowa ścieżka.']);
} catch (RuntimeException $exception) {
    if ($exception->getMessage() === 'DIRECTORY_NOT_FOUND') {
        ApiResponse::error('Folder nie istnieje.', 404);
        exit;
    }

    error_log('List files error: ' . $exception->getMessage());
    ApiResponse::serverError($exception);
}
