# CLAUDE.md

## Projekt
Whack-a-Mole ("Hau den Maulwurf") – ein kleines Browser-Spiel als Praxis-/Lernbeispiel für HTML, CSS und JavaScript. Ein Hamster 🐹 erscheint in zufälligen Löchern eines 3×3-Rasters und muss angeklickt werden. Eine Runde dauert 30 Sekunden.

Sprache der Oberfläche und Kommunikation: Deutsch.

## Ausführen
Kein Build, keine Abhängigkeiten, keine Tests. `index.html` direkt im Browser öffnen (Doppelklick). Das Spiel startet automatisch beim Laden.

## Dateien
- `index.html` – Aufbau: Überschrift, HUD (Punkte `#score`, High-Score `#highscore`, Zeit `#time`), leerer Container `#grid`, Bestenliste `#leaderboard` (Tabelle mit `#leaderboard-body`, anfangs ausgeblendet), Ergebnistext `#result`, Button `#restart`. Bindet `style.css` und `script.js` ein.
- `style.css` – Aussehen: dunkelvioletter Hintergrund (`#180630`), 3×3-Grid aus runden `.hole`-Elementen (100 px), aktives Loch `.hole.active` gelbgrün (`#E2F068`), `#restart` standardmäßig ausgeblendet. Bestenliste übernimmt Schrift/Farbe des Spiels, Kopfzeile `#E2F068`, bester Eintrag (`tr.best`) fett.
- `script.js` – Spiellogik (Vanilla JS, keine Bibliotheken).

## Spiellogik (script.js)
Konstanten oben in der Datei:
- `GRID_SIZE = 9` – Anzahl der Löcher
- `ROUND_SECONDS = 30` – Rundendauer
- `MOLE_VISIBLE_MS = 800` – Intervall, in dem der Hamster das Loch wechselt (kleiner = schwerer)
- `HIGHSCORE_KEY = 'whackamole-highscore'` – Schlüssel für den High-Score in `localStorage`
- `LEADERBOARD_SIZE = 5` – Anzahl der Einträge in der Bestenliste

Funktionen:
- `loadHighscore()` / `saveHighscore()` – lesen/schreiben den High-Score in `localStorage` (mit `try/catch`, Fallback 0)
- `buildGrid()` – erzeugt die Löcher und hängt Klick-Handler an
- `showMole()` – setzt den Hamster in ein zufälliges Loch (entfernt ihn aus dem alten)
- `whack(hole)` – +1 Punkt bei Treffer auf das aktive Loch; Fehlklicks ohne Abzug
- `tick()` – Countdown pro Sekunde, ruft bei 0 `endGame()` auf
- `startGame()` – setzt Zustand zurück, startet `moleTimer` und `countdownTimer` (`setInterval`)
- `endGame()` – stoppt Timer, aktualisiert ggf. den High-Score („🏆 Neuer High-Score!“), zeigt Ergebnis, blendet `#restart` ein, zeigt die Bestenliste statt des Spielfelds
- `parseDate(dateStr)` – prüft `'JJJJ-MM-TT'` bzw. ISO mit Uhrzeit (`DATE_PATTERN` + Kalenderprüfung), liefert Zeitstempel in ms oder `null` bei ungültigem Datum
- `formatDate(dateStr)` – `'JJJJ-MM-TT'` → `'TT.MM.JJJJ'` (reine String-Umformung)
- `compareEntries(a, b)` – Sortierregel: mehr Punkte zuerst; bei Gleichstand früherer Zeitpunkt (inkl. Uhrzeit) besser; ungültiges Datum immer schlechter; bei identischem Zeitpunkt alphabetisch nach Name
- `getTopEntries()` – sortiert `leaderboard` mit `compareEntries`, max. `LEADERBOARD_SIZE`
- `renderLeaderboard()` / `showLeaderboard()` / `hideLeaderboard()` – Tabelle aufbauen (per `textContent`) und statt `#grid` ein-/ausblenden; ungültige Daten werden als Rohwert rot angezeigt (`td.invalid-date`)
- `setTestLeaderboard(entries)` – Test-Hilfe: setzt Dummy-Daten nur im Speicher und zeigt sie an, wenn keine Runde läuft

Zustand liegt in globalen Variablen (`score`, `highscore`, `timeLeft`, `holes`, `activeHole`, `running`, `leaderboard`, Timer-IDs).

## Bestenliste testen
Stand Schritt 1: nur Anzeige, keine Namenseingabe, keine Speicherung. Eintragsformat: `{ name: 'Anna', score: 27, date: '2026-11-01' }`. In der Browser-Konsole:
```js
setTestLeaderboard([{ name: 'Anna', score: 27, date: '2026-11-01' }]);
endGame(); // Runde sofort beenden
```

## Konventionen
- Einfach halten: reines HTML/CSS/JS ohne Frameworks oder Build-Tools.
- Code-Stil von `script.js` beibehalten (Konstanten in UPPER_CASE, kleine Funktionen, `getElementById`).
