<?php

declare(strict_types=1);

use SmartDesk\Api\ApiResponse;
use SmartDesk\Api\Middleware\ApiAuth;
use SmartDesk\Api\Middleware\Cors;
use SmartDesk\Application\Exception\ValidationException;
use SmartDesk\Application\UseCase\Files\CreateFolderHandler;
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
    $parent = RelativePath::fromString(is_string($input['path'] ?? null) ? $input['path'] : null);
    $name = (string) ($input['name'] ?? '');

    (new CreateFolderHandler(LocalFileStorage::fromEnvironment()))->handle($user->id, $parent, $name);

    ApiResponse::success(null, 'Folder utworzony.', 201);
} catch (InvalidPathException) {
    ApiResponse::error('Nieprawidłowa ścieżka.', 422, ['path' => 'Nieprawidłowa ścieżka.']);
} catch (ValidationException $exception) {
    ApiResponse::error($exception->getMessage(), 422, $exception->errors);
} catch (Throwable $exception) {
    error_log('Create folder error: ' . $exception->getMessage());
    ApiResponse::serverError($exception);
}
