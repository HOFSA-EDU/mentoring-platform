# Docker-Deployment

Die vollständige Anwendung läuft mit [docker-compose.yml](../docker-compose.yml):
Next.js, PostgreSQL 18 und ein einmaliger Container für Prisma-Migrationen.
Auf dem Zielsystem sind keine lokale Node.js-Installation und kein npm nötig.
Die Anleitung verwendet PowerShell; die Docker-Befehle funktionieren auch unter Linux.

## Voraussetzungen

- Docker Engine mit aktuellem Docker-Compose-v2-Plugin oder Docker Desktop mit Linux-Containern.
- Das Repository einschließlich `package-lock.json` und aller `prisma/migrations`.
- Internetzugriff während des Builds für Container-Images, npm und die in
  `src/app/layout.tsx` verwendeten Google Fonts.
- Für öffentlichen Betrieb: Domain, HTTPS-Reverse-Proxy und ein dauerhaftes
  Backup-Ziel außerhalb des Docker-Hosts.

Alle folgenden Befehle werden im Projektverzeichnis ausgeführt. Für diesen Stack
immer `--env-file .env.docker` verwenden. Die lokale Entwicklung verwendet eine
andere Compose-Datei und das bisherige Entwicklungsvolume; siehe unten.

## Konfiguration und erster Start

Die Vorlage kopieren:

```powershell
Copy-Item .env.docker.example .env.docker
```

Unter Linux entsprechend `cp .env.docker.example .env.docker` verwenden.
Zwei unabhängige Zufallswerte erzeugen:

```powershell
docker run --rm node:24-alpine node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
docker run --rm node:24-alpine node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Den ersten Wert als `POSTGRES_PASSWORD`, den zweiten als `AUTH_SECRET` in
`.env.docker` eintragen. `AUTH_URL` auf die später im Browser verwendete Adresse
setzen. Für einen Test auf demselben Rechner ist `http://localhost:3000` richtig;
für eine Domain beispielsweise `https://mentoring.example.org`.

| Variable | Standard / Bedeutung |
| --- | --- |
| `COMPOSE_PROJECT_NAME` | `bts-mentoring-platform-production`; bestimmt Container-, Netzwerk- und Volumen-Namensraum. Für dieselbe Installation beibehalten. |
| `IMAGE_TAG` | `local`; gemeinsamer Tag der App- und Werkzeug-Images. Für Releases einen eindeutigen Tag vergeben. |
| `POSTGRES_DB` | `mentoring`; Datenbankname. Buchstaben, Ziffern und Unterstriche verwenden. |
| `POSTGRES_USER` | `mentoring`; Datenbankbenutzer. Buchstaben, Ziffern und Unterstriche verwenden. |
| `POSTGRES_PASSWORD` | Pflichtwert; zufälliges Hex-Passwort aus dem obigen Befehl. Wird in die interne Verbindungs-URL eingesetzt und muss daher URL-sicher sein. |
| `AUTH_SECRET` | Pflichtwert; mindestens 32 Zeichen, unabhängig vom Datenbankpasswort. Ein Wechsel meldet bestehende Sitzungen ab. |
| `AUTH_URL` | Pflichtwert; öffentliche Browser-Origin einschließlich `http://` oder `https://`, ohne `/api/auth` und ohne Anwendung-Unterpfad. |
| `APP_BIND_ADDRESS` | `127.0.0.1`; veröffentlicht den App-Port nur auf dem Docker-Host, passend für einen dort installierten Reverse-Proxy. |
| `APP_PORT` | `3000`; veröffentlichter Host-Port. Bei direktem Zugriff den Port auch in `AUTH_URL` anpassen. |
| `BOOTSTRAP_ADMIN_EMAIL` | Nur beim ausdrücklichen Admin-Bootstrap erforderlich; gültige E-Mail-Adresse, wird normalisiert und kleingeschrieben. |
| `BOOTSTRAP_ADMIN_NAME` | Nur beim Admin-Bootstrap erforderlich; 2–100 Zeichen. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Nur beim Admin-Bootstrap erforderlich; mindestens 12 Zeichen mit Groß-/Kleinbuchstaben, Ziffer und Sonderzeichen, höchstens 72 UTF-8-Bytes. |

Werte mit Leerzeichen oder `$` in `.env.docker` einfach quotieren, beispielsweise
`BOOTSTRAP_ADMIN_NAME='Programme Admin'`. Für das Datenbankpasswort das erzeugte
Hex-Format beibehalten. `.env.docker` ist von Git und vom Docker-Build ausgeschlossen;
Dateizugriff auf die Betreiber der Installation beschränken und keine vollständige
Ausgabe von `docker compose config` veröffentlichen, da sie Secrets enthält.

