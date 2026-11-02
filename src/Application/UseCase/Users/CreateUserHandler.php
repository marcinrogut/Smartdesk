<?php

declare(strict_types=1);

namespace SmartDesk\Application\UseCase\Users;

use SmartDesk\Application\Exception\ValidationException;
use SmartDesk\Domain\Entity\User;
use SmartDesk\Domain\Repository\FileStorageInterface;
use SmartDesk\Domain\Repository\UserRepositoryInterface;
use SmartDesk\Domain\ValueObject\UserRole;

/**
 * Tworzy konto użytkownika.
 *
 * Dla roli admin wymusza regułę jednego aktywnego administratora: nowe konto
 * zostaje aktywne, a wszystkie poprzednie konta admin są wyłączane (co przy
 * weryfikacji stanu konta przy każdym żądaniu unieważnia też ich tokeny).
 */
final class CreateUserHandler
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly FileStorageInterface $storage,
    ) {
    }

    /**
     * @return array{id:int,username:string,role:string,enabled:bool}
     */
    public function handle(string $username, string $password, UserRole $role): array
    {
        $username = trim($username);
        $errors = [];

        if (preg_match('/^[a-zA-Z0-9_.-]{3,40}$/', $username) !== 1) {
            $errors['username'] = 'Login musi mieć 3–40 znaków (litery, cyfry, . _ -).';
        }

        if (strlen($password) < 4) {
            $errors['password'] = 'Hasło musi mieć co najmniej 4 znaki.';
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        if ($this->users->findByUsername($username) instanceof User) {
            throw ValidationException::single('username', 'Taki login już istnieje.');
        }

        $user = $this->users->create($username, $password, $role, true);

        if ($role === UserRole::Admin) {
            $this->users->disableAdminsExcept($user->id);
        }

        $this->storage->ensureHome($user->id);

        return $user->toArray();
    }
}
