# Smartdesk – prototyp

Prosty pulpit plików w PHP. Każde konto ma prywatny katalog z folderami `Documents`, `Pictures` i `Downloads`.

## Uruchomienie

W folderze projektu uruchom:

```powershell
php -S localhost:8001
```

Następnie wejdź na `http://localhost:8001`.

Domyślne dane: **admin / admin**.

Administrator może tworzyć konta. Utworzenie nowego konta z rolą administratora wyłącza poprzednie konto administratora zgodnie z założeniem projektu. Pliki są zapisywane poza katalogiem publicznym w `storage/users` i są dostępne tylko po zalogowaniu.

To celowo prosty prototyp bez frameworków, aby działał od razu w pustym katalogu. Produkcyjna wersja powinna zostać przeniesiona do Laravel + Angular, mieć bazę danych, ochronę CSRF, limity uploadu, walidację typów plików i HTTPS.
