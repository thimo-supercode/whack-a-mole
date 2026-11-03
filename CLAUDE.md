# CLAUDE.md

## Projekt
Whack-a-Mole ("Hau den Maulwurf") – ein kleines Browser-Spiel als Praxis-/Lernbeispiel für HTML, CSS und JavaScript. Ein Hamster 🐹 erscheint in zufälligen Löchern eines 3×3-Rasters und muss angeklickt werden. Eine Runde dauert 30 Sekunden.

Sprache der Oberfläche und Kommunikation: Deutsch.

## Ausführen
Kein Build, keine Abhängigkeiten, keine Tests. `index.html` direkt im Browser öffnen (Doppelklick). Das Spiel startet automatisch beim Laden.

## Dateien
- `index.html` – Aufbau: Überschrift, HUD (Punkte `#score`, High-Score `#highscore`, Zeit `#time`), leerer Container `#grid`, Ergebnistext `#result`, Button `#restart`. Bindet `style.css` und `script.js` ein.
- `style.css` – Aussehen: dunkelvioletter Hintergrund (`#180630`), 3×3-Grid aus runden `.hole`-Elementen (100 px), aktives Loch `.hole.active` gelbgrün (`#E2F068`), `#restart` standardmäßig ausgeblendet.
- `script.js` – Spiellogik (Vanilla JS, keine Bibliotheken).

## Spiellogik (script.js)
Konstanten oben in der Datei:
- `GRID_SIZE = 9` – Anzahl der Löcher
- `ROUND_SECONDS = 30` – Rundendauer
- `MOLE_VISIBLE_MS = 800` – Intervall, in dem der Hamster das Loch wechselt (kleiner = schwerer)
- `HIGHSCORE_KEY = 'whackamole-highscore'` – Schlüssel für den High-Score in `localStorage`

Funktionen:
- `loadHighscore()` / `saveHighscore()` – lesen/schreiben den High-Score in `localStorage` (mit `try/catch`, Fallback 0)
- `buildGrid()` – erzeugt die Löcher und hängt Klick-Handler an
- `showMole()` – setzt den Hamster in ein zufälliges Loch (entfernt ihn aus dem alten)
- `whack(hole)` – +1 Punkt bei Treffer auf das aktive Loch; Fehlklicks ohne Abzug
- `tick()` – Countdown pro Sekunde, ruft bei 0 `endGame()` auf
- `startGame()` – setzt Zustand zurück, startet `moleTimer` und `countdownTimer` (`setInterval`)
- `endGame()` – stoppt Timer, aktualisiert ggf. den High-Score („🏆 Neuer High-Score!“), zeigt Ergebnis, blendet `#restart` ein

Zustand liegt in globalen Variablen (`score`, `highscore`, `timeLeft`, `holes`, `activeHole`, `running`, Timer-IDs).

## Konventionen
- Einfach halten: reines HTML/CSS/JS ohne Frameworks oder Build-Tools.
- Code-Stil von `script.js` beibehalten (Konstanten in UPPER_CASE, kleine Funktionen, `getElementById`).
