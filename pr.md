<!-- titel: daten(handlung): Ein-Satz-Handlung Teil 06 (ids 20553-21505, 244 Sätze) -->
Auftrag: handlung-satz-teil-06

## Was
Neue Datei `data/curated/ein-satz-handlung/teil-06.yaml`: je ein Satz Handlung für die 244 Titel mit id 20553 bis 21505 aus `public/data/titles.json` (Variante A, eigener Wortlaut aus mehreren Quellen). Je Eintrag `id`, `satz`, `quellen` (Quellenfamilien, keine Texte), `geprueftAm`, bei drei Bonusfolgen-Titeln `umfang: reihe`.

## Was nicht
Keine Pipeline, kein Bau, keine Oberfläche: `pipeline/lib/curated.ts` liest nur `*.yaml` direkt in `data/curated/`, der Unterordner wird nicht eingelesen. Die Einbindung baut ein eigener Auftrag. Kein fremder Quelltext im Repo.

## Geprüft
- Skript im Scratch-Ordner mit `vergleiche()` aus `tools/handlung-fakten/naehe.ts`: jeder Satz höchstens 160 Zeichen, kein gemeinsamer 5-Wort-Abschnitt mit einem Quelltext des Titels (0 Treffer), genau ein Satz, YAML parst (244 Einträge, nach id sortiert).
- 10 Zufallssätze gegen die vollen Quelltexte nachgelesen, Ergebnis in `bericht.md` auf dem Zweig `prtext/handlung-satz-teil-06`.
