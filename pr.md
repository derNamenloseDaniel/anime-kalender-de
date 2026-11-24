<!-- titel: fix(lighthouse): TBT-Bänder neu (p99 × 1,15 aus 557 Läufen), Ausnahmeweg der Ratsche -->
## Worum es geht

Der Lighthouse-Nachlauf 45424597997 schlug Alarm (Titel TBT 1102 > 1100 im Band mittel, benchmark 2754, 4 Punkte über der Kante 2750). Die Analyse (Zweig `analyse/tbt-baender-2411`, Bericht `tbt-baender-2026-11-24.md`) zeigt: 557 Läufe vom 21.–24.11., 27 Fehlalarme, keine Regression an einem Commit. Die Grenzen vom 21.11. stammten aus 15–29 Läufen je Band und lagen mitten in der Verteilung. Dieser PR setzt Vorschlag 1 des Berichts um (TBT-Grenze = p99 des Bands × 1,15, auf 10 aufgerundet) und baut den bisher fehlenden, sichtbaren Ausnahmeweg der Ratsche.

## Grenzen (TBT in ms, schnell ≥ 3250 / mittel 2750–3250 / langsam < 2750)

| Seite | alt (21.11.) | neu (24.11.) |
|---|---|---|
| Kalender | 100 / 150 / 250 | 110 / 170 / 260 |
| Datenbank | 540 / 730 / 1320 | 680 / 980 / 1420 |
| Titel | 760 / 1100 / 1610 | 1090 / 1210 / 1720 |

Bandkanten (2750, 3250) und Performance-Grenzen unverändert. Beide Profile (`pr`, `live`) teilen die Bänder.

## Dateien

- `tools/lighthouse-grenzen.mjs`: neue TBT-Werte in `BAND_*`, Kommentar auf die neue Basis (557 Läufe, 21.11. 01:37 bis 24.11. 15:21 UTC, p99 × 1,15, Datum 24.11.2026); neue exportierte Liste `LOCKERUNGEN` (`{ profil, seite, grenze, von, auf, datum, grund }`) mit den 18 Schritten dieses PR (9 Grenzen × 2 Profile).
- `tools/lighthouse-urteil.mjs`: `gelockert(neu, alt, erlaubt)` lässt eine Lockerung nur durch, wenn genau dieser Schritt (profil/seite/grenze, von → auf) in `erlaubt` steht; alles andere bleibt rot.
- `tools/lighthouse-messen.mjs`: reicht `LOCKERUNGEN` an die Ratsche weiter.
- `tools/lighthouse-urteil.test.mjs`: Bandfälle auf die neuen Grenzen (je ein Fall genau 1 ms über der Grenze), Ausnahmeweg je Feld (anderes Profil, Seite, Grenze, von, auf: rot), weiter als eingetragen rot, entfernte Grenze rot, die Lockerung dieses PR gegen die main-Werte grün nur mit `LOCKERUNGEN`, der Alarmfall 45424597997 grün.
- `tools/lighthouse-messen.test.mjs`: Gesamtlauf im PR-Ereignis über Wegwerf-Repos: eingetragene Lockerung grün, anderer Schritt eingetragen rot.
- `tools/mutationen/lighthouse-lockerungen.json`: neue Mutationsliste, 15 Mutanten + Kontrolle.
- `docs/wissen/betrieb.md`: Abschnitt „TBT auf den Runner normiert“ auf die neue Basis (Tabelle n/Median/p95/max/alt/neu), Regel p99 × 1,15 aus ≥ 100 Läufen, Ausnahmeweg der Ratsche, Restrisiko Runner-Gruppe 2600–2850 an der Kante 2750; veraltete n = 15/24/29, „Mittel + 4,3 σ“, Gruppe 2650–3050 und „ein Lauf über der Band-Grenze ist ein Befund (Regression)“ ersetzt. Absatz zur Ratsche im Abschnitt „Lighthouse und Leerlauf als Wächter“ nennt den Ausnahmeweg.

## Beleg

- Rot an der Basis: die neuen Tests gegen die main-Fassung von `lighthouse-urteil.mjs` und `lighthouse-messen.mjs` scheitern: `AssertionError: genau dieser Schritt eingetragen: erlaubt` bzw. `AssertionError: eingetragene Lockerung im PR: grün` (Exit 1). Die Ratsche von main meldet für diesen PR 18 Lockerungen (`pr/Kalender/tbt: 100 → 110` …), die neue mit `LOCKERUNGEN` 0, ohne Liste ebenfalls 18.
- Grün am Kopf: `node tools/lighthouse-urteil.test.mjs` ✓, `node tools/lighthouse-messen.test.mjs` (25 Zusicherungen) ✓, `mutationsanker-alle`/`mutationsanker-ohne-tests` ✓.
- Mutationsprobe `node tools/mutationslaeufer.mjs tools/mutationen/lighthouse-lockerungen.json`: 15 rot, 0 überlebt, Kontrolle grün.
- Kein Drift-Wächter in diesem PR (kommt separat).

Patch Notes: keine (nur Prüfkette)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zqg8xPmWNN1LUnBtiW
