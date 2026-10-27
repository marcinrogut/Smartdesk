# SmartDesk — dokumentacja projektu

## Cel

SmartDesk to aplikacja internetowa imitująca prosty, prywatny pulpit użytkownika. Nie jest to zdalny komputer ani środowisko do uruchamiania programów. Jej zadaniem jest bezpieczne przechowywanie i organizacja plików w interfejsie przypominającym pulpit systemu operacyjnego.

Użytkownik widzi wyłącznie własne foldery i pliki, może wysyłać oraz pobierać pliki, tworzyć foldery i usuwać elementy. Nie może uruchamiać programów, wydawać poleceń systemowych ani uzyskać dostępu do katalogów innych osób.

## Stos technologiczny

- **Backend:** PHP 8.2+ w czystej architekturze — bez frameworka, z cienkimi endpointami.
- **Frontend:** Angular (standalone components, signals, `@if`/`@for`, lazy loading).
- **Baza danych:** MySQL / MariaDB przez PDO.
- **Przechowywanie plików:** lokalny dysk serwera (`storage/users/{id}`), za interfejsem `FileStorageInterface` umożliwiającym przyszłą implementację S3/MinIO.
- **Uwierzytelnianie:** własny JWT HS256, przekazywany w nagłówku `Authorization: Bearer` i przechowywany w `localStorage`.

## Struktura katalogów

```text
SmartDesk/
├── src/
│   ├── Domain/           # encje, value objecty, interfejsy repozytoriów, wyjątki domenowe
│   ├── Application/      # use case'y (handlery) i wyjątki aplikacyjne
│   ├── Infrastructure/   # PDO, migracje, magazyn plików
│   ├── Api/              # koperta odpowiedzi, JWT, middleware (CORS, auth)
│   └── bootstrap.php     # autoload, .env, auto-migracja
├── public/               # webroot: tylko endpointy API + zbudowany Angular
│   └── api/v1/…          # cienkie endpointy wymagające bootstrapu
├── config/database.php   # konfiguracja połączenia z bazą (env)
├── database/schema.sql   # schemat tabeli users
├── storage/users/        # prywatne pliki użytkowników (poza public/)
├── tests/                # PHPUnit: Unit + Integration
├── frontend/             # aplikacja Angular (src/app/core, src/app/features)
└── .github/workflows/    # CI (build + testy) i deploy na FTP
```

Zasada: **logika biznesowa nie zna HTTP ani PDO**. Endpoint w `public/api/v1/` tylko odczytuje wejście, woła handler i serializuje wynik przez `ApiResponse`.

## Role i najważniejsza reguła administratora

Istnieją dwie role:

- `user` — korzysta wyłącznie z własnych plików;
- `admin` — tworzy konta i zarządza kontami.

W systemie może być tylko **jeden aktywny administrator**. Przy tworzeniu nowego konta administratora:

1. tworzone jest nowe konto z rolą `admin` i statusem aktywnym;
2. wszystkie poprzednie konta z rolą `admin` są wyłączane (`disableAdminsExcept`);
3. stan konta (`enabled`) jest sprawdzany przy każdym żądaniu, więc tokeny poprzedniego administratora natychmiast tracą ważność;
4. nowy administrator pozostaje jedynym aktywnym kontem administracyjnym.

Domyślne dane dla lokalnego środowiska demonstracyjnego:

```text
login: admin
hasło: admin
```

Konto zakładane automatycznie tylko wtedy, gdy w bazie nie ma żadnego użytkownika. W wersji produkcyjnej należy zmienić hasło zaraz po pierwszym logowaniu.

## Dane i katalogi użytkowników

```text
storage/users/{userId}/
├── Documents/
├── Pictures/
└── Downloads/
```

Ścieżka pochodząca z przeglądarki nigdy nie jest zaufana. Backend:

1. zamienia ją na value object `RelativePath`, który odrzuca segmenty `..`, `.`, puste segmenty, separatory i znaki NUL;
2. wyznacza katalog główny na podstawie `userId` z tokenu;
3. weryfikuje przez `realpath`, że wynikowa ścieżka fizyczna nadal znajduje się w katalogu właściciela (blokuje też wyjście przez dowiązania symboliczne).

