<!-- titel: Bau-Log fasst Warnungen je Art zusammen -->
Auftrag: bau-log-warnungen-zaehlen

## Was jetzt anders ist
Am Ende des Bau-Logs steht eine Zeile `Warnungen im Bau: N in M Arten — 3× Art; 2× Art …` (absteigend, höchstens 20 Arten, Rest als „… k weitere Arten“, dazu die Gesamtzahl). Im GitHub-Actions-Lauf wird dieselbe Zeile an `$GITHUB_STEP_SUMMARY` angehängt, wenn die Variable gesetzt ist. Die Zeile enthält bewusst kein „⚠ WARNUNG“, damit die Annotationsschleife im Datenlauf sie nicht zur Annotation macht.

## Umsetzung
- `pipeline/lib/warnungen-zaehlen.ts` (neu): `zaehleWarnung`, `artDerWarnung`, `warnungsZusammenfassung`, `meldeWarnungen`.
- `pipeline/lib/util.ts`: `log` und `warn` (die zentralen Ausgabehelfer des Baus) zählen jedes Textargument mit „WARNUNG“; kein Parsen der Konsole.
- `pipeline/build.ts`: `meldeWarnungen()` nach der Auslieferung.
- `pipeline/check-warnungen-zaehlen.ts` (neu, 19 Zusicherungen) und Eintrag in `tools/check-logic-liste.txt`.

## Annahmen
- Art = Text nach „WARNUNG“ bis zum ersten „:“ (höchstens 40 Zeichen), sonst die ersten drei Wörter.
- Gezählt werden nur Warnungen, die im Bau-Prozess über `log`/`warn` laufen. Zeilen aus den Bestandsprüfungen (`console.log` in `*-bestand.ts`) entstehen in `check:bestand`, nicht im Bau, und stehen weiter in `bestand-pruefung.txt`.
- Keine Verhaltensänderung am Datensatz: nur Zähler im Speicher plus eine Logzeile; `public/data` wird nicht berührt. Der Bauvergleich ist hier nicht lauffähig (kein `data/cache` in der Cloud), die Begründung ist die Diffgröße: kein Code, der in `public/data` schreibt, wurde angefasst.
- Patch Notes: keine, interne Änderung.

## Prüfung
- Test zuerst gegen die Basis rot (`log/warn aus util zählen mit` lieferte 0), nach dem Fix grün (19/19). `npx tsc --noEmit -p .` grün, `check-eingabe-stand.ts` (berührt `util.ts`) grün, die Umfangsprüfung in Ordnung.

## Mutationstabelle (Diff-Mutanten)
68 Mutanten, 3 überlebt, 0 unbrauchbar. Überlebende sind gleichwertig:
| Stelle | Mutant | Grund |
|---|---|---|
| `pipeline/lib/warnungen-zaehlen.ts:18` | `<=` → `<` | Bei genau 40 Zeichen liefert der Ersatzweg (drei Wörter, auf 40 gekappt) dasselbe Ergebnis. |
| `pipeline/lib/warnungen-zaehlen.ts:38` | `localeCompare` ohne 2. Argument | Locale `de` ändert die Reihenfolge nur bei Umlauten, die als Art-Anfang nicht vorkommen. |
| `pipeline/lib/warnungen-zaehlen.ts:48` | `appendFileSync` ohne Kodierung | Standard ist UTF-8. |
`pipeline/build.ts` und `pipeline/lib/util.ts` bekommen keine Mutanten (kein zugeordneter Test; der Bau braucht `data/cache`).
