<!-- titel: feat(werkzeug): bau-vergleich meldet Folgenlücken, pre-commit prüft Prüflisten-Sortierung -->
# Prüfwerkzeuge: Folgenlücken im Bauvergleich, Sortierprüfung vor dem Commit

Auftrag: pruefwerkzeuge-sammel

Zwei Kleinpunkte der Sammelzeile „Prüfwerkzeuge“. Die Vorprüfung und die Stufenwahl der PR-Kette (parallele Aufträge) sind nicht angefasst.

**(a) bau-vergleich meldet Folgenlücken.** Neues `tools/bau-vergleich-luecken.mjs`: Lücke = Folgennummer, die zwischen der kleinsten und größten Nummer in `schedule.observed` von releases.json fehlt. `beschreibeDatei` (`tools/bau-vergleich-stand.mjs`) hängt für diese Datei Zeilen an: `Folgenlücke neu|geändert|verschwunden: <slug> ohne Folge …` (Nummern ab sechs gekürzt, höchstens 20 Zeilen). Vorher stand eine neue Lücke nur als geänderter Schlüssel von `observed`. Ist-Stand releases.json am 26.11.2026: 9 von 926 Terminen haben eine Lücke (z. B. `black-clover-s2-crunchyroll-synchro`).

**(b) pre-commit prüft sortierte Listen.** Neues `tools/listen-gestagt-pruefen.mjs` (gestagte `tools/check-*-liste.txt`, Regel aus `liste-pruefen` wie in `check:logic`), eingehängt in `tools/quellen-commit-wache.sh` (`--einrichten`). Anlass Fall 4857: Nachbesserungen hängten Einträge ans Listenende. Nach dem Merge einmal `bash tools/quellen-commit-wache.sh --einrichten` im Hauptordner. Eingetragen in `tools/skript-aufrufer-ausnahmen.txt` (Hook; die Kette prüft dieselbe Regel in `check:logic`), Doku in `docs/wissen/projektregeln-im-detail.md`.

**Basis-Beleg (Test gegen die main-Fassung rot, danach grün).**
- (a) Einbindungstest in `tools/bau-vergleich-stand.test.mjs` gegen `tools/bau-vergleich-stand.mjs` von main: Exit 1, `AssertionError: releases.json meldet die Lücke: 1× [].schedule.observed.2 (entfernt)` (nur die Feldzeile, keine Lückenzeile); mit der Änderung Exit 0.
- (b) `tools/listen-gestagt-pruefen.test.mjs` gegen `tools/quellen-commit-wache.sh` von main: Exit 1, `AssertionError: Listen-Prüfung im Hook`; mit der Änderung Exit 0 (unsortiert, doppelt, sortiert mit Kommentar, Bestandsliste, Ausnahmen-Datei und gelöschte Liste außen).

**Mutationstabelle** (`node tools/diff-mutanten.mjs`, 114 Mutanten, 10 überlebt; erste Fassung der Tests: 25 überlebt, dann geschärft um Kürzung, 20-Zeilen-Grenze, Einbindung je Datei, Kopfzeile):

| Datei:Zeile | Mutant | Bewertung |
|---|---|---|
| `tools/bau-vergleich-luecken.mjs:14` | `<` → `<=` | gleichwertig, die größte Nummer steht in der Menge |
| `tools/bau-vergleich-luecken.mjs:25` | `return karte` → `if (false)` | gleichwertig, die `Array.isArray`-Absicherung fängt es |
| `tools/listen-gestagt-pruefen.mjs:11` | `windowsHide`, `maxBuffer`, `timeout`, `1`, `30000` | Prozessoptionen von `git`, im Test nicht beobachtbar |
| `tools/listen-gestagt-pruefen.mjs:15`, `:16` | Vorgabe `lies` / Argument entfernt | Tests rufen mit Fake-`lies` und über den Prozess auf, die Vorgabe wirkt nur im Hook |
| `tools/listen-gestagt-pruefen.mjs:32` | `===` → `!==` | Mutant führt `main()` beim Import im Test aus und beendet ihn mit 0, kein Befund |

Geprüft: berührte Tests, `npx tsc --noEmit -p .`, eslint der neuen Dateien, die Wächter für Workflows, Skript-Aufrufer, Werkzeuge ohne Test, Mutationsanker (Diff), stumme Pfade, Uhr in Tests und Netz in Tests. Nicht gefahren: bau-vergleich selbst (Bau ≈ 5 min, braucht den Ersatz-Cache; die Cloud hat keinen `data/cache`).

Annahmen: Lücke zählt nur in `schedule.observed` von releases.json; die Folgendateien unter `public/data/folgen/` haben kein Nummernfeld je Termin und bleiben außen. Prüfliste = `tools/check-*-liste.txt`; die Ausnahmen-Datei zählt nicht.

Kein Umbau: nur neue Dateien und eine Verzweigung in `beschreibeDatei`.

Patch Notes: keine (Werkzeug)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zrJKp2J5uDiKsxVirU
