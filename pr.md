<!-- titel: TMDB-Film mit eigener aniSearch-Zeile gilt nicht als mehrdeutig -->
Auftrag: fsk-filmpartner

Baut auf: fix/fsk-abdeckung (zuerst mergen)

## Was jetzt anders ist
`mehrdeutigeFilmzuordnungen` zählt eine aniSearch-Zeile (Kennung ab 10 000 000) nicht mehr als Partner, wenn ein anderer Titel derselben Filmgruppe ihre aniSearch-Seite trägt (aniSearch-Brücke: Abruf, Katalogabgleich, Handdatei). Solch eine Zeile kommt nie neben ihrem Träger in den Bestand (`vergebeneSeiten`), es ist dasselbe Werk. Spycies (163696, Partner 10014868) und Der Herr der Ringe: Die Schlacht der Rohirrim (185613, Partner 10019566) behalten damit nach dem nächsten Bestandsbau FSK (6 bzw. 12), Handlung, Anbieter und Plakat aus TMDB. Echte Mehrdeutigkeiten bleiben: Code Geass Akito (zwei AniList-Titel derselben Seite) und Kitaro (aniSearch-Zeile ohne Träger in der Gruppe) werden weiter verworfen.

## Umsetzung
- `pipeline/lib/tmdb-eindeutig.ts`: neuer Parameter `seiteVon` (Standard leer = alte Regel), Hilfsfunktion `ohneSeitenzwillinge`; der Rückfall `ladeGeteilteFilme` (Bestandsprüfungen ohne Bau-Datei) gibt die Brücke mit.
- `pipeline/bau/01-quellen.ts`: `ladeQuellen()` ruft mit `anisearchBruecke()` auf.
- `pipeline/check-tmdb-film-zwilling.ts` (neu, 10 Zusicherungen) samt Eintrag in `tools/check-logic-liste.txt`: beide belegten Fälle, Gegenproben Akito und Kitaro, Zwilling plus dritter Titel, Träger außerhalb der Gruppe, Grenze 10 000 000, Rückfall ohne Bau-Datei und Verdrahtung über `ladeQuellen()` (Wegwerf-Wurzel, Brücke einmal aus `anisearch.json`, einmal aus der Handdatei).
- `docs/wissen/maengel.md`: Vorschlag als behoben nachgeführt.
- `data/patchnotes/fsk-fuer-spycies-und-rohirrim.yaml`: Patch Note.

## Klasse (andere Stellen mit Partnern ohne Bestandsprüfung)
Gemessen an `tmdb-titles.json` (26.11.2026): 8 Filmgruppen mit mehr als einem Titel, nur die zwei belegten haben einen Partner außerhalb von dem ausgelieferten Bestand (`titles.json`), beide sind Seitenzwillinge. Weitere Stellen durchgesehen, keine Änderung nötig:
- `geteilteFilmGruppen` und `reihenfremdImBestand`: prüfen den Bestand schon (`imBestand`, `reiheVon`).
- `mehrfachBelegt` (Staffel 0): `holeStaffel0` streicht vorher jeden Eintrag ohne Bestandstitel.
- `pruefeTmdbHandBestand` (`fremdGeteilt`): ein Handeintrag ohne Bestandstitel macht dort schon die Zusicherung „jede AniList-Kennung steht im Bestand“ rot; kein stiller Fehlbefund.
- `geteilteJwKennungen`: gruppiert nach verschiedenen TMDB-Kennungen, Zwillinge teilen dieselbe; `justwatch-audio.json` hat 0 Zwillingspaare.
- `gesperrteSerienTreffer`, `titelMitKopierterAnbieterliste`: der Partner ist dort ein anderes Werk, ob er im Bestand steht, ändert das Urteil nicht.

## Annahmen
- „Im Bestand“ ist beim Laden der Quellen noch nicht bekannt (die Titel entstehen erst in Phase 02, und deren Plakatfilter braucht die Menge schon). Die Brücke ist das Merkmal, an dem `vergebeneSeiten` später die Zeile aus dem Bestand nimmt; deshalb entscheidet sie hier.
- Bauvergleich am echten Bau nicht möglich (kein `data/cache` in der Cloud); die Wirkung zeigt der nächste Bestandsbau: das Bau-Log nennt 4 verworfene TMDB-Zuordnungen weniger.

## Prüfung
- Neuer Test zuerst gegen die Basis rot (3 von 8 Zusicherungen), nach dem Fix grün (10/10).
- Grün: `check-tmdb-geteilt-plakat`, `check-tmdb-geteilt-plakat-bau`, `check-tmdb-reihenfremd`, `check-tmdb-von-hand-abgeleitet`, `check-tmdb-hand-vorrang-bau`, `check-maengel-bau-lauf`, `check-anilist-produkt`, `check-fsk-justwatch-bilanz`, `check-logic.ts`, `check-patchnotes`, `npx tsc --noEmit -p .`, Mutationsanker (0 nicht auffindbar), Umfang in Ordnung.

## Mutationstabelle (Diff-Mutanten)
`diff-mutanten.mjs --basis origin/fix/fsk-abdeckung --test "npx tsx pipeline/check-tmdb-film-zwilling.ts"`: 30 Mutanten, 1 überlebt, 0 unbrauchbar.
| Stelle | Mutant | Ergebnis |
|---|---|---|
| `pipeline/lib/tmdb-eindeutig.ts:78` | `new Set(ids)` → `new Set()` | überlebt im neuen Test (der Zweig mit Bau-Datei ist nicht sein Thema); von Hand gegen `check-tmdb-geteilt-plakat-bau.ts` gefahren: rot („Bestandsprüfung bekommt dieselbe Menge aus dem Bau“). |
Alle übrigen 29 (Grenze `<`/`<=`, Filterbedingung, Brücken-Argument in Bau und Rückfall, Zählschwelle) rot.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zoXL5DV56yGsQtinxd
