# CLAUDE.md

## Projekt
Whack-A-Hamster ("Hau den Hamster") – ein kleines Browser-Spiel als Praxis-/Lernbeispiel für HTML, CSS und JavaScript. Ein Hamster 🐹 erscheint in zufälligen Löchern eines 3×3-Rasters und muss angeklickt werden. Eine Runde dauert 30 Sekunden.

Sprache der Oberfläche und Kommunikation: Deutsch.

## Ausführen
Kein Build, keine Abhängigkeiten, keine Tests. `index.html` direkt im Browser öffnen (Doppelklick). Das Spiel startet automatisch beim Laden.

Die weltweite Bestenliste braucht Internet (Supabase). Beim Öffnen per Doppelklick (`file://`) funktioniert sie ebenfalls, Supabase erlaubt alle Origins.

## Dateien
- `index.html` – Aufbau: Überschrift, HUD (Punkte `#score`, High-Score `#highscore`, Zeit `#time`), leerer Container `#grid`, Bestenliste `#leaderboard` (Tabs `#tab-global`/`#tab-local`, Namensformular `#name-form` mit `#name-label`, `#player-name` und Datenschutz-Hinweis `#name-hint`, Tabelle mit `#leaderboard-body`, anfangs ausgeblendet), Ergebnistext `#result`, Button `#restart`. Bindet `style.css` und `script.js` ein.
- `style.css` – Aussehen: dunkelvioletter Hintergrund (`#180630`), 3×3-Grid aus runden `.hole`-Elementen (100 px), aktives Loch `.hole.active` gelbgrün (`#E2F068`), `#restart` standardmäßig ausgeblendet. Bestenliste übernimmt Schrift/Farbe des Spiels, Kopfzeile `#E2F068`, bester Eintrag (`tr.best`) fett, frisch eingetragener Eintrag (`tr.new`) hinterlegt, aktiver Tab (`.tab.active`) violett gefüllt.
- `script.js` – Spiellogik (Vanilla JS, keine Bibliotheken).
- `supabase/schema.sql` – Tabelle `scores` und Zugriffsregeln der weltweiten Bestenliste (im Supabase SQL Editor ausführen, mehrfach ausführbar).

## Weltweite Bestenliste (Supabase)
- Projekt `ovwwnpwughlsfauypucl` (Region Frankfurt), Tabelle `public.scores`: `id`, `name` (1–15 Zeichen nach `trim`), `score` (1–40, CHECK gegen unmögliche Werte), `created_at` (vom Server gesetzt, UTC).
- RLS: Gäste (`anon`) dürfen nur `SELECT` und `INSERT`; `UPDATE`/`DELETE` sind entzogen. Aufräumen nur im Supabase-Dashboard.
- Zugriff per `fetch` auf die REST-API (`/rest/v1/scores`), nur mit Header `apikey`. Der Publishable Key (`sb_publishable_…`) ist öffentlich und steht im Code; den Secret-/`service_role`-Key nie in den Code.
- Schutz gegen Schummeln nur über die CHECK-Grenzen. Fake-Ergebnisse ≤ 40 sind möglich, ein Spiel-ID-Mechanismus (Mindestdauer 30 s per RPC) wäre die nächste Ausbaustufe.

## Spiellogik (script.js)
Konstanten oben in der Datei:
- `GRID_SIZE = 9` – Anzahl der Löcher
- `ROUND_SECONDS = 30` – Rundendauer
- `MOLE_VISIBLE_MS = 800` – Intervall, in dem der Hamster das Loch wechselt (kleiner = schwerer)
- `HIGHSCORE_KEY = 'whackamole-highscore'` – Schlüssel für den High-Score in `localStorage`
- `LEADERBOARD_SIZE = 5` – Anzahl der Einträge in der Bestenliste
- `LEADERBOARD_KEY = 'whackamole-leaderboard'` – Schlüssel für die Bestenliste in `localStorage` (JSON-Array, max. 5 Einträge `{ name, score, date }`, `date` als lokale Zeit `'JJJJ-MM-TTTHH:MM:SS'` ohne `Z`)
- `NAME_MAX_LENGTH = 15`, `DEFAULT_NAME = 'Anonym'` – Namenseingabe (leerer Name → „Anonym“)
- `SUPABASE_URL`, `SUPABASE_KEY` (Publishable Key), `SCORES_URL`, `FETCH_TIMEOUT_MS = 5000` – weltweite Bestenliste

