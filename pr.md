<!-- titel: daten(handlung): Ein-Satz-Handlung Teil 09 (ids 111312-136707) -->
Auftrag: handlung-satz-teil-09

## Was
Neue Datei `data/curated/ein-satz-handlung/teil-09.yaml`: je ein Satz Handlung für alle 244 Titel mit id 111312 bis 136707 (Variante A, mehrere Quellen, eigener Wortlaut). Je Eintrag `id`, `satz`, `quellen` (Quellenfamilien, keine Texte), `geprueftAm`, bei 7 Einträgen `umfang: reihe`.

## Nicht enthalten
Keine Pipeline, kein Bau, keine Einbindung in `public/data` (eigener Auftrag). Keine fremden Quelltexte im Repo.

## Prüfung
- Skript im Scratch-Ordner: 244 Sätze, alle höchstens 160 Zeichen, 0 gemeinsame 5-Wort-Abschnitte mit den Quelltexten des jeweiligen Titels (vor dem Umformulieren 33 Sätze mit Treffer), Zahlen und Namen gegen die Quelltexte abgeglichen.
- YAML parst (js-yaml), ids eindeutig und aufsteigend sortiert.
- 10 Zufallssätze gegen die Quellen nachgelesen: 10 von 10 treffen Kern und Staffel (Einzelheiten in `bericht.md` im Zweig `prtext/handlung-satz-teil-09`).

## Offen
8 Einträge stützen sich auf nur eine Quellenfamilie (ids 113178, 115794, 120892, 126438, 132477, 135865, 136436, 136668); Abrufe von TMDB, ANN und Fandom waren in der Cloud-Sitzung gesperrt.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zoesFThKe55fzwXNug
