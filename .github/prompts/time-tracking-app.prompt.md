---
name: time-tracking-app
description: "Erstellt und erweitert eine TypeScript-App zur Arbeitszeiterfassung mit API-Routen, Backend und Frontend. Verwende diesen Prompt für neue Features, Datenmodelle, Endpunkte und Benutzeroberflächen der Zeiterfassung."
---

# Time-Tracking-App

Entwickle eine TypeScript-Anwendung zur digitalen Erfassung und Auswertung von Arbeitszeiten.
Die App hat pro Arbeitstag genau drei unabhängige Erfassungen:

1. Frühtour
2. Mittagstour
3. Rücktour

Jede Erfassung muss einer eigenen positiven ganzzahligen Tournummer zugeordnet sein.
Der zuletzt eingegebene Tournummernwert wird als Default verwendet, darf aber niemals
die bereits gespeicherte Zuordnung einer anderen Erfassung überschreiben.

Die Zeitdaten sollen über die API in eine Excel-Tabelle exportiert werden können.
Als Vorlage wird `arbeitszeiterfassung_template.xlsx` verwendet. Existiert für Nutzer,
Jahr und Monat noch keine Tabelle, wird sie aus der Vorlage erzeugt.

## Ziel der Anwendung

Die App soll Mitarbeitenden ermöglichen, ihre Arbeitszeit einfach zu erfassen und zu verwalten. Verantwortliche sollen Zeiten prüfen, nach Projekten auswerten und als Bericht exportieren können.

Die Anwendung soll mindestens folgende Anwendungsfälle unterstützen:

- Benutzer im Frontend anmelden und die Zeiterfassung für den aktuellen Tag öffnen
- Jede der drei Erfassungen unabhängig starten und beenden
- Eine positive ganzzahlige Tournummer je Erfassung eingeben und speichern
- Die laufende Zeit je Erfassung live aktualisieren
- Die kumulierte Differenz im Feld `Stunden` als `HH:MM` anzeigen; das Feld ist read-only
- Zeiten prüfen, freigeben oder zur Korrektur zurückgeben
- Arbeitszeitberichte exportieren, insbesondere im Excel-kompatiblen Format
- Rollen und Berechtigungen für Mitarbeitende und Verantwortliche berücksichtigen

## Technische Leitplanken

- Verwende TypeScript im gesamten Projekt.
- frontend mit React oder vergleichbarem Framework entwickeln
- frontend als responsive Vollbreitenansicht entwickeln, mit besonderer Eignung für mobile Geräte
- Trenne Frontend, Backend und API-Routen klar voneinander.
- Verwende stabile, versionierbare REST- oder vergleichbare HTTP-API-Verträge.
- Validiere Eingaben an der API-Grenze und behandle Fehler einheitlich.
- Halte Geschäftslogik im Backend und nicht in den API-Controllern oder UI-Komponenten.
- Verwende UTC für Zeitstempel und konvertiere Zeiten nur in der Darstellung in die lokale Zeitzone.
- Dokumentiere neue Endpunkte und relevante Datenmodelle.
- Behandle Authentifizierung, Autorisierung und personenbezogene Daten sicher.
- Implementiere Nutzerverwaltung und Authentifizierung als eigenständigen Dienst (`apps/accounts`), unabhängig von der Zeiterfassung (`apps/api`), jeweils mit eigener SQL-Datenbank.
- Implementiere eine rollenbasierte Zugriffskontrolle für Mitarbeitende und Verantwortliche (Rollen `employee`/`admin`).
- Implementiere eine separate, serverseitig gerenderte Admin-Oberfläche im Accounts-Dienst (`/login`, `/admin/users`) für die Verwaltung von Nutzern, komplett losgelöst vom React-Frontend und mit eigenem Session-Cookie (kein Single-Sign-on zwischen Frontend-Login und Nutzerverwaltungs-Login).
- Beim Anlegen eines Nutzers wird ein Setup-Link mit zeitlich begrenztem Token versendet, über den der Nutzer im Frontend sein Passwort setzt; ein separater Passwort-vergessen-Link erzeugt einen Reset-Link mit kürzerer Gültigkeit.
- Implementiere eine Exportfunktion für Excel-Tabellen pro Nutzer, Jahr und Monat, die bei jedem Download aus den in der SQL-Datenbank gespeicherten Zeiteinträgen neu erzeugt wird (keine inkrementellen Dateibearbeitungen).
- Implementiere eine Funktion zum Erstellen neuer Tabellen basierend auf dem Template, falls für den aktuellen Monat noch keine existiert.
- Implementiere eine Funktion zum Hochladen und Verwalten bereits existierender Excel-Tabellen pro Nutzer.
- Implementiere eine Funktion zum Löschen von Excel-Tabellen pro Nutzer, Jahr und Monat.
- Implementiere eine Funktion zum Anzeigen einer Übersicht aller vorhandenen Excel-Tabellen pro Nutzer.
- Implementiere eine Funktion zum Herunterladen einzelner Excel-Tabellen pro Nutzer, Jahr und Monat.  

## Empfohlene Projektstruktur

