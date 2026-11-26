<!-- titel: TBT-Drift-Wächter und Auswertung der Sammler-Fristen -->
Auftrag: reste-funde-2411

## Was
Drei Reste aus Daniels Funden vom 24.11.:

1. **Katalog-Titel mit Disc-Termin ohne `anisearch.json`-Eintrag (Beispiel 10011635):** Gezählt: 269 von 2.924 Titeln ohne Eintrag (155 Katalogtitel, 114 AniList-Titel), 248 davon mit Disc-/Kauf-Weg. Ursache: Katalogtitel stehen per Bauart nie in `anisearch.json`. Der Weg ist seit PR 4854 geschlossen (Nachlese und Bestandswächter für Disc-Termine ohne Lesequelle); am Bestand bestätigt: 149 Titel mit frischem oder künftigem Termin, 3 ohne Eintrag (11635, 13220, 18543) werden nachgelesen, 0 ohne Lesequelle, alle 248 haben Kennung und archivierte Seite. Kein Codewechsel, keine Handdatei nötig. Beleg: `docs/wissen/quellen.md`.
2. **Fristen der Sammler:** Messung über alle Fassungen der drei Dateien (REST-API, 88 Fassungen), Empfehlung: alle drei Fristen bleiben (tmdb 60, aniSearch-Titel 180, -Artikel 180). Zahlen: `docs/wissen/quellen.md`, Abschnitt „Fristen der Titel-Sammler gegen die Änderungshäufigkeit“.
3. **TBT-Drift-Wächter** (`pipeline/check-tbt-drift.ts`, Logik `pipeline/lib/tbt-drift.ts`): Median der letzten 7 Tage gegen die 7 davor je Seite und Runner-Band; Warnung ab +10 %, Fehler ab +15 % und mindestens 20 ms, mindestens 20 Läufe je Woche, sonst „zu wenig“ (nie stilles Grün). Läuft in `check:logic` mit synthetischen Wochen und der echten Tabelle vom 21.11. Hängt Typen an `tools/lighthouse-urteil.d.mts`, damit die Bandgrenzen aus `grenzeFuer` kommen und nicht doppelt stehen.

## Annahmen
- Schwellen 10/15 % und 20 Läufe aus der Messung vom 21.–24.11. in `betrieb.md` (Drift 2,5–3,5 % am Tag, Verhältnis p95/Median 1,3–1,5) abgeleitet, nicht aus einem Wochensatz gemessen; sie sind Konstanten in `tbt-drift.ts`.
- Es gibt keine fortlaufende Läufe-Tabelle (die Läufe liegen in CI-Artefakten); der Wächter liest eine Tabelle im Format der Läufe-Tabelle vom 21.11.. Die Anbindung an den Lauf ist offen (siehe Bericht).
- Keine sichtbare Änderung für Besucher, daher kein Patch-Notes-Eintrag.

## Basis-Beleg
Neuer Test gegen die main-Fassung (ohne `pipeline/lib/tbt-drift.ts`): `npx tsx pipeline/check-tbt-drift.ts` → `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/user/anime-kalender-de/pipeline/lib/tbt-drift.ts'`, Exit 1. Mit der Lib: `check-tbt-drift: ok`, Exit 0.

## Mutationstabelle (Diff-Mutanten)
| Stand | Mutanten | überlebt | unbrauchbar |
|---|---|---|---|
| erste Fassung des Tests | 118 | 23 | 0 |
| nach Schärfung (Median numerisch/gerade/ungerade, Fenstergrenzen, 0 und NaN, volle Befundobjekte) | 115 | 0 | 0 |

## Geprüft
`npx tsc --noEmit -p .` grün; `npx tsx pipeline/check-tbt-drift.ts` grün; Eintrag sortiert in `tools/check-logic-liste.txt`.

Berührte Dateien: `pipeline/check-tbt-drift.ts`, `pipeline/lib/tbt-drift.ts`, `tools/lighthouse-urteil.d.mts`, `tools/check-logic-liste.txt`, `docs/wissen/quellen.md`, `docs/wissen/betrieb.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zom4KYs5DTjJPGLSyu
