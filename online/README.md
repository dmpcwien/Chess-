# Schach 1001+ Pro – Online-Erweiterung (Version 6.0)

## Aktueller Stand

Die Online-Oberfläche, Multiplayer-Serverlogik und Android-Build-Integration sind auf dem `main`-Branch vorhanden. GitHub Actions baut aus dem alten eingebetteten Android-Archiv und fügt die Erweiterung im Build hinzu. **Der Multiplayer ist erst live, nachdem der Backend-Dienst auf einem erreichbaren HTTPS-Server gestartet wurde.** Der Android-Build ist derzeit nicht unabhängig als erfolgreich verifiziert.

Enthalten:

- 1:1 gegen Freunde (achtstelliger Einladungscode)
- Schnelles Online-Spiel gegen einen zufällig wartenden Gegner (öffentliche Warteschlange auf demselben Server)
- 8 Lichess-Varianten: Schach960, King of the Hill, Three-Check, Räuberschach, Atomschach, Horde, Racing Kings und Crazyhouse
- Klassisches Schach und Simultan mit 2 bis 20 separaten Brettern
- Regeln werden vom Backend mit `python-chess` kontrolliert, einschließlich Spezialregeln, Rochade, Umwandlung und Crazyhouse-Figureneinsatz
- Mobiloberfläche mit Brett, legalen Zielen, Partienwechsel, Aufgabe und erneuter Verbindung
- Ein zusätzlicher „🌐 Online“-Button in der bestehenden Android-WebView-App; der Altbestand wird beim Build nicht ersetzt
- Automatische Test- und APK-Workflows auf GitHub

## Multiplayer-Server hosten

Benötigt wird ein eigener Server oder ein Hostingdienst für Docker/Python und HTTPS/WSS. **GitHub Actions allein hostet keine dauerhaft laufenden WebSocket-Partien.**

### Docker

Als Build-Kontext den Ordner `online/` verwenden:

```bash
docker build -t schach-1001-online ./online
docker run --rm -p 8000:8000 schach-1001-online
```

Lokal: http://localhost:8000 – Weboberfläche und API laufen zusammen.

Auf einem Hostingdienst: GitHub-Repository verbinden, Docker-Build mit `online/Dockerfile` und dem Build-Kontext `online` einstellen, Port durch die Plattform bereitstellen lassen und eine öffentliche HTTPS-Domain einrichten. Die Route `/api/health` dient als Healthcheck. Der Server verwendet den von der Plattform gelieferten `PORT` (Standard: 8000).

**Beispiel für eine bereitgestellte URL:** `https://mein-schachserver.example` (Platzhalter, **keine** aktive Adresse).
In der Android-App: Online öffnen → diese Serveradresse unter „Serveradresse (HTTPS)“ eintragen. Beim Besuch der gehosteten Weboberfläche unter `https://<domain>/` wird die Server-URL automatisch erkannt.

### Ohne Docker

```bash
cd online
python -m pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

Für einen dauerhaften öffentlichen Betrieb HTTPS über einen Reverse Proxy/Hostingdienst einrichten; HTTP auf anderen Geräten ist aus Sicherheitsgründen in der App nicht erlaubt.

## Android-APK (GitHub)

Der bestehende Workflow `.github/workflows/build-apk.yml`:

1. Holt GitHub-Dateien und entpackt das bisherige Android-WebView-Projekt.
2. Ruft `online/integrate_android.py` auf: kopiert `online/client.html` als `app/src/main/assets/www/online.html` und fügt im bisherigen `index.html` einen Online-Einstieg ein.
3. Hält die bisherige Paket-ID-Transformation auf `at.schach1001.pro2` bei.
4. Setzt `versionCode 600001` und `versionName 6.0.0-online`.
5. Baut die APK und stellt sie als Actions-Artefakt `Schach-1001-Pro-Online-APK` bereit, **wenn der Build erfolgreich abgeschlossen wurde**.

GitHub Actions: https://github.com/dmpcwien/Chess-/actions

**Bestehende Installationen nicht deinstallieren:** Der vorherige Workflow baute Debug-APKs. Ohne exakt denselben ursprünglichen Android-Signierschlüssel kann eine neue APK nicht über die bisherige installiert werden, auch wenn Paket-ID und Versionsnummer übereinstimmen. Die vier optionalen GitHub-Secrets für ein festes Release-Zertifikat sind:

- `CHESS_ANDROID_KEYSTORE_B64`
- `CHESS_ANDROID_KEYSTORE_PASSWORD`
- `CHESS_ANDROID_KEY_ALIAS`
- `CHESS_ANDROID_KEY_PASSWORD`

Ein anderer/neuer Schlüssel löst das Updateproblem einer bereits installierten anders signierten APK **nicht**. Die Schlüsseldatei nicht ins Repository committen.

## API

- `GET /`: browserbasierte Schachoberfläche
- `GET /api/health`: Status
- `GET /api/modes`: Varianten
- `POST /api/quickplay`: `{"name":"Anna","mode":"atomic"}` (Zufallsgegner)
- `POST /api/rooms`: `{"name":"Anna","mode":"crazyhouse","max_opponents":5}` (privat)
- `POST /api/rooms/{code}/join`: `{"name":"Ben"}`
- `WS /ws/{code}/{token}`: Partie/WebSocket-Synchronisation, Token ist geheim zu halten
- `{"type":"move","board_id":"...","uci":"e2e4"}` bzw. `N@e4` (Crazyhouse)
- `{"type":"resign","board_id":"..."}`

## Tests

```bash
python -m pip install -r online/requirements.txt pytest httpx
python -m pytest -q online/tests
```

Das Repo führt Tests bei Änderungen an `online/` automatisch in `.github/workflows/test-schach-online.yml` aus.

## Vor einem öffentlichen Start noch notwendig

- Infrastruktur für persistent gespeicherte Partien, Unterbrechungen, mehrere Serverinstanzen und Backups
- Rate-Limits, Authentifizierung/Sitzungssicherheit und Monitoring
- Schachuhren, Remisangebote, Rankings/ELO, Nutzerkonten und Turniere sind noch nicht implementiert
- Signatur- und Installationstests mit der vorhandenen APK; echte Tests mit zwei Android-Geräten
- Keine Stockfish-Zughilfe während Online-Partien (Fairplay)

Die implementierten Variant-Regeln beruhen auf `python-chess`: https://python-chess.readthedocs.io/en/latest/variant.html
