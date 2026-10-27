# SmartDesk

Prywatny pulpit plików: każdy użytkownik dostaje własny, odizolowany katalog z folderami `Documents`, `Pictures` i `Downloads`, w którym może tworzyć foldery, wysyłać, pobierać i usuwać pliki.

Backend to **czysta architektura PHP (bez frameworka)** — warstwy Domain / Application / Infrastructure / Api z cienkimi endpointami w `public/api/v1/`. Frontend to **Angular** (standalone components, signals, lazy loading). Uwierzytelnianie: **JWT HS256 (Bearer)**.

## Struktura

```text
SmartDesk/
├── src/                  # backend: Domain, Application, Infrastructure, Api
├── public/               # webroot: endpointy API + zbudowany Angular (deploy)
├── config/database.php   # konfiguracja PDO z .env
├── database/schema.sql   # schemat tabeli users
├── storage/users/        # prywatne pliki użytkowników (poza public/)
├── tests/                # PHPUnit: Unit + Integration
├── frontend/             # aplikacja Angular
├── docs/                 # dokumentacja projektu
└── .github/workflows/    # CI + deploy na FTP
```

## Wymagania

- PHP >= 8.2 (rozszerzenia: `pdo_mysql`, `mbstring`, `json`)
- Composer
- Node.js 22 + npm
- MySQL / MariaDB

## Uruchomienie lokalne

1. Zależności:

   ```powershell
   composer install
   ```

2. Konfiguracja:

   ```powershell
   Copy-Item .env.example .env
   ```

   Uzupełnij `API_SECRET` (długi, losowy ciąg) oraz dane bazy `SMARTDESK_DB_*`. Tabela `users` tworzy się automatycznie przy pierwszym żądaniu HTTP; ręcznie można użyć `database/schema.sql`.

3. Backend (API) na porcie 8000:

   ```powershell
   php -S localhost:8000 -t public
   ```

   Domyślne konto administracyjne tworzone przy pierwszym starcie: **admin / admin**.

4. Frontend:

   ```powershell
   cd frontend
   npm install
   npm start
   ```

   Aplikacja działa na `http://localhost:4200`, a żądania `/api/**` są proxowane do `http://localhost:8000` (plik `frontend/proxy.conf.json`).

Utworzenie nowego konta z rolą administratora automatycznie wyłącza poprzednie konto admin (w systemie może istnieć tylko jeden aktywny administrator; stan konta jest sprawdzany przy każdym żądaniu, więc tokeny poprzedniego admina natychmiast tracą ważność).

## Jakość kodu i testy

```powershell
composer check      # lint + phpstan + phpcs + audit
composer test       # PHPUnit (Unit + Integration)
```

W katalogu `frontend/`:

```powershell
npm run build       # produkcyjny build (dist/angular)
npm test            # testy jednostkowe (vitest)
```

## API v1

Wszystkie endpointy poza logowaniem wymagają nagłówka `Authorization: Bearer <token>`.

```text
POST   /api/v1/auth/login.php      # { username, password } -> { token, user }
POST   /api/v1/auth/refresh.php    # -> { token }
GET    /api/v1/auth/me.php         # -> { id, username, role, enabled }

GET    /api/v1/files/index.php     # ?path=...  -> { path, items[] }
POST   /api/v1/files/folder.php    # { path, name }
POST   /api/v1/files/upload.php    # multipart: path, file
POST   /api/v1/files/delete.php    # { path }
GET    /api/v1/files/download.php  # ?path=...  (plik binarny)

GET    /api/v1/users/index.php     # admin: lista kont
POST   /api/v1/users/create.php    # admin: { username, password, role }
```

Odpowiedzi mają wspólną kopertę: `{ success, message, data, timestamp }` (błędy dodatkowo `errors`).

## Bezpieczeństwo

- Hasła przez `password_hash` / `password_verify`.
- Ścieżki plików walidowane dwupoziomowo: `RelativePath` (odrzuca `..`, separatory i znaki NUL) oraz `LocalFileStorage` (`realpath` — blokada wyjścia poza katalog właściciela, także przez dowiązania symboliczne).
- Pliki użytkowników leżą w `storage/users/{id}` poza katalogiem publicznym; pobieranie przechodzi przez API weryfikujące właściciela.
- Limit rozmiaru wysyłanego pliku (`SMARTDESK_MAX_UPLOAD_BYTES`, domyślnie 25 MB).
- HTTPS oraz CORS (`API_ALLOWED_ORIGINS`) w środowisku produkcyjnym.

## Wdrożenie

Deploy odbywa się z GitHub Actions na FTP (`lftp mirror`): zawartość `public/` (API + zbudowany Angular) trafia do webroota `public_html`, a `src/`, `config/`, `database/`, `storage/`, `vendor/` i `composer.json` do katalogu projektu. Plik `.env` nie jest wysyłany — jest utrzymywany na serwerze (workflow dopisuje jedynie `API_SECRET`, jeśli go brakuje).

Szczegóły architektury i wymagań: [docs/SMARTDESK_SPECYFIKACJA.md](docs/SMARTDESK_SPECYFIKACJA.md).
