<?php

declare(strict_types=1);

use SmartDesk\Api\ApiResponse;
use SmartDesk\Api\Middleware\Cors;
use SmartDesk\Api\TokenService;
use SmartDesk\Application\UseCase\Auth\LoginHandler;
use SmartDesk\Domain\Exception\AuthenticationException;
use SmartDesk\Infrastructure\Persistence\DatabaseConnection;
use SmartDesk\Infrastructure\Persistence\PdoUserRepository;

require_once dirname(__DIR__, 4) . '/src/bootstrap.php';

Cors::handle();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ApiResponse::error('Method not allowed', 405);
    exit;
}

$input = json_decode((string) file_get_contents('php://input'), true);
$input = is_array($input) ? $input : [];

$username = trim((string) ($input['username'] ?? ''));
$password = (string) ($input['password'] ?? '');

$errors = [];
if ($username === '') {
    $errors['username'] = 'Login jest wymagany.';
}
if ($password === '') {
    $errors['password'] = 'Hasło jest wymagane.';
}
if ($errors !== []) {
    ApiResponse::error('Validation failed', 400, $errors);
    exit;
}

try {
    $handler = new LoginHandler(
        new PdoUserRepository(DatabaseConnection::connect()),
        new TokenService(),
    );

    ApiResponse::success($handler->handle($username, $password), 'Zalogowano.');
} catch (AuthenticationException $exception) {
    if ($exception->reason === AuthenticationException::REASON_ACCOUNT_DISABLED) {
        ApiResponse::error('Konto zostało wyłączone.', 403);
        exit;
    }

    ApiResponse::error('Nieprawidłowy login lub hasło.', 401);
} catch (Throwable $exception) {
    error_log('Login error: ' . $exception->getMessage());
    ApiResponse::error('Błąd serwera.', 500);
}
