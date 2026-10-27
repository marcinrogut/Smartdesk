<?php

declare(strict_types=1);

/**
 * Konfiguracja bazy danych.
 * Plik trzymany poza katalogiem publicznym (public/).
 *
 * Wszystkie dane dostępowe pochodzą ze zmiennych środowiskowych (.env / .env.local):
 *   SMARTDESK_DB_HOST, SMARTDESK_DB_NAME, SMARTDESK_DB_USER,
 *   SMARTDESK_DB_PASS, SMARTDESK_DB_CHARSET
 */
return [
    'host'     => getenv('SMARTDESK_DB_HOST') ?: '127.0.0.1',
    'database' => getenv('SMARTDESK_DB_NAME') ?: 'smartdesk',
    'username' => getenv('SMARTDESK_DB_USER') ?: 'smartdesk',
    'password' => getenv('SMARTDESK_DB_PASS') !== false
        ? (string) getenv('SMARTDESK_DB_PASS')
        : '',
    'charset'  => getenv('SMARTDESK_DB_CHARSET') ?: 'utf8mb4',
];
