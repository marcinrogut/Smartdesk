<?php

declare(strict_types=1);

namespace SmartDesk\Application\UseCase\Files;

use SmartDesk\Domain\Entity\FileEntry;
use SmartDesk\Domain\Repository\FileStorageInterface;
use SmartDesk\Domain\ValueObject\RelativePath;

/** Zwraca zawartość katalogu użytkownika w formie gotowej do serializacji. */
final class ListDirectoryHandler
{
    public function __construct(private readonly FileStorageInterface $storage)
    {
    }

    /**
     * @return array{path:string,items:list<array{name:string,type:string,size:int|null,modified:string}>}
     */
    public function handle(int $userId, RelativePath $directory): array
    {
        $entries = $this->storage->listDirectory($userId, $directory);

        return [
            'path' => $directory->value(),
            'items' => array_map(
                static fn (FileEntry $entry): array => $entry->toArray(),
                $entries,
            ),
        ];
    }
}