Compose setzt `DATABASE_URL` selbst zusammen:
`postgresql://<Benutzer>:<Passwort>@postgres:5432/<Datenbank>?schema=public`.
Im Container bezeichnet `postgres` den Datenbankdienst; `localhost` wäre der
jeweilige Container selbst. Die App erhält außerdem `AUTH_TRUST_HOST=true`.
Das Image setzt intern `NODE_ENV=production`, `HOSTNAME=0.0.0.0`, `PORT=3000`
und `NEXT_TELEMETRY_DISABLED=1`; diese Werte müssen nicht in `.env.docker` stehen.

Konfiguration prüfen und starten:

```powershell
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up -d --build --wait
docker compose --env-file .env.docker ps -a
```

Zuerst wird PostgreSQL gesund, dann führt `migrate` die eingecheckten Migrationen
mit `prisma migrate deploy` aus. Erst nach erfolgreichem Abschluss startet `app`.
Ein beendeter `migrate`-Container mit Exit-Code `0` ist der erwartete Zustand.
Die App-Prüfung unter `/api/health` validiert `AUTH_SECRET` und testet eine Datenbankabfrage. Die
Startbedingungen entsprechen `service_healthy` und `service_completed_successfully`
aus der [Docker-Compose-Dokumentation](https://docs.docker.com/compose/how-tos/startup-order/).

## Erstes Administratorkonto und Stammdaten

Die drei `BOOTSTRAP_ADMIN_*`-Werte in `.env.docker` ausfüllen und nach dem
erfolgreichen Start ausführen:

```powershell
docker compose --env-file .env.docker run --rm bootstrap
```

Dieser ausdrücklich ausgewählte Dienst wird auch ohne `--profile tools` gestartet.
Beim normalen `up` läuft er nicht. Er erzeugt ein aktives Administratorkonto mit
bcrypt-Passwort-Hash. Bei derselben E-Mail eines bereits aktiven Administrators
bleiben Name und Passwort unverändert. Bei einem inaktiven Konto oder einer anderen
Rolle bricht er ab. Er ist kein Passwort-Reset und vergibt keine neue Rolle an
bestehende Benutzer.

Anschließend unter der konfigurierten `AUTH_URL` anmelden. Das Passwort sicher
aufbewahren und die drei `BOOTSTRAP_ADMIN_*`-Werte wieder aus `.env.docker`
entfernen oder leeren. Die App selbst erhält diese Werte zu keinem Zeitpunkt.

Eine frische Produktionsdatenbank enthält nach den Migrationen noch keine
fachlichen Stammdaten. Diese im Admin-Bereich anlegen:

1. Ein Semester mit passenden Start-/Enddaten erstellen und aktivieren.
2. Mentor- und Studentenkonten anlegen; Studenten dem Semester und einem Mentor zuordnen.
3. Unter `/admin/questions` 8–12 aktive Fragen im Kontext `ONBOARDING` mit
   Antwortoptionen erstellen. Außerhalb dieser Anzahl ist das Onboarding gesperrt.
4. Für `WEEKLY` drei aktive stabile Fragen sowie mindestens eine rotierende Frage
   erstellen. Mindestens zwei rotierende Fragen ergeben den vorgesehenen Check-in
   mit fünf Fragen. Jede Frage benötigt passende Antwortoptionen.
5. Optional Quest-Vorlagen unter `/admin/quest-templates` anlegen.

Es gibt keine öffentliche Registrierung. Demo-Konten und Demo-Daten werden nie
automatisch angelegt. Ausschließlich in einer separaten Entwicklungs-/Testinstallation
kann der bekannte Entwicklungsdatensatz ausdrücklich geladen werden:

```powershell
docker compose --env-file .env.docker run --rm migrate npm run db:seed
```

Dieser Seed enthält unter anderem `admin@example.test` und das veröffentlichte
Passwort `MentoringDev!2026`; er setzt deterministische Entwicklungsdaten zurück.
Er ist für eine produktive Datenbank ungeeignet.

## HTTPS und Reverse-Proxy

Für den öffentlichen Betrieb den Reverse-Proxy auf demselben Host installieren
und `APP_BIND_ADDRESS=127.0.0.1` beibehalten. Die App ist dadurch nicht direkt
über die öffentliche Host-Adresse erreichbar. Die Next.js-Anleitung empfiehlt
einen Proxy vor dem Anwendungsserver; siehe die
[mitinstallierte Anleitung für Self-Hosting](../node_modules/next/dist/docs/01-app/02-guides/self-hosting.md).

Beispiel für einen auf dem Host laufenden Caddy, Datei `Caddyfile`:

```caddyfile
mentoring.example.org {
    reverse_proxy 127.0.0.1:3000
}
```

Die Domain muss zum Host zeigen; Ports 80 und 443 müssen den Proxy erreichen.
In `.env.docker` dazu `AUTH_URL=https://mentoring.example.org` eintragen.
Caddy übernimmt für passende öffentliche Domains die Zertifikatsverwaltung;
siehe den [Caddy-Reverse-Proxy-Quickstart](https://caddyserver.com/docs/quick-starts/reverse-proxy).
Der Proxy muss den ursprünglichen Host und das Protokoll korrekt weiterreichen
und eingehende Forwarded-Header zuverlässig ersetzen. Caddy behandelt diese
Header standardmäßig; siehe [Header-Verhalten von reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers).
Das Beispiel setzt Caddy auf dem Host voraus; in einem eigenen Container zeigt
`127.0.0.1` auf den Proxy-Container und muss durch passende Netzwerkverbindung ersetzt werden.

Für Internetzugriff außerdem die vorhandenen
[Hinweise zum Login-Rate-Limiting](02_AUTHENTICATION_AND_AUTHORIZATION.md#session-and-operational-hardening)
am Proxy oder vorgeschalteten Dienst umsetzen. Die App enthält keinen eigenen
verteilten Rate-Limiter. Nach Änderung von `AUTH_URL` die App neu erzeugen:

```powershell
docker compose --env-file .env.docker up -d --wait --force-recreate app
```

## Datenhaltung und Backups

PostgreSQL veröffentlicht keinen Host-Port. Alle fachlichen Daten liegen im
benannten Volume `postgres-data`, standardmäßig als
`bts-mentoring-platform-production_postgres-data`. PostgreSQL 18 verwendet den
Mount-Punkt `/var/lib/postgresql`; siehe die
[Dokumentation des offiziellen PostgreSQL-Images](https://hub.docker.com/_/postgres#pgdata).
Container-Neuerstellung und `docker compose down` erhalten dieses Volume.
`docker compose down -v` und das Löschen des Volumes entfernen die Daten.

Die `POSTGRES_*`-Initialisierungswerte wirken nur auf ein leeres Datenverzeichnis.
Ein geändertes `POSTGRES_PASSWORD` in `.env.docker` ändert daher nicht das Passwort
einer bestehenden Datenbank; eine Rotation muss auch in PostgreSQL erfolgen.
Siehe [Initialisierungsvariablen des PostgreSQL-Images](https://hub.docker.com/_/postgres#environment-variables).

Backup in PowerShell, ohne binäre Umleitung durch die Shell:

```powershell
New-Item -ItemType Directory -Force backups | Out-Null
$backupFile = "./backups/mentoring-$(Get-Date -Format 'yyyyMMdd-HHmmss').dump"
docker compose --env-file .env.docker exec -T postgres sh -c 'pg_dump --username=$POSTGRES_USER --dbname=$POSTGRES_DB --format=custom --file=/tmp/mentoring-backup.dump'
docker compose --env-file .env.docker cp postgres:/tmp/mentoring-backup.dump $backupFile
docker compose --env-file .env.docker exec -T postgres rm -f /tmp/mentoring-backup.dump
```

Jeden Befehl nur nach erfolgreichem Abschluss des vorherigen fortsetzen. Die
Dump-Datei außerhalb des Hosts sichern und Wiederherstellungen regelmäßig in
einem separaten Compose-Projekt prüfen. Auch die Deployment-Konfiguration und
verwendeten Release-/Image-Tags sicher aufbewahren. `backups/` und `*.dump`
werden von Git und Docker-Build ausgeschlossen.

Wiederherstellung ersetzt die enthaltenen Datenbankobjekte durch den Stand des
Backups. Zuerst den aktuellen Stand sichern und das zur Sicherung passende
App-Release auswählen. Den Dateinamen im folgenden Beispiel ersetzen:

```powershell
docker compose --env-file .env.docker stop app
docker compose --env-file .env.docker up -d --wait postgres
docker compose --env-file .env.docker cp ./backups/mentoring-YYYYMMDD-HHMMSS.dump postgres:/tmp/mentoring-restore.dump
docker compose --env-file .env.docker exec -T postgres sh -c 'pg_restore --username=$POSTGRES_USER --dbname=$POSTGRES_DB --clean --if-exists --no-owner --no-privileges --exit-on-error /tmp/mentoring-restore.dump'
docker compose --env-file .env.docker exec -T postgres rm -f /tmp/mentoring-restore.dump
docker compose --env-file .env.docker up -d --no-deps --wait app
```

Nur nach fehlerfreier Wiederherstellung weitergehen. `--no-deps` vermeidet hier
eine automatische Migration des wiederhergestellten Schemas. Falls anschließend
ein neueres App-Release verwendet werden soll, zuerst dessen Migrationen nach
dem folgenden Update-Ablauf ausführen.

## Updates, Betrieb und Fehlerdiagnose

Vor einem Update ein geprüftes Backup erstellen und den bisherigen Code-Stand
sowie die Image-Tags aufbewahren. Danach neuen Code bereitstellen und `IMAGE_TAG`
in `.env.docker` auf einen neuen Release-Tag setzen. Schrittweise ausführen:

```powershell
docker compose --env-file .env.docker build --pull app migrate
docker compose --env-file .env.docker stop app
docker compose --env-file .env.docker run --rm migrate
docker compose --env-file .env.docker up -d --wait --force-recreate app
```

Bei einem Migrationsfehler die App gestoppt lassen und die Ursache beheben.
Ein Zurücksetzen des App-Image-Tags macht keine Schemaänderung rückgängig.
Ein Rollback erfordert Schema-Kompatibilität oder die Wiederherstellung des
passenden Backups und kann dabei spätere Daten verlieren. PostgreSQL-Major-Upgrades
müssen separat über `pg_upgrade` oder Dump/Restore geplant werden; ein Austausch
des Image-Tags allein genügt nicht.

Nützliche Betriebsbefehle:

```powershell
docker compose --env-file .env.docker ps -a
docker compose --env-file .env.docker logs --tail=100 app migrate postgres
docker compose --env-file .env.docker logs -f app
docker compose --env-file .env.docker down
```

Fehlende Secrets meldet bereits `config --quiet`. Bei nicht gestarteter App zuerst
`migrate` prüfen. Bei falschen Login-URLs `AUTH_URL` und Proxy-Header prüfen. Ein
fehlgeschlagener Font-Download beim Build benötigt Netzwerkzugriff zu Google Fonts.
Healthchecks melden eine ungültige Auth-Konfiguration oder einen ausgefallenen Datenbankzugriff, starten einen lediglich
als `unhealthy` markierten Container jedoch nicht automatisch neu.

## Image-Aufbau und lokale Entwicklung

Der [Dockerfile](../Dockerfile) verwendet getrennte Stufen für Basis,
Abhängigkeiten, Build, Werkzeuge und Laufzeit. `npm ci` verwendet das Lockfile;
Prisma wird im Linux-Image generiert. Die Web-Laufzeit enthält den Next.js-
Standalone-Output sowie `public` und `.next/static`, läuft als Benutzer `node`
und startet direkt `node server.js`. Die Aufteilung folgt der
[lokalen Next.js-Dokumentation zu Standalone-Output](../node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md).

Das separate Werkzeug-Image enthält absichtlich auch Entwicklungsabhängigkeiten
für Prisma CLI und `tsx`; dadurch bleiben Migrationen und Admin-Bootstrap aus dem
kleinen Web-Image heraus. Die Werkzeuge laufen ebenfalls als Benutzer `node`.
Die Build-Stufe verwendet lediglich nicht geheime Platzhalter zur Env-Validierung.
Echte Secrets gelangen erst beim Containerstart in die Anwendung. Servervariablen
werden zur Laufzeit gelesen; siehe die
[lokale Next.js-Anleitung zu Umgebungsvariablen](../node_modules/next/dist/docs/01-app/02-guides/environment-variables.md).

Für `npm run dev` auf dem Host bleibt die Datenbank separat verfügbar:

```powershell
docker compose -f docker-compose.dev.yml up -d
```

Diese Datei verwendet den bisherigen Projektnamen `bts-mentoring-platform` und
damit das vorhandene Entwicklungsvolume. Port 5432 wird nur an `127.0.0.1`
gebunden. Der Produktionsstack nutzt standardmäßig ein eigenes Volume und liest
keine vorhandenen Entwicklungsdaten automatisch ein. Den vollständigen lokalen
Ablauf beschreibt [README.md](../README.md#local-setup).
