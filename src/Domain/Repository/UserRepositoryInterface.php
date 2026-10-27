<?php

declare(strict_types=1);

namespace SmartDesk\Domain\Repository;

use SmartDesk\Domain\Entity\User;
use SmartDesk\Domain\ValueObject\UserRole;

/** Kontrakt dostępu do kont użytkowników. */
interface UserRepositoryInterface
{
    public function findById(int $id): ?User;

    public function findByUsername(string $username): ?User;

    /**
     * @return list<User>
     */
    public function all(): array;

    /** Zwraca konto tylko wtedy, gdy login i hasło są poprawne. */
    public function verifyCredentials(string $username, string $password): ?User;

    public function create(string $username, string $plainPassword, UserRole $role, bool $enabled = true): User;

    /** Wyłącza wszystkie konta administratorów poza wskazanym (reguła jednego aktywnego admina). */
    public function disableAdminsExcept(int $userId): void;
}
