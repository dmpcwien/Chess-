# Schach Pro Neustart – V5.59-Basis
Eigenständiges Android-Projekt mit extrahierten Web-Assets der V5.59.
Paketkennung: `at.schachpro.neustart` (parallel installierbar).
Dieses Projekt ist ein erster technischer Aufbau und noch keine geprüfte APK.
## Bauen
Android SDK 35, Java 17 und Gradle 8.9:
`gradle :app:assembleDebug`
Für produktive Updates einen eigenen, dauerhaft gesicherten Release-Keystore verwenden.
**Keystore und Passwörter niemals in das Repository committen.**
Offene Prüfungen: WebView-Dateizugriffe, Online-Verbindungen, alle Schachvarianten,
Menüführung, Datenmigration, Android-15/16-Inset-Darstellung und Release-Signierung.

## Buildstatus
Projektstruktur und Asset-Pfade lokal geprüft. Android-SDK/Gradle hier nicht verfügbar; Build über GitHub Actions nach Hochladen des Projekts erforderlich. Debug-Build ist noch kein release-signiertes Update.
