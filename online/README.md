# Schach 1001+ Pro – Online-Erweiterung mit Glicko-2

## Aktueller Stand

Die Online-Oberfläche, Multiplayer-Serverlogik, **Glicko-2-Ratings** und Android-Build-Integration sind auf dem `main`-Branch vorhanden. GitHub Actions baut aus dem alten eingebetteten Android-Archiv und fügt die Erweiterung im Build hinzu. **Der Multiplayer ist erst live, nachdem der Backend-Dienst auf einem erreichbaren HTTPS-Server gestartet wurde.** Der Android-Build ist derzeit nicht unabhängig als erfolgreich verifiziert.

Enthalten:

- Glicko-2 auf Basis des von dir bereitgestellten Rechenverfahrens: Start 1500 Rating / RD 350 / σ 0,06 / τ 0,5
- Gewertet oder ungewertet beim Erstellen einer Partie, inklusive zufälliger Gegnersuche und Privatpartien
- Spieleridentität per zufälligem geheimen Profil-Token, der lokal im Browser/Android-WebView gespeichert wird; **kein geräteübergreifendes Login**
- Getrennte Ranglisten-Pools für klassisches Schach und jede der acht Varianten; Simultan nur ungewertet
- Zwei Rating-Updates aus demselben Vor-Partie-Zustand: Sieg, Remis, Niederlage, Aufgabe
- Schutz gegen identische Spielerprofile und doppelte Ergebniswertung; Partien mit weniger als 4 Halbzügen bleiben ungewertet
- Vorläufige Ratinganzeige mit '?' für die ersten 10 gewerteten Partien
- RD wächst bei Inaktivität um einen Rating-Zeitraum (1 UTC-Tag), Obergrenze 350
- Rating-Änderung, RD und σ werden im Spiel nach Abschluss angezeigt
- 1:1 gegen Freunde (achtstelliger Einladungscode)
- Schnelles Online-Spiel gegen einen zufällig wartenden Gegner (öffentliche Warteschlange auf demselben Server)
- 8 Lichess-Varianten: Schach960, King of the Hill, Three-Check, Räuberschach, Atomschach, Horde, Racing Kings und Crazyhouse
- Klassisches Schach und Simultan mit 2 bis 20 separaten Brettern
- Regeln werden vom Backend mit `python-chess` kontrolliert, einschließlich Spezialregeln, Rochade, Umwandlung und Crazyhouse-Figureneinsatz
- Mobiloberfläche mit Brett, legalen Zielen, Partienwechsel, Aufgabe und erneuter Verbindung
- Ein zusätzlicher „🌐 Online“-Button in der bestehenden Android-WebView-App; der Altbestand wird beim Build nicht ersetzt
- Automatische Test- und APK-Workflows auf GitHub

## Wichtig: Glicko-2 und dauerhafte Speicherung

**Es gibt zwei Betriebsarten.**

1. **Ohne `RATING_DATABASE_URL`** läuft der Online-Server mit SQLite am Pfad `/tmp/schach1001-ratings.sqlite3`. Die Wertungen funktionieren für Tests, sind aber auf **Render Free NICHT dauerhaft**. Bei Neu-Deploy oder Instanzwechsel gehen diese gespeicherten Daten verloren. Die Weboberfläche weist darauf hin.
2. **Mit `RATING_DATABASE_URL`** nutzt der Server PostgreSQL. Für dauerhafte Wertungen eine separat betriebene, persistente PostgreSQL-Datenbank verwenden und die Verbindungsadresse **nur als geheime Render-Umgebungsvariable** hinterlegen. Niemals Passwörter/URLs mit Zugangsdaten in GitHub committen.

Eine neue Installation bekommt eine zufällige Spielerkennung und ein geheimes Token. Wer die Browserdaten löscht, das Gerät wechselt oder sein Token verliert, kann sein bisheriges Profil derzeit nicht selbst wiederherstellen. Das ersetzt keine vollständig abgesicherte Accountverwaltung.

Die Ratingberechnung erfolgt nach jeder beendeten gewerteten Partie als eigene Glicko-2-Periode (nicht als gemeinsame Tagesauswertung). Für die RD-Inaktivität gilt eine Tagesperiode. `R`, `RD` und `σ` werden intern **nicht gerundet**, sondern nur bei der Darstellung. Bei einem Ergebnis werden beide Spieler gleichzeitig anhand ihrer ursprünglichen Ratings berechnet. Unter vier Halbzügen gibt es keine Ratingänderung.

### Glicko-2-Beispiel / Gegenprobe

Ausgangspunkt: 1500 Rating, RD 200, σ 0,06; Spiele: Sieg gegen 1400/RD 30, Niederlagen gegen 1550/RD 100 und 1700/RD 300. Erwartet werden ungefähr **1464,05 Rating**, **151,52 RD** und **0,06000 Volatilität** (offizielles Glicko-2-Beispiel, Abweichungen durch Rundung).

### Rating-API

- `POST /api/players`: `{"name":"Anna"}` → `id`, `name` und einmaliges geheimes `player_token`
- `GET /api/players/me` mit Header `Authorization: Bearer <token>` → Identität
- `GET /api/ratings/<player_id>/<mode>` → Rating, RD, σ, gewertete Partien und vorläufiger Status
- `POST /api/quickplay` oder `POST /api/rooms` mit `{"rated":true,"player_token":"..."}` → gewertete Partie; andere Partien bleiben ungewertet
- `POST /api/rooms/{code}/join` mit `{"player_token":"..."}` bei gewerteten Partien

**Grenzen vor einem größeren öffentlichen Ratingbetrieb:** Nutzer können neue anonyme Profile anlegen. Es gibt noch keine robuste Verifizierung, Anti-Cheating-Systeme, Rate-Limits oder gesicherte Wiederherstellung. Daher ist dies ein funktionierender Entwicklungsstand, noch kein betrugssicheres Ranking.

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
4. Setzt `versionCode 610000` und `versionName 6.1.0-glicko2`.
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

- Infrastruktur für persistent gespeicherte Partien, Unterbrechungen, mehrere Serverinstanzen und Backups; für die Ratings PostgreSQL über `RATING_DATABASE_URL` verbinden
- Rate-Limits, Authentifizierung/Sitzungssicherheit und Monitoring
- Schachuhren, Remisangebote, öffentliche Ranglisten, dauerhaft gesicherte Nutzerkonten und Turniere sind noch nicht implementiert; **Glicko-2-Einzelwertungen sind implementiert**
- Signatur- und Installationstests mit der vorhandenen APK; echte Tests mit zwei Android-Geräten
- Keine Stockfish-Zughilfe während Online-Partien (Fairplay)

Die implementierten Variant-Regeln beruhen auf `python-chess`: https://python-chess.readthedocs.io/en/latest/variant.html
