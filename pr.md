<!-- titel: test(pr-stufe): Prüfungen unter pipeline/check-*.ts bleiben Stufe 2 -->
Auftrag: pr-stufe-kennzahlen

## Was
`tools/pr-stufe.test.mjs` bekommt vier Fälle: eine neue `pipeline/check-*.ts` (allein, mit eigenem Test, gemischt mit Kennzahlen, gemischt mit UI-Logik) bleibt Stufe 2. Kein Code in die Stufenregeln geändert.

## Befund
- Kennzahlen-PR (tage.jsonl und daten.js der Kennzahlen → Stufe 1, Logik daneben und über 300 Zeilen → 2, gemischt → 2): steht schon auf main (Commit 6001c577, Regel `KENNZAHLEN_ERZEUGT`, Fälle in `tools/pr-stufe.test.mjs`). Nichts zu bauen, deshalb auch kein Rot-Beleg gegen main möglich.
- `pipeline/check-*.ts`: keine Herabstufungsregel, fällt auf „unbekannt → 2“. Eine Prüfung ist damit nie schwächer eingestuft als der Code, den sie prüft; `istHandwerkzeug` greift nur unter `tools/`. Die Fälle pinnen das.

## Annahmen
- Test vorher rot ist nicht herstellbar (Verhalten war schon richtig); Beleg ist Exit 0 mit allen neuen Fällen grün (`node tools/pr-stufe.test.mjs`).
- Die Mutationsprobe: „keine fahrbaren Mutanten (Diff ohne Code-Zeilen)“, es ändert sich nur eine Testdatei.
- `tools/pr-stufe.test.mjs` ist eslint-sauber; `tsc` nicht berührt.
