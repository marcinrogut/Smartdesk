<?php

declare(strict_types=1);

use SmartDesk\Api\ApiResponse;
use SmartDesk\Api\Middleware\ApiAuth;
use SmartDesk\Api\Middleware\Cors;
use SmartDesk\Application\UseCase\Users\ListUsersHandler;
use SmartDesk\Infrastructure\Persistence\DatabaseConnection;
use SmartDesk\Infrastructure\Persistence\PdoUserRepository;

require_once dirname(__DIR__, 4) . '/src/bootstrap.php';

Cors::handle();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ApiResponse::error('Method not allowed', 405);
    exit;
}

ApiAuth::requireAdmin();

try {
    $handler = new ListUsersHandler(new PdoUserRepository(DatabaseConnection::connect()));

    ApiResponse::success($handler->handle(), 'Lista użytkowników.');
} catch (Throwable $exception) {
    error_log('List users error: ' . $exception->getMessage());
    ApiResponse::serverError($exception);
}
