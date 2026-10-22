# Schach Pro – verbindliche Variantenregeln und Engine-Zuordnung

Quellen: https://lichess.org/variant und https://python-chess.readthedocs.io/en/latest/variant.html

Die Online-Regelprüfung ist in `online/server.py` bereits durch `python-chess==1.11.2` realisiert. Das Android-Offline-Brett `analysis.js` verwendet derzeit Regeln für klassisches Schach; es darf andere Varianten nicht nur durch Umbenennen der Spielauswahl vortäuschen.

| Modus | Regeln | Server-Implementierung |
| --- | --- | --- |
| standard | Klassische FIDE-Schachregeln | `chess.Board` |
| chess960 | Zufällige symmetrische Grundreihe; Läufer auf unterschiedlichen Farben, König zwischen Türmen; spezielle Rochade nach g-/c-Linie | `chess.Board.from_chess960_pos` |
| kingofthehill | Matt oder eigener König erreicht d4, e4, d5 oder e5 | `chess.variant.KingOfTheHillBoard` |
| threecheck | Matt oder dem Gegner insgesamt dreimal Schach geben | `chess.variant.ThreeCheckBoard` |
| antichess | Schlagen ist Pflicht; wer keine Figuren oder keine legalen Züge mehr hat, gewinnt; kein normales Schachgebot | `chess.variant.AntichessBoard` |
| atomic | Beim Schlagen explodieren schlagende und geschlagene Figur sowie angrenzende Nichtbauern; gegnerischen König durch Explosion entfernen | `chess.variant.AtomicBoard` |
| horde | Weiß beginnt mit einer Bauernhorde; Schwarz muss alle Horde-Figuren beseitigen, Weiß Schwarz mattsetzen | `chess.variant.HordeBoard` |
| racingkings | König zuerst auf die achte Reihe bringen; Schachgebote sind verboten, Sonderregel für Ausgleichszug | `chess.variant.RacingKingsBoard` |
| crazyhouse | Geschlagene Figuren werden dem eigenen Vorrat hinzugefügt und können als eigene Figuren auf freie Felder eingesetzt werden; Bauern nicht auf Grundreihen | `chess.variant.CrazyhouseBoard` |
| blind1–blind5 | Normale Schachregeln, aber zunehmend verdeckte Figuren/Brettinformationen; die Sichtbarkeit muss im Client umgesetzt werden | `chess.Board` plus UI-Sichtfilter |
| simul | Ein Gastgeber spielt mehrere getrennte Partien gegen verschiedene Gäste; jede Einzelpartie verwendet normale Schachregeln | mehrere `chess.Board`-Partien |

## Bewertung

`online/ratings.py` enthält die vom Nutzer gelieferte Glicko-2-Implementierung. Für gewertete Partien: Rating, RD und Volatilität serverseitig fortschreiben, Variantenpools trennen, vor und nach der Partie sowie Delta (+/-) anzeigen. Niemals lokale Trainingspunkte als offizielle Online-Wertung ausgeben. Nur serverbestätigte Ergebnisse werten; keine Ratingberechnung aus unbestätigten Clientmeldungen.

## Engine-Grenzen

Stockfish 19 Lite ist für klassisches Schach vorgesehen. `python-chess` prüft Variantenregeln, ist aber selbst kein starker Schach-Bot. Für Offline-Bots in Atomschach, Crazyhouse usw. ist eine passende Multi-Variant-Engine oder eine gesonderte Zugauswahl erforderlich. Vor Freigabe jeder Variante Tests für Startstellung, legale/illegale Züge, Sonderregeln, Spielende, Rücknahme, Speichern und Analyse durchführen.
