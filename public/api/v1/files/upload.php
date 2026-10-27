<?php

declare(strict_types=1);

use SmartDesk\Api\ApiResponse;
use SmartDesk\Api\Middleware\ApiAuth;
use SmartDesk\Api\Middleware\Cors;
use SmartDesk\Application\Exception\ValidationException;
use SmartDesk\Application\UseCase\Files\UploadFileHandler;
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

$file = $_FILES['file'] ?? null;

if (!is_array($file) || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    ApiResponse::error('Przesłanie pliku nie powiodło się.', 422, ['file' => 'Nie udało się odebrać pliku.']);
    exit;
}

$maxUploadBytes = (int) ($_ENV['SMARTDESK_MAX_UPLOAD_BYTES'] ?? getenv('SMARTDESK_MAX_UPLOAD_BYTES') ?: 26214400);

try {
    $directory = RelativePath::fromString(is_string($_POST['path'] ?? null) ? $_POST['path'] : null);

    $handler = new UploadFileHandler(LocalFileStorage::fromEnvironment(), $maxUploadBytes);

    $result = $handler->handle(
        $user->id,
        $directory,
        (string) ($file['name'] ?? ''),
        (string) ($file['tmp_name'] ?? ''),
        (int) ($file['size'] ?? 0),
    );

    ApiResponse::success($result, 'Plik przesłany.', 201);
} catch (InvalidPathException) {
    ApiResponse::error('Nieprawidłowa ścieżka.', 422, ['path' => 'Nieprawidłowa ścieżka.']);
} catch (ValidationException $exception) {
    ApiResponse::error($exception->getMessage(), 422, $exception->errors);
} catch (Throwable $exception) {
    error_log('Upload error: ' . $exception->getMessage());
    ApiResponse::error('Błąd serwera.', 500);
}
