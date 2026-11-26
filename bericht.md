# Bericht: tools-tests-ratsche

- Ratsche gefunden: `tools/werkzeug-ohne-test-bekannt.txt`, Wächter `tools/werkzeug-ohne-test-wache.mjs` (Liste darf nur schrumpfen). Stand 160 Einträge → 140; Wächter meldet 144 von 573 Werkzeugen ohne Test (140 + 4 Freigaben).
- 20 neue `tools/*.test.mjs` auf Zweig `test/tools-tests-ratsche`: ak-von, bilder-ordner, trefferprobe-ausnahmen, oder-true-ausnahmen, ansicht-filterfenster-rechner, ansicht-hover-cover-zeilen, favoriten-rand-messen, buehne-reihen-messen, tempo-kern, panel-sperre, ladezeiten-ausgabe, prime-nachschlag, quell-baum, cover-nach-r2, handlung-fakten/anisearch-karte und je Detektiv-Datei regel, wache, einstufung, bericht, regeln-termine.
- Fixtures statt Netz, keine Tokens; Browser-Werkzeuge über Attrappen oder nur ihre reinen Rechenfunktionen. Einhängen: `tests-alle` findet `*.test.mjs` selbst, `check-logic-liste.txt` unberührt (genau einmal).
- Mutationsprobe (Kernzeile je Test gebrochen): erst 17 von 20 rot; tempo-kern, anisearch-karte, favoriten-rand-messen hatten Lücken, Tests geschärft, danach 20 von 20 rot (Skript im Scratchpad, Werkzeuge per `git checkout` zurück).
- `tsc --noEmit -p .` und `check:umfang` grün; kein Werkzeug geändert, kein Fehler in einem Werkzeug gefunden.
- Auswahl: „meistgenutzt“ nach Aufrufen in Workflows/package.json/.claude/tools war nur bei wenigen Browser-Messwerkzeugen hoch; genommen wurden die mit testbarer Logik nach Nutzungsrang, kein Browser nötig.

## Rückblick
- gut: Wächter nennt die zu streichenden Zeilen selbst; Mutationsskript fand 3 Lücken sofort.
- schlecht: `git fetch` nur des Auftragszweigs ließ `origin/main` im flachen Klon veraltet („no merge base“); erst `fetch --unshallow` half.
- unerwartet: `.d.mts`-Dateien zählen als Werkzeuge in der Liste (17 Einträge), ein Test dafür wäre sinnlos.
- Vorschlag: `.d.mts` in `istWerkzeug` ausnehmen wie `.d.ts`; Rang der meistgenutzten Werkzeuge ohne Test (poc-urteil, ladezeiten-messen) braucht Browser-Fixtures.
- veraltet: Auftragstext „175 von 504“ — Stand heute 144 von 573.
