# Bericht pr-stufe-kennzahlen

- Kennzahlen-Dateien (tage.jsonl, daten.js) → Stufe 1 steht schon auf main (6001c577, Fälle in pr-stufe.test.mjs); nichts zu bauen.
- `pipeline/check-*.ts` ist Stufe 2 (keine Herabstufungsregel, `istHandwerkzeug` nur unter tools/); also nie schwächer als der geprüfte Code.
- Geliefert: vier Pin-Fälle in `tools/pr-stufe.test.mjs` (allein, mit Test, gemischt mit Kennzahlen, gemischt mit UI-Logik), Exit 0, eslint sauber.
- Zweig fix/pr-stufe-kennzahlen gepusht; PR nicht eröffnet (kein gh pr, kein GraphQL in der Cloud), Text in pr.md.
- Offen: rot gegen main nicht belegbar, weil das Verhalten schon stimmte; Mutationstabelle leer (nur Testdatei).

Rückblick
- gut: „Schon erledigt?“-Prüfung am Anfang sparte den Umbau.
- schlecht: Auftrag war veraltet (Sammelzeile nicht gegen main abgeglichen).
- unerwartet: Heredoc-Hook sperrt auch einfache Python-Patches; Edit nutzen.
- Vorschlag: Aufträge aus der Sammelzeile vor dem Eintragen per `git log -S` gegen main prüfen.
