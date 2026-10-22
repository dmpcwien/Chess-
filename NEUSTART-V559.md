# Schach Pro – Neustart auf V5.59-Basis

Entwicklungszweig: `schach-v559-neustart`. Der bestehende `main`-Build bleibt unverändert.

## Technische Vorgaben
- Funktionierende V5.59 als einzige Basis verwenden.
- Neue Paketkennung: `at.schachpro.neustart` (parallel zur bestehenden App).
- Release-Signierschlüssel privat und **niemals** im Git-Repository speichern.
- Alte App und ihre Daten nicht löschen.
- Vor Freigabe: Offline-Varianten, Partie starten, Coach, Analyse, Brettgröße, Online-Auswahl und Elo-Anzeige testen.

## Aktueller Status
Das rekonstruierte Android-Projekt liegt als ZIP vor, ist aber noch nicht in diesen Git-Zweig übertragen.
Der lokale JavaScript-Syntaxtest sowie die HTML-Assetreferenz-Prüfung wurden durchgeführt.
Ein vollständiger Android-Build und Gerätetest stehen aus.
