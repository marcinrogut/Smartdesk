<?php

declare(strict_types=1);

namespace Tests\Integration;

use PHPUnit\Framework\TestCase;
use SmartDesk\Domain\Entity\FileEntry;
use SmartDesk\Domain\Exception\InvalidPathException;
use SmartDesk\Domain\ValueObject\FileEntryType;
use SmartDesk\Domain\ValueObject\RelativePath;
use SmartDesk\Infrastructure\Filesystem\LocalFileStorage;

final class LocalFileStorageTest extends TestCase
{
    private string $basePath;
    private LocalFileStorage $storage;

    protected function setUp(): void
    {
        $this->basePath = sys_get_temp_dir() . '/smartdesk-test-' . uniqid('', true);
        mkdir($this->basePath, 0770, true);
        $this->storage = new LocalFileStorage($this->basePath);
    }

    protected function tearDown(): void
    {
        $this->removeDirectory($this->basePath);
    }

    public function testHomeContainsStandardFolders(): void
    {
        $this->storage->ensureHome(1);

        $names = array_map(static fn (FileEntry $entry): string => $entry->name, $this->storage->listDirectory(
            1,
            RelativePath::root(),
        ));

        $this->assertSame(['Documents', 'Downloads', 'Pictures'], $names);
    }

    public function testCreatesAndListsNestedFolder(): void
    {
        $this->storage->ensureHome(1);
        $this->storage->createDirectory(1, RelativePath::fromString('Documents/Reports'));

        $entries = $this->storage->listDirectory(1, RelativePath::fromString('Documents'));

        $this->assertCount(1, $entries);
        $this->assertSame('Reports', $entries[0]->name);
        $this->assertSame(FileEntryType::Folder, $entries[0]->type);
    }

    public function testStorageOfOneUserIsIsolatedFromAnother(): void
    {
        $this->storage->ensureHome(1);
        $this->storage->ensureHome(2);
        $this->storage->createDirectory(1, RelativePath::fromString('Documents/Private'));

        $entries = $this->storage->listDirectory(2, RelativePath::fromString('Documents'));

        $this->assertSame([], $entries);
    }

    public function testTraversalOutsideHomeIsRejected(): void
    {
        $this->storage->ensureHome(1);

        $this->expectException(InvalidPathException::class);

        $this->storage->resolveFile(1, RelativePath::segment('..'));
    }

    public function testDeleteOnlyRemovesEmptyDirectory(): void
    {
        $this->storage->ensureHome(1);
        $this->storage->createDirectory(1, RelativePath::fromString('Documents/Reports'));

        $this->storage->delete(1, RelativePath::fromString('Documents/Reports'));

        $this->expectException(\RuntimeException::class);

        $this->storage->delete(1, RelativePath::fromString('Documents/NotThere'));
    }

    private function removeDirectory(string $directory): void
    {
        if (!is_dir($directory)) {
            return;
        }

        foreach (scandir($directory) ?: [] as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $directory . DIRECTORY_SEPARATOR . $item;
            is_dir($path) ? $this->removeDirectory($path) : unlink($path);
        }

        rmdir($directory);
    }
}
