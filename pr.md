<!-- titel: Ein Satz Handlung, Teil 02: 244 Sätze für ids 849–1887 -->
Auftrag: handlung-satz-teil-02

Neue Datei `data/curated/ein-satz-handlung/teil-02.yaml`: je Titel mit id 849 bis 1887 genau ein Satz Handlung (244 Einträge, nach id sortiert), Variante A aus dem Probelauf vom 26.11.2026 (mehrere Quellen, eigener Wortlaut). Je Eintrag `id`, `satz`, `quellen` (Quellenfamilien, keine Texte) und `geprueftAm`.

Keine andere Datei geändert, keine Pipeline, kein Bau; die Einbindung baut ein eigener Auftrag. Fremde Quelltexte stehen nicht im Repo.

## Geprüft

- YAML parst, 244 Einträge, ids aufsteigend, jede id der Titelliste im Bereich hat genau einen Eintrag.
- Länge: längster Satz 160 Zeichen.
- Wortnähe: kein gemeinsamer 5-Wort-Abschnitt mit einem Quelltext des Titels (aniSearch-Text, TMDB-Text, AniList-Text, eigener Text), Wortzerlegung wie das Nähe-Werkzeug des Repos; vorher 41 Titel mit Treffer, nachher 0.
- 10 zufällige Sätze gegen die Quellen nachgelesen (richtiger Teil, Kern), Ergebnis in `bericht.md` auf dem Zweig `prtext/handlung-satz-teil-02`.

## Nicht enthalten

- Kein Eintrag trägt `umfang: reihe`: zu jedem Folgeteil lag ein Quelltext vor, der diesen Teil beschreibt.
- Keine Lücke: alle 244 Titel hatten mindestens zwei Quellen im Repo, eine Netzsuche war nicht nötig.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zppB7xUxSTtFeX8sNE
