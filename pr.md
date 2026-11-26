<!-- titel: fix(vorpruefung): Vertagung nur in der Patch-Notes-Zeile prüfen -->
Auftrag: vorpruefung-patchnotes-zeile

## Was
`tools/check-patchnotes-pflicht.mjs` (von der Vorprüfung genutzt) suchte „wirkt erst nach …“ / „nach dem nächsten Abruf“ im ganzen PR-Body (`VERTAGUNG_IM_TEXT`). Jetzt wird nur der Grund der Zeile „Patch Notes: keine – …“ geprüft. Das Format hat keinen Folgeblock, die Zeile ist einzeilig.

## Basis-Beleg
`node tools/check-patchnotes-pflicht.mjs` gegen die main-Fassung mit den neuen Fällen: Exit 1, Rot-Zeilen
- `✖ … Fließtext „nach dem nächsten Abruf“ bei sauberer Zeile ist grün (PR 3912)`
- `✖ … Fließtext „wirkt erst nach dem Bau“ bei sauberer Zeile ist grün`
Mit der Änderung: Exit 0, `✓ Patch-Notes-Pflicht: 99 Gegenproben`. Gegenprobe: Vertagung in der Patch-Notes-Zeile bleibt rot (`Vertagung in der Patch-Notes-Zeile bleibt rot`).

## Annahmen
- Die acht Textfälle von PR 2874 u. a. und zwei weitere standen im Fließtext; sie prüfen jetzt dieselben Sätze im Grund der Zeile (`inZeile`). Die Rückmessung vom 21.11.2026 fand im Fließtext 0 Treffer in 80 „keine“-PRs.
- „Messsatz mit nächster Bau“ bleibt im Fließtext (grün); in der Zeile träfe ihn `VERTAGUNG_IM_GRUND` schon vorher.

Patch Notes: keine – Werkzeug, 0 Titel/Termine/Meldungen/Wege/Zeilen.


## Prüfungen
- Die Gegenproben der Datei, die Vorprüfungs-Tests (zwei Dateien) und `npx tsc --noEmit -p .`: Exit 0. Die Datei steht schon in der Check-Logic-Liste.
- Mutationstabelle (diff-mutanten mit dem Gegenproben-Lauf als Test): 37 Mutanten, 16 überlebt, 0 unbrauchbar. Alle 16 liegen in Testdaten-Zeilen (198–213: Fixture-Felder `dateien`/`neu`/`beschreibung`, Zahl 1 → 0 im Fallnamen); der Mutant an der geänderten Logikzeile (`VERTAGUNG_IM_TEXT.test(grund)`) wurde erkannt.
- Vorprüfung mit diesem Text: grün, Exit 0.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77znEXzct6cHqdUnYz6n