Funktionen:
- `loadHighscore()` / `saveHighscore()` – lesen/schreiben den High-Score in `localStorage` (mit `try/catch`, Fallback 0)
- `buildGrid()` – erzeugt die Löcher und hängt Klick-Handler an
- `showMole()` – setzt den Hamster in ein zufälliges Loch (entfernt ihn aus dem alten)
- `whack(hole)` – +1 Punkt bei Treffer auf das aktive Loch; Fehlklicks ohne Abzug
- `tick()` – Countdown pro Sekunde, ruft bei 0 `endGame()` auf
- `startGame()` – setzt Zustand zurück, startet `moleTimer` und `countdownTimer` (`setInterval`)
- `endGame()` – stoppt Timer, aktualisiert ggf. den High-Score („🏆 Neuer High-Score!“), zeigt Ergebnis, blendet `#restart` ein, zeigt die Bestenliste statt des Spielfelds. Lädt danach die weltweite Liste und zeigt erst dann das Namensformular (`roundId` verwirft Antworten aus einer alten Runde). Der Tab springt auf die Liste, in die man sich eintragen darf.
- `parseDate(dateStr)` – prüft `'JJJJ-MM-TT'` bzw. ISO mit Uhrzeit (`DATE_PATTERN` + Kalenderprüfung), liefert Zeitstempel in ms oder `null` bei ungültigem Datum
- `pad(n)` – zweistellige Zahl mit führender Null
- `formatDate(dateStr)` – `'JJJJ-MM-TT'` → `'TT.MM.JJJJ'`; mit Zeitzone (`Z`/`+00:00`, Server-Daten) wird in Ortszeit umgerechnet
- `loadGlobalLeaderboard()` – holt die Top 5 vom Server (sortiert `score.desc,created_at.asc`), Mikrosekunden werden auf ms gekürzt
- `saveGlobalEntry(name, points)` – `POST` an Supabase, liefert die `id` des neuen Eintrags
- `refreshGlobalLeaderboard()` – lädt neu und setzt `globalStatus` (`'loading'`/`'ok'`/`'error'`), Anzeige „Lade …“ bzw. „nicht erreichbar“
- `switchTab(tab)` – `'global'`/`'local'`; beim Wechsel auf einen fehlerhaften globalen Tab wird neu geladen
- `compareEntries(a, b)` – Sortierregel: mehr Punkte zuerst; bei Gleichstand früherer Zeitpunkt (inkl. Uhrzeit) besser; ungültiges Datum immer schlechter; bei identischem Zeitpunkt alphabetisch nach Name
- `getTopEntries()` – sortiert `leaderboard` mit `compareEntries`, max. `LEADERBOARD_SIZE`
- `renderLeaderboard()` / `renderMessage(text)` / `showLeaderboard()` / `hideLeaderboard()` – Tabelle des aktiven Tabs aufbauen (per `textContent`) und statt `#grid` ein-/ausblenden; ungültige Daten werden als Rohwert rot angezeigt (`td.invalid-date`)
- `loadLeaderboard()` / `saveLeaderboard()` – lesen/schreiben die lokale Bestenliste in `localStorage` (`try/catch`, Fallback `[]`; im Testmodus wird nicht gespeichert)
- `qualifies(points, top)` – `points > 0` und (Liste `top` nicht voll oder mehr Punkte als Platz 5; Gleichstand reicht nicht, da das neue Ergebnis das späteste ist). Wird für lokal (`getTopEntries()`) und global (`globalLeaderboard`) genutzt.
- `addEntry(name, points)` – fügt lokalen Eintrag mit `localDateTime()` hinzu, kürzt auf Top 5, speichert
- `showNameForm()` / `hideNameForm()` / `submitName(event)` – ein Namensformular für beide Listen. Der Text passt sich an (`canEnterLocal`/`canEnterGlobal`), der Datenschutz-Hinweis erscheint nur bei globalem Eintrag. `entrySaved` verhindert Doppel-Eintrag. Hervorgehoben werden `newEntry` (lokal) bzw. `newGlobalId` (global). Schlägt das Speichern fehl, wird „Weltweiter Eintrag fehlgeschlagen“ an `#result` angehängt.
- `setTestLeaderboard(entries)` – Test-Hilfe: setzt lokale Dummy-Daten, schaltet `testMode` ein (weder lokale Bestenliste noch High-Score werden gespeichert, nichts geht an den Server; Neuladen bringt echte Daten zurück)
- `clearLeaderboard()` – Test-Hilfe: löscht die gespeicherte lokale Bestenliste

High-Score im HUD (`HIGHSCORE_KEY`) bleibt unabhängig von den Bestenlisten.

Zustand liegt in globalen Variablen (`score`, `highscore`, `timeLeft`, `holes`, `activeHole`, `running`, `leaderboard`, `globalLeaderboard`, `globalStatus`, `activeTab`, `canEnterLocal`, `canEnterGlobal`, `roundId`, `testMode`, `entrySaved`, `newEntry`, `newGlobalId`, Timer-IDs).

## Bestenliste testen
Eintragsformat: `{ name: 'Anna', score: 27, date: '2026-11-01' }`. In der Browser-Konsole:
```js
setTestLeaderboard([{ name: 'Anna', score: 27, date: '2026-11-01' }]); // Testmodus, speichert nichts
score = 20; endGame();  // Runde sofort mit 20 Punkten beenden
clearLeaderboard();     // gespeicherte Liste löschen
```
Die weltweite Liste nicht mit echten Einträgen testen, denn die landen öffentlich und lassen sich nur im Dashboard löschen. Zum Testen lieber das `POST` in der Konsole simulieren (`window.fetch` überschreiben). Den Schutz prüfen: `curl` mit `score: 9999` muss `400` liefern, `DELETE`/`PATCH` müssen `401` liefern.

## Konventionen
- Einfach halten: reines HTML/CSS/JS ohne Frameworks oder Build-Tools.
- Code-Stil von `script.js` beibehalten (Konstanten in UPPER_CASE, kleine Funktionen, `getElementById`).
