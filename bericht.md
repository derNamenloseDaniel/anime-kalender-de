# Bericht: fix/kalender-sprache-offen

- Zweig `fix/kalender-sprache-offen` gepusht (Commit 23931970); kein PR (gh scheitert in der Cloud), Text in `pr.md`.
- Ursache: Termine aus Meldungen tragen `sprache: offen` + Hinweis; nichts nahm sie zurück, als die Erweiterung Deutsch am Weg belegte. Neue Phase `klaereDeutschBelegteTermine` (09-synchro) plus Wächter `deutschBelegtTrotzOffen` (pruefung.ts).
- Klasse an `public/data`: 3 Termine (Call of the Night, ein weiterer Netflix-Auto-Termin, Demon Slayer Entertainment District) + 1 Netflix-Original-Weg (JoJo 210482); alle geschlossen. Demon Slayer Mugen Train bleibt bewusst offen (Weg an anderer Adresse).
- ≈: Folgenzahl trägt keins mehr, wenn ein Release des Anbieters die Zahl belegt (Obergrenze 183 Pillen betroffen).
- Legende („≈ …“, „laut JustWatch“) wanderte aus dem Antwortkasten in „Woher diese Angaben stammen“; ein eigener ≈-Tooltip wurde nicht gebaut.
- Tests: neuer Test grün, Mutationsprobe 7/7; tsc und check:umfang grün; `public/data` nicht neu erzeugt (kein `data/cache`).
- Offen: Screenshots beider Themen fehlen; Live-Messung nach dem Bestandsbau (Daniel-Fälle 141391, 210482).

## Rückblick
- gut: Schnellweg auf echten Daten zeigte die Klasse (3 statt der vermuteten 4) und die Adress-Grenze bei Mugen Train sofort.
- schlecht: Mutationsprobe ließ erst den omu-Mutanten überleben; check:umfang rot durch fünf Zeilen in `PanelKoerper`.
- unerwartet: Das Handeintrag-`offen` bei Demon Slayer war ebenfalls veraltet; die ≈-Obergrenze (183) ist groß.
- Vorschlag: `docs/wissen/design-regeln.md` Abschnitt 13: „Im Hauptkasten stehen keine Erklärsätze“ als Regel samt Wächter in `check:panel`.
- veraltet: Hinweis im Bauer-Auftrag „gh pr create scheitert“ passt zu bauer.md (nur `tools/pr-einreichen.sh`), dort nachführen.
