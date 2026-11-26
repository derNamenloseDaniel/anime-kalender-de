<!-- titel: daten(handlung): Ein-Satz-Handlung Teil 07 (ids 21507-101004), 243 Sätze -->
Auftrag: handlung-satz-teil-07

# Ein Satz Handlung, Teil 07 (ids 21507–101004)

Neue Datei `data/curated/ein-satz-handlung/teil-07.yaml`: je Titel ein eigener Satz zur Ausgangslage (Variante A, mehrere Quellen, eigener Wortlaut). Sonst ist keine Datei berührt, nichts ist eingebunden (keine Pipeline, kein Bau); die Einbindung baut ein eigener Auftrag.

- 243 Sätze für 244 Titel, nach id sortiert, je Eintrag `id`, `satz`, `quellen` (Familien), `geprueftAm`, bei Bedarf `umfang: reihe`.
- 1 Lücke: 99643 „Ookami Heart“ (Musikvideo, die einzige Quelle nennt nur Veröffentlichungsangaben, keine Handlung).
- 5 mit `umfang: reihe` (21852, 87482, 87483, 87488, 99717): keine Quelle trägt diesen Teil, der Satz beschreibt die Reihe.
- Quellen: 131 Sätze aus 3 Familien, 94 aus 2, 18 aus 1. Fremdtext steht nicht im Repo, nur die Familiennamen.

Prüfung (Skript im Scratch-Ordner, Wortnähe über `tools/handlung-fakten/naehe.ts`): jeder Satz ≤ 160 Zeichen (längster 160, Mittel 153), ein Satz, kein gemeinsamer 5-Wort-Abschnitt mit einem Quelltext des Titels (vorher 34 Sätze mit Treffer, nachher 0), jede Ziffer im Satz steht in einer Quelle, YAML parst. 10 zufällige Sätze gegen die Quellen nachgelesen: 10 von 10 richtiger Teil und Kern, einer sprachlich nachgebessert.

Patch Notes: keine (Daten noch nicht eingebunden)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
