# Nachtrag Nachbesserung PR 5078 (Runde 1)

- Kette – Logik 1 rot (`check-patchnotes-pflicht`: sichtbare Änderung `data/tmdb-von-hand.yaml` ohne Patch-Notes-Eintrag) -> Vorrats-Entwurf `hintergrundbild-neun-klassiker.yaml` nach `data/patchnotes/` verschoben, `wartetAuf`/`seit` entfernt (Commit 1eb00f71d); lokal `check-patchnotes-pflicht.mjs`, `check-patchnotes.ts`, `check-patchnotes-vorrat.ts` grün. Beschreibung hat keine „Patch Notes:“-Zeile und bleibt unverändert.
- Prüfer-Befund „Logik 1 lief noch“ -> war dieser rote Check; Merge erst bei grünem Logik 1.
- main eingemerged ohne Konflikte; `tsc --noEmit -p .` grün.
- Offen: Der Eintrag geht mit dem Deploy live, die Banner erst nach TMDB-Lauf 30.11. und Bestandsbau. Wer das für zu früh hält, stellt die Beschreibung auf „Patch Notes: vertagt – <Grund>“ und legt die Datei zurück nach `data/patchnotes/vorrat/`.

Lehre: Ein PR, der `data/tmdb-von-hand.yaml` ändert, braucht Patch-Notes-Eintrag oder „vertagt“-Zeile samt Vorrats-Datei schon in der Beschreibung, nicht erst nach roter Kette.
