<?php

declare(strict_types=1);

namespace SmartDesk\Application\UseCase\Auth;

use SmartDesk\Api\TokenService;
use SmartDesk\Domain\Entity\User;
use SmartDesk\Domain\Exception\AuthenticationException;
use SmartDesk\Domain\Repository\UserRepositoryInterface;

/** Uwierzytelnienie użytkownika i wydanie tokenu Bearer. */
final class LoginHandler
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly TokenService $tokens,
    ) {
    }

    /**
     * @return array{token:string,user:array{id:int,username:string,role:string,enabled:bool}}
     * @throws AuthenticationException
     */
    public function handle(string $username, string $password): array
    {
        $user = $this->users->verifyCredentials($username, $password);

        if (!$user instanceof User) {
            throw AuthenticationException::invalidCredentials();
        }

        if (!$user->enabled) {
            throw AuthenticationException::accountDisabled();
        }

        return [
            'token' => $this->tokens->generate($user->id, $user->username, $user->role),
            'user' => $user->toArray(),
        ];
    }
}
