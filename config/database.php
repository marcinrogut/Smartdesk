<?php

declare(strict_types=1);

/**
 * Konfiguracja bazy danych.
 * Plik trzymany poza katalogiem publicznym (public/).
 *
 * Profil środowiska wybiera bootstrap: najpierw .env.local (dev), a gdy go nie
 * ma - .env (prod). Dane dostępowe pochodzą ze zmiennych środowiskowych:
 *   SMARTDESK_DB_HOST, SMARTDESK_DB_NAME, SMARTDESK_DB_USER,
 *   SMARTDESK_DB_PASS, SMARTDESK_DB_CHARSET
 *
 * Poniższe wartości domyślne to profil deweloperski - używane tylko wtedy,
 * gdy żaden plik env nie został wczytany.
 */
return [
    'host'     => getenv('SMARTDESK_DB_HOST') ?: '192.168.1.80',
    'database' => getenv('SMARTDESK_DB_NAME') ?: 'Smartdesk',
    'username' => getenv('SMARTDESK_DB_USER') ?: 'Smartdesk',
    'password' => getenv('SMARTDESK_DB_PASS') !== false
        ? (string) getenv('SMARTDESK_DB_PASS')
        : 'Smartdesk',
    'charset'  => getenv('SMARTDESK_DB_CHARSET') ?: 'utf8mb4',
];
