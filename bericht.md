# Bericht: waechter-isttot

- Neuer Wächter `pipeline/check-wege-stellen-istot.ts` (AST über `streams`/`watchLinks`, Liste `pipeline/lib/wege-stellen-geprueft.json`), in `check-logic-liste.txt` eingetragen; Mutationsprobe (istTot entfernt) wird rot, auch als Selbsttest.
- 44 Funktionen angesehen: 13 mit Tot-Frage, 31 „ohne“ mit Grund.
- Ein Befund behoben (eigener Commit): `09-6-3-kanal-kauf.ts` fragte `lautPruefungTot` nicht, Test `check-kanal-kauf-tot.ts` (rot gegen main, grün danach). Der MOTN-Fall 13-3-1 ist auf main schon geschlossen.
- `tsc`, beide Tests, `check-workflows`, `uhr-in-tests`, `umfang-pruefen` grün; `check-tote-adressen` 0 Verstöße, kein sichtbarer Datenunterschied, keine Patch Notes.
- Mutanten: 192/22 überlebt im ersten Lauf, danach getrennt je Test und nachgebessert; letzter Stand nicht als Vollauf wiederholt, Rest als gleichwertig begründet (Alias-Cache, `return undefined`, `join` mit Arbeitsordner = Wurzel).
- Nicht möglich in der Cloud: Bestandsbau, `data/cache`, `check:vor-commit`.

## Rückblick

- Gut: Syntaxbaum + Funktionsschlüssel statt Zeilennummern übersteht Umbauten; die vorhandene Ergebnisprüfung `check-tote-adressen` ergänzt die Quelltextseite.
- Schlecht: `diff-mutanten --test` gilt für alle Dateien des Diffs, zwei Tests ergeben dadurch viele Scheinüberlebende; Läufe dauern je ~7 min.
- Unerwartet: 4 der 31 „ohne“-Stellen sind Fehlalarme des Alias-Fundes (Kopien/Hilfsmengen), kein Weganlegen.
- Vorschlag: `diff-mutanten` mit Zuordnung Datei→Test (`--test datei=befehl`); später den Wächter zusätzlich auf Aufrufer-Delegation (`09-6-1`, `09-3-0`) ausdehnen, die heute als „ohne“ mit Grund stehen.
- Veraltet: nichts gefunden.