```text
.
├── apps/
│   ├── accounts/                     # Eigenständiger Auth-/Nutzerverwaltungsdienst (Port 3001)
│   │   └── src/
│   │       ├── db.ts                 # MySQL, gemeinsame DB time_tracking
│   │       ├── authService.ts        # Login, Setup-/Reset-Token, bcrypt-Hashing
│   │       ├── emailService.ts       # Versand über SMTP oder Konsolen-Log im Dev-Modus
│   │       ├── pages.ts              # Serverseitig gerenderte HTML-Seiten (Login, Admin-UI)
│   │       └── server.ts             # Fastify-Server: /api/auth/*, /api/admin/*, /login, /admin/users
│   ├── api/
│   │   └── src/
│   │       └── server.ts             # Fastify-Server der Zeiterfassung (Port 3000), prüft nur das Session-Cookie
│   ├── backend/
│   │   └── src/
│   │       ├── db.ts                 # MySQL, gemeinsame DB time_tracking
│   │       ├── timeTrackingService.ts
│   │       └── spreadsheetService.ts # Erzeugt Excel-Dateien aus DB-Daten
│   └── frontend/
│       └── src/
│           ├── pages/                # LoginPage, SetPasswordPage, TimeTrackingPage
│           ├── api.ts                # Typsicherer API-Client (fetch)
│           └── App.tsx
├── packages/
│   └── shared/
│       └── src/
│           ├── index.ts              # Gemeinsame Zod-Schemas und Typen
│           └── auth.ts               # Session-Cookie-Namen, JWT-Sign/Verify mit aud-Claim
├── package.json
├── tsconfig.json
└── README.md
```

## Verantwortlichkeiten

### API-Routen

API-Routen dürfen HTTP-Anfragen entgegennehmen, authentifizieren, validieren und an einen Backend-Use-Case weiterleiten. Sie sollen keine komplexe Geschäftslogik enthalten.

Umgesetzte Endpunkte, verteilt auf zwei unabhängige Dienste:

**Accounts-Dienst (`apps/accounts`, Port 3001)**
- `POST /api/auth/login` — Body enthält `audience` (`frontend`/`accounts`), steuert welches Session-Cookie gesetzt wird
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/set-password`
- `GET /api/me`
- `GET /api/admin/users`, `POST /api/admin/users`, `POST /api/admin/users/:id/resend-invite` (nur Rolle `admin`)
- `GET /login`, `GET /forgot-password`, `GET /set-password`, `GET /admin/users`, `POST /logout` — serverseitig gerenderte Nutzerverwaltungs-Oberfläche

**Zeiterfassungs-API (`apps/api`, Port 3000)**
- `GET /api/time-entries`
- `POST /api/time-entries`
- `POST /api/time-entries/:id/stop`
- `PATCH /api/time-entries/:id`
- `GET /api/spreadsheets`
- `GET /api/spreadsheets/download`
- `DELETE /api/spreadsheets`

Geplante Erweiterungen (noch nicht umgesetzt): Freigabe-Workflow (`approve`/`reject`), Projekte, Auswertungsberichte.

### Backend

Das Backend enthält die fachlichen Regeln und Use Cases, zum Beispiel:

- Persistente Speicherung der Zeiteinträge in MySQL (`time_entries`-Tabelle, eindeutig je `userId` + Datum + Tour)
- Verwaltung der gespeicherten Excel-Tabellen pro Nutzer, jeweils frisch aus der DB erzeugt (kein inkrementelles Bearbeiten einzelner Zellen)
- zentrale Berechnung der Dauer aus Start- und Endzeit
- unabhängige Speicherung der Tournummern je Erfassung
- Validierung positiver Ganzzahlen für Tournummern
- eigener Adminzugang und eigene Nutzertabellen innerhalb derselben MySQL-Datenbank; Login-Sessions bleiben durch getrennte Cookies und Audiences unabhängig

### Frontend

Das Frontend soll eine klare, schnelle Oberfläche für wiederkehrende Zeiterfassungsaufgaben bieten. Es soll mindestens enthalten:

- Dashboard mit aktueller Tageszeit und drei laufenden bzw. abgeschlossenen Erfassungen
- Benennung der Erfassungen als Frühtour, Mittagstour und Rücktour
- eigenes Tournummernfeld pro Erfassung, positive Ganzzahl
- letzter Tournummernwert als Default für noch nicht zugeordnete Erfassungen
- read-only-Stundenfeld links neben dem Button, Ausgabe im Format `HH:MM`
- Live-Aktualisierung der einzelnen und kumulierten Zeiten
- responsive Vollbreitendarstellung mit proportionalen Feldern und Buttons
- Validierungs- und Fehlermeldungen direkt im Frontend
- Exportaktion für Excel-Tabelle pro Jahr und Monat
- eigene, im Frontend eingebettete Login-/Passwort-vergessen-/Passwort-setzen-Oberfläche (ruft die Auth-API des Accounts-Dienstes über den Vite-Proxy auf, unabhängig von der serverseitig gerenderten Nutzerverwaltungs-Oberfläche)


## Vorgehen bei Änderungen

1. Ermittle zuerst, welches Modul fachlich zuständig ist.
2. Ergänze oder aktualisiere das gemeinsame Datenmodell und die Validierung.
3. Implementiere die Geschäftsregel in einem Backend-Use-Case.
4. Verbinde den Use Case über eine validierte API-Route.
5. Ergänze den typisierten API-Client und die passende Frontend-Ansicht.
6. Schreibe fokussierte Tests für Erfolg, Validierungsfehler und Berechtigungsfehler.
7. Aktualisiere die API-Dokumentation und README, wenn sich der öffentliche Vertrag ändert.

Bevorzuge kleine, nachvollziehbare Änderungen und halte die Grenzen zwischen API, Backend und Frontend ein.
