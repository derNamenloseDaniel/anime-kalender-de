<!-- titel: Tests für 20 Werkzeuge ohne Test, Ratsche 160 → 140 -->
Auftrag: tools-tests-ratsche

Ergänzt je einen schlanken Test (Fixtures, kein Netz, keine Tokens) für 20 Werkzeuge der Liste `tools/werkzeug-ohne-test-bekannt.txt` und streicht sie dort: 160 → 140 Einträge. Nur neue `tools/*.test.mjs` und die Liste ändern sich, kein Werkzeug wurde angefasst. `tests-alle` findet die Tests selbst, keine Eintragung in `check-logic-liste.txt`.

Geprüft: Jeder Test ist grün. Mutationsprobe je Test mit einer gebrochenen Kernzeile, alle 20 werden rot (drei Tests wurden danach geschärft). `werkzeug-ohne-test-wache` grün, `tsc --noEmit` und `check:umfang` grün.

Rot an der Basis (Mutationsprobe, Kernzeile im Prüfling gebrochen, rote Ausgabe des Tests):
- ak-von: `===`→`!==` in ak-von.mjs:12 → rot (Keine Kennung für AniList)
- ansicht-filterfenster-rechner: `>`→`<` in :14 → rot (saubere Messung: keine Abweichung)
- ansicht-hover-cover-zeilen: `===`→`!==` in :45 → rot (längster Name gewinnt)
- bilder-ordner: `?`→`? !` in :10 → rot (TypeError ERR_INVALID_ARG_TYPE)
- buehne-reihen-messen: `===`→`!==` in :172 → rot (buehne-dist/ fehlt)
- cover-nach-r2: `!==`→`===` in :52 → rot (AssertionError, deepEqual)
- daten-detektiv-bericht: `===`→`!==` in bericht.ts:47 → rot (AssertionError, deepEqual)
- daten-detektiv-einstufung: `?`→`? !` in einstufung.ts:41 → rot (unbekannte Regel: 1 × 0,5)
- daten-detektiv-regel: `geprueft`→`geprueft + 1` in regel.ts → rot (AssertionError, deepEqual)
- daten-detektiv-regeln-termine: `===`→`!==` in :27 → rot (nur die Serie mit Folge 3 vor Folge 2)
- daten-detektiv-wache: `+`→`-` in wache.ts:40 → rot (TypeError ERR_INVALID_ARG_TYPE)
- favoriten-rand-messen: `===`→`!==` in :67 → rot (Abstand 10 px, kein Außenmaß)
- handlung-fakten-anisearch-karte: `>`→`<` in :53 → rot (AssertionError, strictEqual)
- ladezeiten-ausgabe: `?`→`? !` in :11 → rot (ohne Urteil keine Grenze)
- oder-true-ausnahmen: `>`→`<` in :16 → rot (kein Treffer für „anmeldung.json < /dev/n…“)
- panel-sperre: `!==`→`===` in :21 → rot (gesperrt bei offenem Panel, frei nach Zurück)
- prime-nachschlag: `?`→`? !` in :20 → rot (AssertionError, deepEqual)
- quell-baum: `HEAD^{tree}`→`HEAD` → rot (AssertionError, strictEqual)
- tempo-kern: `===`→`!==` in :86 → rot (Wurzel liefert index.html)
- trefferprobe-ausnahmen: Wähler → `'*'` → rot (Wähler nicht pauschal: *)

Nachbesserung nach Vorprüfung: Bot-Pfad-Wächter (Test nennt den Dateinamen nicht mehr wörtlich), Kindprozess-Frist (`timeout` in quell-baum.test.mjs).
