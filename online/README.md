# Schach 1001+ Pro — Online-Modul (Entwicklungsstand)

## Enthalten

* Online-Partien mit privaten Einladungscodes und serverseitiger Zugprüfung (WebSocket)
* Standard, Schach960, King of the Hill, Three-Check, Antichess/Räuberschach, Atomic, Horde, Racing Kings, Crazyhouse
* Simultanveranstaltung: ein Gastgeber gegen bis zu 20 Gegner auf getrennten, unabhängigen Brettern
* Android-taugliche Weboberfläche, Auswahl der Varianten, legale Zugziele, Rochade, Umwandlung und Crazyhouse-Drops
* Aufgeben und Wiederaufnahme einer Partie im selben Browser

Die offiziellen Spielregeln setzt `python-chess` mit eigenen Variantenklassen um: https://python-chess.readthedocs.io/en/latest/variant.html

## Server starten

Benötigt Python 3.11+.

```bash
cd online
python -m pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

Für einen lokalen Test die Datei `client.html` im Browser öffnen und als Server `http://localhost:8000` eingeben. Im produktiven Betrieb einen dauerhaft erreichbaren Server mit **HTTPS/WSS** einrichten, seine URL in der App eintragen und CORS einschränken (Umgebungsvariable `ONLINE_ALLOW_ORIGINS`).

Die Weboberfläche hat keine separate Passwortanmeldung; die zufällig generierten Sitzplatz-Tokens sind geheim zu behandeln.

## API

* `POST /api/rooms`: `{"name":"Host","mode":"crazyhouse","max_opponents":5}`
* `POST /api/rooms/{code}/join`: `{"name":"Gast"}`
* `GET /api/modes`: verfügbare Varianten
* `GET /api/rooms/{code}`: Raumstatus ohne Tokens
* `WS /ws/{code}/{token}`: laufende Partien und Züge
* Züge: `{"type":"move","board_id":"...","uci":"e2e4"}`; Crazyhouse-Drop z. B. `"N@e4"`
* Aufgeben: `{"type":"resign","board_id":"..."}`

## Bekannte Einschränkungen

**Noch keine fertige APK und kein öffentlich gehosteter Multiplayer-Dienst.** Die Dateien liegen als separates Modul im bestehenden privaten Repository; die bisherige Android-Oberfläche und ihr eingebetteter Build bleiben unverändert. Ein Android-Menüeintrag muss noch auf `client.html` verweisen.

* Räume sind im Arbeitsspeicher: Server-Neustart beendet sie; kein DB-Backup und kein Multi-Worker-Betrieb.
* Noch keine Schachuhren, ELO-Wertung, Konten, öffentliche Gegnersuche, Freundeslisten, Turniere oder Chat.
* Noch kein produktionsreifes Abuse- und Rate-Limit-System, keine erneute Authentifizierung nach Tokenverlust.
* Für Onlinepartien darf Stockfish nicht als Live-Zugunterstützung verwendet werden.
* Vor öffentlichem Betrieb sind HTTPS, persistente Daten, Sicherheitsprüfung und Lasttests erforderlich.

## Tests

Vom Repository-Stammordner:

```bash
pip install -r online/requirements.txt pytest
pytest -q online/tests
```
