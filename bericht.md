# Bericht: bau-log-warnungen-zaehlen

- Neues Modul `pipeline/lib/warnungen-zaehlen.ts`; `log`/`warn` in `util.ts` zählen jede WARNUNG-Zeile je Art.
- `build.ts` gibt am Ende `Warnungen im Bau: N in M Arten — …` aus (≤ 20 Arten, Gesamtzahl), plus `$GITHUB_STEP_SUMMARY`, wenn gesetzt.
- Test `pipeline/check-warnungen-zaehlen.ts` (19 Zusicherungen) in `check-logic-liste.txt`; vorher rot, jetzt grün; tsc grün.
- Mutation: 68, 3 überlebt (alle gleichwertig, im PR begründet).
- `bau-vergleich` nicht lauffähig (kein `data/cache`); `public/data` nicht berührt.
- Zweig `fix/bau-log-warnungen-zaehlen` gepusht, nicht gemergt.

Rückblick
- Gut: `log`/`warn` sind ein echter zentraler Helfer, ein Zähler dort braucht nur drei Zeilen Eingriff.
- Schlecht: Viele Warnungen entstehen per `console.log` in Bestandsprüfungen und kommen so nicht in die Zusammenfassung.
- Unerwartet: `rohfolgen-staffelmisch.ts` schreibt „WARNUNG“ ohne „⚠“ und wird deshalb von `commit-data.sh` nicht als Annotation gezeigt.
- Vorschlag: Die `console.log`-Warnzeilen der Bestandsprüfungen über einen gemeinsamen Helfer ausgeben; dann zählt dieselbe Zusammenfassung dort mit.
- Veraltet: nichts gefunden.
