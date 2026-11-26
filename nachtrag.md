## Nachtrag (Cloud-Nachbesserung Runde 1, 5109)

Commit 1b2879895 auf `feat/handlung-satz-einbinden`; main war schon eingemergt (Merge „Already up to date“).

- A1: umgesetzt - `check-handlung-satz.ts` hinter `check-handlung-quelle.ts` in `tools/check-logic-liste.txt`, `check-handlung-satz-bestand.ts` hinter `check-handlung-quelle-bestand.ts` in `tools/check-bestand-liste.txt`. Beleg: beide Listen ohne Kommentarzeilen mit `LC_ALL=C sort -c` in Ordnung; der Vollauf von `check-logic-alle` läuft in der Kette (lokal gesperrt).
- A2: umgesetzt - `check-handlung-satz.ts` liest `pipeline/bau/13-schreiben.ts` und verlangt den Aufruf `ergaenzeSaetze(synopses, new Set([...slim, ...verschoben].map((t) => t.id)))`. Beleg: Zeile gelöscht → rot; `verschoben` aus der Menge entfernt → rot.
- A3: umgesetzt - Filter und Sortierung als exportierte `teilDateien(namen)` in `pipeline/lib/handlung-satz.ts` (Verhalten gleich, `ladeSaetze` ruft sie); Test mit unsortierten Namen samt Fremddatei. Grund: readdir war hier schon sortiert, ein Test über echte Dateien konnte den Mutanten nie treffen. Beleg: `.sort()` entfernt → rot.
- A4: umgesetzt - Befund: der Wächter beendete immer mit Exit 0, anders als `check-handlung-quelle-bestand.ts` (Exit 1 bei Verstoß). Jetzt `process.exit(verstoesse.length ? 1 : 0)`, Schlusszeile `VERSTÖSSE: <n>` blieb. Test fährt das Skript mit `AK_ROOT`-Kulisse: Satz = Titel → Exit 1 und `VERSTÖSSE: 1`; guter Satz → Exit 0 und `VERSTÖSSE: 0`. Beleg: Mutant `process.exit(0)` → rot.
- Übrige Hinweise des Urteils: keine weiteren Auflagen.

Geprüft lokal: `npx tsx pipeline/check-handlung-satz.ts` Exit 0, `npx tsc --noEmit -p .` Exit 0.
