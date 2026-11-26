# Bericht: Reihe, Einzel-Gruppen nebeneinander

- Zweig `feat/reihe-einzel-nebeneinander` gepusht (1 Commit), PR-Text im Orphan-Zweig `prtext/reihe-einzel-nebeneinander`; kein PR (Cloud).
- Neu: `gruppenZeilen()` paart aufeinanderfolgende Einzel-Gruppen zu 50:50; sonst volle Breite, Reihenfolge unverändert.
- Verdrahtet in `reihenInhalt` (Raster je Zeile); Übersicht großer Reihen unberührt.
- Test `pipeline/check-reihen-zeilen.ts` (Fixtures), in `check-logic-liste.txt`; Patchnote angelegt.
- Grün: Reihen-Tests, `tsc --noEmit -p .`, `check:umfang`, `design-klassen`, eslint.
- Bilder vorher/nachher an Yaiba und Cowboy Bebop (Einzel+Einzel+Mehrfach), 375/1100 px, hell/dunkel, im Orphan-Zweig.
- Nicht lokal gefahren: `check:panel`, `check:vor-commit` (Kette); Start-Budget: Einstieg-Bundle gleich (425,39 kB).

Rückblick
- Gut: reine Funktion, Bühne an echten Daten sofort sichtbar.
- Schlecht: `panel-bild.mjs` kennt nur 560 px und bildet nicht die Reihe ab; ich nutzte eine Scratchpad-Kopie.
- Unerwartet: Playwright-Version in der Cloud (1243) passt nicht zur erwarteten (1234), Verweis per `PLAYWRIGHT_BROWSERS_PATH` nötig.
- Vorschlag: `panel-bild.mjs` um `--breite=` und `--reihe` erweitern (eigener PR).
- Veraltet: nichts gefunden; Hinweis in bauer.md zu Playwright-Verweis nennt 1234 nur als Beispiel.
