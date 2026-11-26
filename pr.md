<!-- titel: feat(handlung): Ein-Satz-Handlung einbinden (Lader, Bauphase, Prüfung) -->
Auftrag: handlung-satz-einbinden

## Was
Einbindung der Ein-Satz-Handlung (Zweig `feat/handlung-satz-einbinden`): `pipeline/lib/handlung-satz.ts` lädt alle `data/curated/ein-satz-handlung/*.yaml` (fehlender Ordner = leer) und prüft die Form; `pipeline/bau/handlung-satz-einbinden.ts` schreibt `satz` (bei `umfang: reihe` zusätzlich `satzReihe`) neben `de`/`en` in die Synopsen-Gruppe, aufgerufen in `13-schreiben.ts` hinter den eigenen Handlungstexten. Typ-Felder in `SynopsisEintrag` und `Synopsis` (Web). Keine Sätze, keine Anzeige im Panel.

## Beleg
- `pipeline/check-handlung-satz.ts` (check:logic): Fixture-Ordner mit zwei Teil-Dateien, einem Doppel über Dateien, einem zu langen Satz, Bauphase, Bestandsfunktion (Titel fehlt, Satz = Titel, 5-Wort-Nähe über die vorhandene Wortnähe-Prüfung). Grün: Exit 0.
- `pipeline/check-handlung-satz-bestand.ts` (check:bestand) gegen den echten Bestand: 0 Verstöße (Ordner noch leer).
- Basis rot: derselbe Test gegen die main-Fassung: `ERR_MODULE_NOT_FOUND … pipeline/lib/handlung-satz.ts`, ENDE 1.
- `npx tsc --noEmit -p .` Exit 0, `npm run check:umfang` Exit 0 (eine Kette im Test aufgeteilt), `check-handlung-eigen` unverändert grün, Mutationsanker-Test, check-workflows, uhr-in-tests, stumme-pfade grün.
- Neue Prüfungen stehen in `tools/check-logic-liste.txt` und `tools/check-bestand-liste.txt`.
- Quellenliste der Läufe: nicht nötig, die Teil-Dateien sind Handdateien, kein Lauf schreibt sie.

## Live-Beleg
entfällt

## Patch Notes
Patch Notes: keine – intern: Einbindung und Prüfung, ein Typ-Feld im Web ohne Anzeige
