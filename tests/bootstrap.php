<?php

declare(strict_types=1);

/**
 * Bootstrap PHPUnit — ładuje autoloader Composer (który uruchamia też src/bootstrap.php).
 */

require __DIR__ . '/../vendor/autoload.php';

define('TESTS_DIR', __DIR__);

if (!defined('TESTING')) {
    define('TESTING', true);
}
