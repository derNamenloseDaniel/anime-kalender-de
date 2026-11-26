# Bericht: kalender-n4-n5-staffelstart-finale

- N4 behoben: `istStaffelstart` (`shared/tv-signale.ts`) gibt false, wenn derselbe Titel beim selben Anbieter früher beginnt. Live 230 → 228 Staffelstarts (Ranma S3 Folge 2, Band der Unterwelt Folge 12).
- Test in `check-logic.ts`: gegen main rot (Exit 1), mit Fix grün; 4 Mutanten getötet.
- N5 ist kein Etikettfehler: Finale 24/24 ist durch Crunchyroll belegt (`hebeAnnahmeAuf`); nur der Hinweistext in `data/curated/streaming-herbst-2026.yaml` stimmte nicht und ist korrigiert.
- Zweig `fix/kalender-n4-n5-staffelstart-finale` gepusht, Text in `prtext/kalender-n4-n5-staffelstart-finale`; PR nicht angelegt.

## Rückblick
- **gut:** Die Anzeigefunktionen lassen sich direkt auf `public/data` rufen; der Beweis (230 → 228) dauerte Sekunden.
- **schlecht:** Die Inventur maß N5 an der YAML statt am gebauten Datensatz — Falschbefund.
- **unerwartet:** Batch-Events haben kein `episode`; Zählungen über `x.episode` übersehen „Folge 1“-Vorläufer.
- **Vorschlag:** Wächter in `pipeline/lib/kalender-plausibilitaet.ts`: Staffelstart + früherer Release am Titel/Anbieter = rot (Baseline 0 nach diesem Fix).
- **veraltet:** Der Auftrag nannte N5 als Datenfehler („Hinweis sagt …“); die Aussage gilt für Netflix, die Zahl ist aber belegt.
