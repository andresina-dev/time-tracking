# Time Tracking

Mobile Zeiterfassung mit TypeScript, zwei unabhängigen Fastify-Backends, Backend-Use-Cases und React-Frontend.

Die Anwendung erfasst drei tägliche Zeitblöcke: Frühtour, Mittagstour und Rücktour.
Jeder Zeitblock wird unabhängig einer positiven ganzzahligen Tournummer zugeordnet.

## Starten

Voraussetzung: Node 22 (oder neuer) und Docker Compose.

```bash
nvm install 22
nvm use 22
npm install
docker compose up -d
npm run dev
```

Bei einer bestehenden Installation zuerst einmalig `npm run migrate:sqlite` ausführen,
um Daten aus `data/accounts.db` und `data/app.db` nach MySQL zu übernehmen. Die
SQLite-Dateien bleiben unverändert erhalten. Bei einer Neuinstallation entfällt dieser Schritt.

Danach öffnen:

- Frontend (Zeiterfassung, mit eigenem Login): http://localhost:5173
- Zeiterfassungs-API: http://localhost:3000
- Nutzerverwaltung (eigenständiger Dienst, eigener Login): http://localhost:3001/login

## MySQL und Adminer

MySQL und Adminer können unabhängig von der Anwendung mit Docker Compose gestartet werden:

```bash
docker compose up -d
```

Adminer ist unter http://localhost:8080 erreichbar. Als System `MySQL` und als Server
`mysql` auswählen. Die Anwendung und Adminer verbinden sich mit den Werten aus `.env`.
Standardmäßig lauten Datenbank und Benutzer `time_tracking`; das Passwort ist
`time_tracking_password`. Root verwendet lokal `root` / `rootpassword`. Zugangsdaten
werden über `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` und
`MYSQL_ROOT_PASSWORD` konfiguriert. Accounts- und Zeiterfassungsdaten liegen gemeinsam
in `time_tracking`. Ports lassen sich über `MYSQL_PORT` und
`ADMINER_PORT` setzen. Für geteilte oder produktive Umgebungen müssen die Passwörter
in `.env` ersetzt werden.
Die Datenbank wird im benannten Volume `mysql_data` gespeichert und bleibt bei einem
Neustart der Container erhalten.

Beim ersten Start wird automatisch ein Admin-Account angelegt (`admin@example.com`,
überschreibbar über `INITIAL_ADMIN_EMAIL`). Der Setup-Link zum Passwortsetzen wird
in der Konsole des Accounts-Dienstes ausgegeben.

Falls die Prozesse getrennt gestartet werden sollen:

```bash
npm run dev:accounts
npm run dev:api
npm run dev:frontend
```

## Erste Funktionen

- drei unabhängige Erfassungen pro Arbeitstag: Frühtour, Mittagstour und Rücktour
- positive ganzzahlige Tournummer pro Erfassung
- letzter Tournummernwert als Default, ohne die Zuordnung anderer Erfassungen zu überschreiben
- Start- und Stopp-Aktion mit zentraler Dauerberechnung im Backend
- live aktualisierte kumulierte Zeit pro Erfassung im read-only-Stundenfeld
- Zeitdifferenz im Format `HH:MM`
- Vollbreiten- und responsive Frontend-Darstellung
- Erstellung und Download einer monatlichen Excel-Tabelle pro Nutzer, direkt aus der Datenbank erzeugt
- Verwendung von `arbeitszeiterfassung_template.xlsx`, wenn das Template vorhanden ist
- Anmeldung per E-Mail/Passwort, Passwort-vergessen-Link und Admin-Nutzerverwaltung (siehe unten)

## Nutzerverwaltung & Authentifizierung

Nutzerverwaltung und Zeiterfassung sind zwei vollständig unabhängige Dienste mit
eigenem Login und gemeinsamen Tabellen in derselben MySQL-Datenbank:

- **Frontend-Login** (`http://localhost:5173`): eigene, ins React-Frontend eingebettete
  Login-/Passwort-vergessen-/Passwort-setzen-Oberfläche für Mitarbeitende. Setzt das
  Cookie `frontend_session`.
- **Nutzerverwaltung** (`http://localhost:3001/login`): eigenständige, serverseitig
  gerenderte Oberfläche zum Anlegen von Nutzern (`/admin/users`), nur für Admins. Setzt
  das eigene Cookie `accounts_session`. Ein Login in der einen Oberfläche verschafft
  keinen Zugriff auf die jeweils andere.
- Beim Anlegen eines Nutzers wird ein Setup-Link (48 Std. gültig) erzeugt, über den das
  Passwort im Frontend gesetzt wird; ohne konfigurierten SMTP-Server wird die E-Mail in
  der Konsole des Accounts-Dienstes protokolliert und der Link zusätzlich im Admin-UI
  angezeigt.
- Umgebungsvariablen: `AUTH_JWT_SECRET` (von beiden Diensten geteilt), `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `INITIAL_ADMIN_EMAIL`,
  `FRONTEND_URL`, `ACCOUNTS_PORT`, `PORT`.

## Architektur

```text
apps/accounts  Eigenständiger Auth-/Nutzerverwaltungsdienst (Port 3001), eigene Tabellen in MySQL
apps/api       Fastify-Routen der Zeiterfassung (Port 3000), prüft nur das Session-Cookie
apps/backend   Zeitberechnung, MySQL-Persistenz und Excel-Dateiservice
apps/frontend  React-Oberfläche und Vite-Entwicklungsserver
packages/shared Gemeinsame TypeScript-Typen, Zod-Schemas und Session-Hilfsfunktionen
```

Nutzer und Zeiteinträge werden in MySQL gespeichert und überleben Neustarts. Die
Excel-Tabelle wird bei jedem Download frisch aus den DB-Daten erzeugt.

## Prüfungen

```bash
npm run build
```

Der Befehl kompiliert Accounts-Dienst, API, Backend, Frontend und Shared-Paket.

Die weitere Umsetzungsplanung steht in [.github/prompts/time-tracking-app.prompt.md](.github/prompts/time-tracking-app.prompt.md).

Die lokalen DB-Zugangsdaten stehen in der nicht versionierten `.env`-Datei.
