# Nachtrag R1 (Zweig fix/delta-zuak-nachtraeglich, Kopf bd89aad8, origin/main eingemergt)

- A1: `mitNachtraeglichemZuAk` zieht die schon beim Bau als „zusammengelegt (zuAk)“ erklärte Anzahl (aus `erklaert`) von den umgeleiteten Kennungen ab. Test `[7000001, 5]` bleibt „1 Titel weniger“. Mutation (Abzug entfernt) → Test rot.
- A2: Testfall mit vorhandenem `erklaert` (verschoben) prüft Reihenfolge und Erhalt. Mutation `e.erklaert.slice(0, 0)` → Test rot.
- A3: `jetztUmgeleitet` zählt nur `zuAk`, dessen Ziel-ak als Spalte 0 im Bestand steht; Test „zuAk auf nicht vorhandene ak → rot“. Mutation (Prüfung entfernt) → Test rot. Fixtures um die Ziel-ak ergänzt.
- A4: Test 10 von 10 grün, „11 Titel weniger“ bei 10 Kennungen → „1 Titel weniger“ rot; `fehlendeTitelIds` deckelt bei 10 (geprüft).
- Belege: `node --test tools/delta-wache-*.test.mjs` 12/12 grün, `npx tsc --noEmit -p .` ohne Ausgabe, `node tools/delta-pruefen.mjs --tage 2` Exit 0 (24.11. 18:30 und 25.11. 18:07 erklärt).
- Rückblick gut: Abzug der schon erklärten Anzahl ist ohne Schemaänderung der Zeile möglich.
- Rückblick schlecht: Die Zeilen 24.11./25.11. stehen im Lauf mit anderen Uhrzeiten (18:30/18:07) als im Auftrag (19:30/19:07).
- Rückblick unerwartet: Fixture „eine umgeleitet“ brauchte wegen A3 die Ziel-ak.
- Vorschlag: `titelWeg` künftig ohne die schon erklärten Kennungen speichern; dann entfiele der Zähl-Abzug.
