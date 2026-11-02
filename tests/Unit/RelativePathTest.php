<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use SmartDesk\Domain\Exception\InvalidPathException;
use SmartDesk\Domain\ValueObject\RelativePath;

final class RelativePathTest extends TestCase
{
    public function testEmptyInputBecomesRoot(): void
    {
        $this->assertTrue(RelativePath::fromString(null)->isEmpty());
        $this->assertTrue(RelativePath::fromString('   ')->isEmpty());
        $this->assertTrue(RelativePath::fromString('/Documents/')->isEmpty() === false);
    }

    public function testNormalizesSeparatorsAndTrimsSlashes(): void
    {
        $path = RelativePath::fromString('\\Documents//Pictures/');

        $this->assertSame('Documents/Pictures', $path->value());
    }

    public function testRejectsParentTraversal(): void
    {
        $this->expectException(InvalidPathException::class);

        RelativePath::fromString('Documents/../../etc/passwd');
    }

    public function testSegmentRejectsSlashes(): void
    {
        $this->expectException(InvalidPathException::class);

        RelativePath::segment('nested/name');
    }

    public function testSegmentRejectsNullByte(): void
    {
        $this->expectException(InvalidPathException::class);

        RelativePath::segment("bad\0name");
    }

    public function testAppendParentAndBasename(): void
    {
        $path = RelativePath::root()
            ->append(RelativePath::segment('Documents'))
            ->append(RelativePath::segment('notes.txt'));

        $this->assertSame('Documents/notes.txt', $path->value());
        $this->assertSame('notes.txt', $path->basename());
        $this->assertSame('Documents', $path->parent()->value());
    }

    public function testParentOfTopLevelSegmentIsRoot(): void
    {
        $this->assertTrue(RelativePath::segment('Documents')->parent()->isEmpty());
    }
}
