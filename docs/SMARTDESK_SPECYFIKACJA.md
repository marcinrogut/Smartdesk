# Smartdesk — dokumentacja projektu

## Cel

Smartdesk to aplikacja internetowa imitująca prosty, prywatny pulpit użytkownika. Nie jest to zdalny komputer ani środowisko do uruchamiania programów. Jej zadaniem jest bezpieczne przechowywanie i organizacja plików w interfejsie przypominającym pulpit systemu operacyjnego.

Użytkownik ma widzieć własne foldery i pliki, wysyłać oraz pobierać pliki, tworzyć foldery i usuwać elementy. Nie może uruchamiać programów, wydawać poleceń systemowych ani uzyskać dostępu do katalogów innych osób.

## Docelowy stos technologiczny

- **Backend:** PHP 8.3+ oraz Laravel.
- **Frontend:** Angular.
- **Baza danych:** MySQL lub MariaDB w środowisku produkcyjnym.
- **Przechowywanie plików:** lokalny dysk serwera na początku, docelowo opcjonalnie S3 lub MinIO.
- **Uwierzytelnianie:** Laravel Sanctum dla API używanego przez Angular.

Katalogi docelowe:

```text
Smartdesk/
├── laravel-api/       # API, logowanie, baza danych, uprawnienia i pliki
├── angular-web/       # interfejs użytkownika: pulpit i menedżer plików
└── docs/              # dokumentacja
```

## Role i najważniejsza reguła administratora

Istnieją dwie role:

- `user` — korzysta wyłącznie z własnych plików;
- `admin` — tworzy konta i zarządza kontami.

W systemie może być tylko **jeden aktywny administrator**. Przy tworzeniu nowego konta administratora należy:

1. utworzyć nowe konto z rolą `admin` i statusem aktywnym;
2. wyłączyć wszystkie poprzednie konta z rolą `admin`;
3. unieważnić sesje/tokenu poprzedniego administratora;
4. pozostawić nowego administratora jako jedyne aktywne konto administracyjne.

Domyślne dane dla lokalnego środowiska demonstracyjnego:

```text
login: admin
hasło: admin
```

W wersji produkcyjnej należy wymusić zmianę tego hasła przy pierwszym logowaniu.

## Dane i katalogi użytkowników

Każdy użytkownik otrzymuje prywatny katalog, na przykład:

```text
storage/app/private/users/{userId}/
├── Documents/
├── Pictures/
└── Downloads/
```

Ścieżka do pliku nigdy nie może być zaufana, jeżeli pochodzi wprost z przeglądarki. Backend wyznacza katalog główny na podstawie zalogowanego użytkownika. Należy blokować sekwencje typu `..`, ścieżki bezwzględne i dowolne próby wyjścia poza katalog właściciela.

Pliki nie mogą być udostępniane bezpośrednio z katalogu publicznego serwera. Pobieranie i podgląd przechodzą przez API, które weryfikuje właściciela.

## Funkcje pierwszej wersji

### Użytkownik

- logowanie i wylogowanie;
- widok pulpitu/mój dysk;
- lista plików i folderów;
- wejście do folderu oraz powrót do katalogu nadrzędnego;
- tworzenie folderu;
- wysyłanie pliku;
- pobieranie pliku;
- usuwanie pliku i pustego folderu;
- podstawowy podgląd obrazów, PDF i plików tekstowych — opcjonalnie po wersji pierwszej.

### Administrator

- lista kont;
- tworzenie zwykłego użytkownika;
- tworzenie nowego administratora zgodnie z regułą jednego aktywnego administratora;
- później: ręczne włączanie/wyłączanie kont i reset haseł.

## Proponowany model danych

Tabela `users` powinna zawierać co najmniej:

```text
id
name / username
email (opcjonalnie)
password
role: user | admin
is_enabled: boolean
created_at
updated_at
```

Tabela metadanych plików jest zalecana, choć na początku można odczytywać strukturę z dysku:

```text
id
user_id
parent_path
stored_name
original_name
mime_type
size_bytes
created_at
updated_at
```

## Szkic API Laravel

Wszystkie adresy poza logowaniem wymagają zalogowanego użytkownika.

```text
POST   /api/login
POST   /api/logout
GET    /api/me

GET    /api/files?path={relativePath}
POST   /api/folders
POST   /api/files/upload
GET    /api/files/download?path={relativePath}
DELETE /api/files

GET    /api/admin/users
POST   /api/admin/users
```

Endpointy `/api/admin/*` wymagają roli `admin`. Walidację roli należy wykonywać po stronie Laravel, niezależnie od tego, co pokaże Angular.

## Angular — interfejs

W Angularze warto podzielić aplikację na:

```text
core/
  auth.service.ts
  api.service.ts
  auth.guard.ts
features/
  login/
  desktop/
  file-manager/
  admin-users/
shared/
  models/
  components/
```

Widok pulpitu ma być prosty: pasek z nazwą konta i wylogowaniem, pasek bieżącej ścieżki, akcje plikowe i siatka ikon. Frontend nie implementuje dostępu do systemu operacyjnego — jedynie komunikuje się z API Laravel.

## Zasady bezpieczeństwa

- HTTPS w środowisku produkcyjnym.
- Hasła wyłącznie przez `Hash::make`; nigdy w formie jawnej.
- Autoryzacja każdego działania na plikach po stronie backendu.
- Prywatny dysk Laravel, poza `public/`.
- Limity rozmiaru wysyłanych plików.
- Lista dozwolonych typów plików albo skanowanie antywirusowe przed udostępnieniem.
- Ochrona CSRF, jeśli używane są sesje/cookies; właściwie skonfigurowane CORS dla aplikacji Angular.
- Rejestrowanie ważnych działań administratora.
- Testy reguły: „nowy admin wyłącza poprzedniego”.

## Stan roboczy

W katalogu głównym istnieje wcześniejszy prototyp w czystym PHP (`index.php` i `public/`). Nie należy go traktować jako docelowej architektury. Docelowa implementacja ma powstawać w `laravel-api/` i `angular-web/`.

Konfiguracja lokalnego PHP została uzupełniona o zaufany certyfikat Avast Web Shield, ponieważ program antywirusowy skanuje ruch HTTPS. Composer działa już z bezpieczną weryfikacją certyfikatów. Nie należy wyłączać weryfikacji TLS ani używać opcji omijających HTTPS.
