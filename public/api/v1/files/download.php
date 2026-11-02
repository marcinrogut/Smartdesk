<?php

declare(strict_types=1);

use SmartDesk\Api\ApiResponse;
use SmartDesk\Api\Middleware\ApiAuth;
use SmartDesk\Api\Middleware\Cors;
use SmartDesk\Application\UseCase\Files\DownloadFileHandler;
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
    $path = RelativePath::fromString(is_string($_GET['path'] ?? null) ? $_GET['path'] : null);

    if ($path->isEmpty()) {
        ApiResponse::error('Nieprawidłowa ścieżka.', 422, ['path' => 'Nie wskazano pliku.']);
        exit;
    }

    $absolute = (new DownloadFileHandler(LocalFileStorage::fromEnvironment()))->handle($user->id, $path);

    header('Content-Type: application/octet-stream');
    header('Content-Length: ' . filesize($absolute));
    header('Content-Disposition: attachment; filename="' . rawurlencode(basename($absolute)) . '"');
    header('X-Content-Type-Options: nosniff');

    readfile($absolute);
} catch (InvalidPathException) {
    ApiResponse::error('Nieprawidłowa ścieżka.', 422, ['path' => 'Nieprawidłowa ścieżka.']);
} catch (Throwable $exception) {
    if ($exception->getMessage() === 'NOT_FOUND') {
        ApiResponse::error('Plik nie istnieje.', 404);
        exit;
    }

    error_log('Download error: ' . $exception->getMessage());
    ApiResponse::serverError($exception);
}
