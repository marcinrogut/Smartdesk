<?php

declare(strict_types=1);

namespace SmartDesk\Infrastructure\Filesystem;

use RuntimeException;
use SmartDesk\Domain\Entity\FileEntry;
use SmartDesk\Domain\Exception\InvalidPathException;
use SmartDesk\Domain\Repository\FileStorageInterface;
use SmartDesk\Domain\ValueObject\FileEntryType;
use SmartDesk\Domain\ValueObject\RelativePath;

/**
 * Prywatny magazyn plików na lokalnym dysku serwera.
 *
 * Każdy użytkownik ma izolowany katalog <base>/<userId>/. Każda operacja
 * waliduje, że wynikowa ścieżka fizyczna nadal znajduje się wewnątrz katalogu
 * właściciela, co blokuje wyjście poza niego (także przez dowiązania symboliczne).
 */
final class LocalFileStorage implements FileStorageInterface
{
    /** @var list<string> */
    private const HOME_FOLDERS = ['Documents', 'Pictures', 'Downloads'];

    public function __construct(private readonly string $basePath)
    {
    }

    public static function fromEnvironment(): self
    {
        $configured = (string) ($_ENV['SMARTDESK_STORAGE_PATH'] ?? getenv('SMARTDESK_STORAGE_PATH') ?: '');
        $basePath = $configured !== '' ? $configured : SMARTDESK_ROOT . '/storage/users';

        return new self(rtrim($basePath, '/\\'));
    }

    public function ensureHome(int $userId): void
    {
        $home = $this->userRoot($userId);

        if (!is_dir($home) && !mkdir($home, 0770, true) && !is_dir($home)) {
            throw new RuntimeException('Nie udało się utworzyć katalogu użytkownika.');
        }

        foreach (self::HOME_FOLDERS as $folder) {
            $path = $home . DIRECTORY_SEPARATOR . $folder;
            if (!is_dir($path) && !mkdir($path, 0770) && !is_dir($path)) {
                throw new RuntimeException('Nie udało się utworzyć katalogu domowego użytkownika.');
            }
        }
    }

    public function listDirectory(int $userId, RelativePath $directory): array
    {
        $absolute = $this->existingDirectory($userId, $directory);

        $entries = [];
        foreach (scandir($absolute) ?: [] as $name) {
            if ($name === '.' || $name === '..') {
                continue;
            }

            $item = $absolute . DIRECTORY_SEPARATOR . $name;
            $isDirectory = is_dir($item);
            $entries[] = new FileEntry(
                $name,
                $isDirectory ? FileEntryType::Folder : FileEntryType::File,
                $isDirectory ? null : (int) filesize($item),
                (int) filemtime($item),
            );
        }

        usort($entries, static function (FileEntry $left, FileEntry $right): int {
            if ($left->type !== $right->type) {
                return $left->type === FileEntryType::Folder ? -1 : 1;
            }

            return strcasecmp($left->name, $right->name);
        });

        return $entries;
    }

    public function createDirectory(int $userId, RelativePath $directory): void
    {
        $this->ensureHome($userId);
        $absolute = $this->absolutePath($userId, $directory);
        $this->assertWithinHome($userId, $absolute);

        if (file_exists($absolute)) {
            throw new RuntimeException('ELEMENT_EXISTS');
        }

        if (!is_dir(dirname($absolute))) {
            throw new RuntimeException('PARENT_NOT_FOUND');
        }

        if (!mkdir($absolute, 0770)) {
            throw new RuntimeException('Nie udało się utworzyć folderu.');
        }
    }

    public function storeUploadedFile(
        int $userId,
        RelativePath $directory,
        string $originalName,
        string $temporaryPath,
    ): RelativePath {
        $target = $this->existingDirectory($userId, $directory);

        $name = basename(str_replace('\\', '/', $originalName));
        $relative = $directory->append(RelativePath::segment($name));
        $destination = $target . DIRECTORY_SEPARATOR . $name;

        if (!move_uploaded_file($temporaryPath, $destination)) {
            throw new RuntimeException('Nie udało się zapisać przesłanego pliku.');
        }

        return $relative;
    }

    public function delete(int $userId, RelativePath $path): void
    {
        if ($path->isEmpty()) {
            throw new RuntimeException('NOT_FOUND');
        }

        $absolute = $this->absolutePath($userId, $path);
        $this->assertWithinHome($userId, $absolute);

        if (is_dir($absolute)) {
            $children = scandir($absolute) ?: [];
            if (count($children) > 2) {
                throw new RuntimeException('DIRECTORY_NOT_EMPTY');
            }
            if (!rmdir($absolute)) {
                throw new RuntimeException('Nie udało się usunąć folderu.');
            }

            return;
        }

        if (!is_file($absolute) || !unlink($absolute)) {
            throw new RuntimeException('NOT_FOUND');
        }
    }

    public function resolveFile(int $userId, RelativePath $path): string
    {
        if ($path->isEmpty()) {
            throw new RuntimeException('NOT_FOUND');
        }

        $absolute = $this->absolutePath($userId, $path);
        $this->assertWithinHome($userId, $absolute);

        if (!is_file($absolute)) {
            throw new RuntimeException('NOT_FOUND');
        }

        return $absolute;
    }

    private function existingDirectory(int $userId, RelativePath $directory): string
    {
        $this->ensureHome($userId);
        $absolute = $this->absolutePath($userId, $directory);
        $this->assertWithinHome($userId, $absolute);

        if (!is_dir($absolute)) {
            throw new RuntimeException('DIRECTORY_NOT_FOUND');
        }

        return $absolute;
    }

    private function userRoot(int $userId): string
    {
        return $this->basePath . DIRECTORY_SEPARATOR . $userId;
    }

    private function absolutePath(int $userId, RelativePath $path): string
    {
        $root = $this->userRoot($userId);

        return $path->isEmpty() ? $root : $root . DIRECTORY_SEPARATOR . $path->value();
    }

    private function assertWithinHome(int $userId, string $absolute): void
    {
        $realRoot = realpath($this->userRoot($userId));
        if ($realRoot === false) {
            throw new RuntimeException('Katalog użytkownika nie istnieje.');
        }

        $realTarget = realpath($absolute);
        if ($realTarget === false) {
            $realParent = realpath(dirname($absolute));

            if ($realParent === false || !$this->isInside($realRoot, $realParent)) {
                throw InvalidPathException::forValue($absolute);
            }

            return;
        }

        if (!$this->isInside($realRoot, $realTarget)) {
            throw InvalidPathException::forValue($absolute);
        }
    }

    private function isInside(string $root, string $candidate): bool
    {
        return $candidate === $root || str_starts_with($candidate, $root . DIRECTORY_SEPARATOR);
    }
}