Pliki nie są udostępniane bezpośrednio z katalogu publicznego — pobieranie przechodzi przez API, które sprawdza właściciela.

## Funkcje

### Użytkownik

- logowanie i wylogowanie;
- widok „Mój dysk”;
- lista plików i folderów z rozmiarem i datą modyfikacji;
- wejście do folderu oraz powrót przez breadcrumb;
- tworzenie folderu;
- wysyłanie pliku (z limitem rozmiaru);
- pobieranie pliku;
- usuwanie pliku i pustego folderu.

### Administrator

- lista kont (login, rola, status);
- tworzenie konta użytkownika lub administratora zgodnie z regułą jednego aktywnego administratora.

## Model danych

Tabela `users` (`database/schema.sql`):

```text
id
username (unique, 3–40 znaków)
password_hash
role: user | admin
enabled: boolean
created_at
updated_at
```

Struktura plików odczytywana jest wprost z dysku — tabela metadanych nie jest wymagana.

## API v1

Koperta odpowiedzi: `{ success, message, data, timestamp }`; błędy dodatkowo `errors` (mapa `pole → komunikat`).

```text
POST   /api/v1/auth/login.php      { username, password } -> { token, user }
POST   /api/v1/auth/refresh.php    -> { token }
GET    /api/v1/auth/me.php         -> { id, username, role, enabled }

GET    /api/v1/files/index.php     ?path=…  -> { path, items[] }
POST   /api/v1/files/folder.php    { path, name }
POST   /api/v1/files/upload.php    multipart: path, file
POST   /api/v1/files/delete.php    { path }
GET    /api/v1/files/download.php  ?path=…  (strumień binarny)

GET    /api/v1/users/index.php     admin
POST   /api/v1/users/create.php    admin: { username, password, role }
```

Wszystkie endpointy poza `auth/login.php` i `auth/refresh.php` wymagają nagłówka `Authorization: Bearer <token>`. Endpointy `/api/v1/users/*` dodatkowo wymagają roli `admin` (weryfikowanej po stronie backendu).

## Frontend — interfejs

```text
frontend/src/app/
├── core/                 # api-config, api.service, api-error, models, auth.service,
│                         # files.service, users.service, guards, http.interceptor
├── features/
│   ├── auth/login
│   ├── desktop           # menedżer plików
│   └── admin             # layout + użytkownicy
└── shared/format.ts      # formatowanie rozmiaru i daty
```

- `api.service.ts` odpakowuje kopertę API i zwraca samo `data`.
- `http.interceptor.ts` dokleja nagłówek Bearer, a przy `401` odświeża token i powtarza żądanie; błędy normalizuje do `ApiError`.
- `guards.ts` — `authGuard` (zalogowani) i `adminGuard` (tylko administrator).
- Trasy ładowane leniwie (`loadComponent`).

Frontend nie implementuje dostępu do systemu plików — wyłącznie komunikuje się z API.

## Zasady bezpieczeństwa

- HTTPS w środowisku produkcyjnym.
- Hasła wyłącznie przez `password_hash` / `password_verify`.
- Autoryzacja każdego działania na plikach po stronie backendu (właściciel z tokenu).
- Katalog prywatny użytkowników poza webrootem.
- Limit rozmiaru wysyłanych plików (`SMARTDESK_MAX_UPLOAD_BYTES`).
- CORS kontrolowany zmienną `API_ALLOWED_ORIGINS`.
- `API_SECRET` utrzymywany wyłącznie w `.env` na serwerze (nie w repozytorium).
- Testy reguły „nowy admin wyłącza poprzedniego administratora”.

## Stan wdrożenia

- Repozytorium: GitHub Actions — CI (`Angular build`, `PHP tests`) oraz deploy na FTP (`lftp mirror`).
- Produkcja: `https://smartdesk.rogut.net/` — webroot `public_html` (API + Angular), kod aplikacji w katalogu projektu.
- `.env` nie jest wgrywany; wymaga jednorazowego utworzenia na serwerze (dane bazy oraz `API_SECRET`) i praw zapisu dla `storage/users`.
