<!-- titel: fix(daten): Steel Ball Run zählt Folgen wie Netflix -->
## Ursache
„2nd & 3rd STAGE“ (Titel 210482) zählte seine elf Termine ab Folge 1. Folge 1 lief aber schon am 19.03. als eigener Titel (190327); Netflix zählt durch: 27.11. ist Folge 11, das Finale am 04.12. Folge 12. Der Kalender zeigte „Folge 10“ und „Folge 11 = Finale“.

## Änderung
`steel-ball-run-2nd-3rd-stage` bekommt `schedule.firstEpisodeNumber: 2` (`episodeCount: 11` bleibt Zahl der Termine); `zeiten` auf die Gesamtnummern 7–12 umgestellt. Wächter `pipeline/check-netflix-zaehlung.ts` (Fixtures, festes Datum, in `tools/check-logic-liste.txt`). Patchnote: „Steel Ball Run: Folgennummern wie auf Netflix“.
Prüfungen nicht abgeschwächt: `pruefung.ts` nimmt Termine mit `firstEpisodeNumber` aus der Titelzahl-Prüfung aus, und `folgenDavor` ignoriert Termine über der Titelzahl (12 > 11, durchlaufende Zählung). Folge 1 gehört zu Titel 190327 (Handbeleg dort vorhanden); eine Anhebung von `episodes` auf 12 war nicht nötig, der Kasten nennt mit 11 wie mit 12 „Finale Folge 12“ (Wächter prüft beides).

## Klasse
Nicht geschlossen, nur Zählung offen: weitere Netflix-Titel mit eigener Folge-1-Seite und Fortsetzungstermin ab 1 wurden nicht gezählt.

## Quellen
jojowiki.com/Steel_Ball_Run_(Anime) (Folge 11 am 27.11., 12 am 04.12.); whats-on-netflix.com/news/steel-ball-run-part-2-netflix-release-date/ (11 neue Folgen bis 04.12.); Daniel-Sichtung Netflix 26.11.2026 (10 Folgen sichtbar).

## Beleg
Schnellweg auf dem Release aus `releases.json` mit der YAML-Änderung (`expandEvents`, `istStaffelstart`, `istStaffelfinale`):
- vorher (rot): 27.11. Folge 10, 04.12. Folge 11 = FINALE.
- nachher (grün): 25.09. Folge 2 (Start), 27.11. Folge 11 ohne Finale, 04.12. Folge 12 = FINALE; elf Termine.
- Mutationsprobe: ohne `firstEpisodeNumber` schlagen 5 von 5 Prüfungen des Wächters an. `tsc --noEmit`, `check:umfang`, `check-folge-ueber-titel` grün. Voller Bau und `check:bestand` lokal nicht möglich (kein `data/cache`), laufen in der PR-Kette.

## Geänderte Dateien
- `data/curated/batch-2026.yaml` – `firstEpisodeNumber: 2`, `zeiten` 7–12
- `pipeline/check-netflix-zaehlung.ts` – neuer Wächter
- `tools/check-logic-liste.txt` – Wächter eingetragen
- `data/patchnotes/steel-ball-run-folgennummern.yaml` – Patchnote

🤖 Generated with [Claude Code](https://claude.com/claude-code)
