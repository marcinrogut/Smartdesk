<?php

declare(strict_types=1);

namespace SmartDesk\Application\UseCase\Users;

use SmartDesk\Domain\Entity\User;
use SmartDesk\Domain\Repository\UserRepositoryInterface;

/** Zwraca listę wszystkich kont (widok administratora). */
final class ListUsersHandler
{
    public function __construct(private readonly UserRepositoryInterface $users)
    {
    }

    /**
     * @return list<array{id:int,username:string,role:string,enabled:bool}>
     */
    public function handle(): array
    {
        return array_map(
            static fn (User $user): array => $user->toArray(),
            $this->users->all(),
        );
    }
}
