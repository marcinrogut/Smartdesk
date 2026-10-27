<?php

declare(strict_types=1);

namespace SmartDesk\Application\UseCase\Files;

use SmartDesk\Application\Exception\ValidationException;
use SmartDesk\Domain\Exception\InvalidPathException;
use SmartDesk\Domain\Repository\FileStorageInterface;
use SmartDesk\Domain\ValueObject\RelativePath;

/** Zapisuje przesłany plik w katalogu użytkownika, pilnując limitu rozmiaru. */
final class UploadFileHandler
{
    public function __construct(
        private readonly FileStorageInterface $storage,
        private readonly int $maxUploadBytes,
    ) {
    }

    /**
     * @return array{name:string,path:string}
     */
    public function handle(
        int $userId,
        RelativePath $directory,
        string $originalName,
        string $temporaryPath,
        int $size,
    ): array {
        if ($originalName === '') {
            throw ValidationException::single('file', 'Brak nazwy pliku.');
        }

        if ($size > $this->maxUploadBytes) {
            throw ValidationException::single(
                'file',
                sprintf('Plik przekracza limit %d MB.', intdiv($this->maxUploadBytes, 1048576)),
            );
        }

        try {
            $relative = $this->storage->storeUploadedFile($userId, $directory, $originalName, $temporaryPath);
        } catch (InvalidPathException) {
            throw ValidationException::single('file', 'Nieprawidłowa nazwa pliku.');
        }

        return [
            'name' => $relative->basename(),
            'path' => $relative->value(),
        ];
    }
}
