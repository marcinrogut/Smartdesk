#!/bin/bash
# Generuje plik .env dla wybranego profilu środowiska.
#
# Uruchamiany ręcznie (tak jak w Smartfridge żaden workflow go nie wywołuje),
# lokalnie lub przez SSH na serwerze:
#
#   APP_ENV=production SMARTDESK_DB_PASS='<hasło z panelu hostingu>' ./deploy-config.sh
#   APP_ENV=development ./deploy-config.sh
#
# Hasło bazy produkcyjnej NIE jest trzymane w repozytorium - podaj je przez zmienną.

set -euo pipefail

ENV=${APP_ENV:-production}

echo "Tworzę .env dla profilu: $ENV"

if [ "$ENV" = "production" ]; then
    cat > .env <<EOF
# SmartDesk - profil PRODUKCYJNY (wygenerowany przez deploy-config.sh)
APP_ENV=production

SMARTDESK_DB_HOST=${SMARTDESK_DB_HOST:-localhost}
SMARTDESK_DB_NAME=${SMARTDESK_DB_NAME:-srv113891_smartdesk_db}
SMARTDESK_DB_USER=${SMARTDESK_DB_USER:-srv113891_smartdesk_db}
SMARTDESK_DB_PASS=${SMARTDESK_DB_PASS:?Ustaw SMARTDESK_DB_PASS - hasło bazy z panelu hostingu}
SMARTDESK_DB_CHARSET=utf8mb4
EOF
    echo "Gotowe: profil produkcyjny."
else
    cat > .env <<EOF
# SmartDesk - profil DEWELOPERSKI (wygenerowany przez deploy-config.sh)
APP_ENV=development

SMARTDESK_DB_HOST=${SMARTDESK_DB_HOST:-192.168.1.80}
SMARTDESK_DB_NAME=${SMARTDESK_DB_NAME:-Smartdesk}
SMARTDESK_DB_USER=${SMARTDESK_DB_USER:-Smartdesk}
SMARTDESK_DB_PASS=${SMARTDESK_DB_PASS:-Smartdesk}
SMARTDESK_DB_CHARSET=utf8mb4
EOF
    echo "Gotowe: profil deweloperski."
fi

# Plik czytelny wyłącznie dla właściciela konta.
chmod 600 .env
echo "Uprawnienia .env ustawione na 600."
echo "Uwaga: API_SECRET dopisuje do zdalnego .env krok 'Ensure API_SECRET' w deploy-ftp.yml."
