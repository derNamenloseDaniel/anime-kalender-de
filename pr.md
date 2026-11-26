<!-- titel: Daten: Ein Satz Handlung, Teil 01 (ids 1–824, 244 Sätze) -->

Auftrag: handlung-satz-teil-01

Neue Datei `data/curated/ein-satz-handlung/teil-01.yaml`: je Titel mit id 1–824 aus `public/data/titles.json` genau ein eigener Handlungssatz (Variante A nach dem Probelauf vom 26.11.2026: mehrere Quellen, eigener Wortlaut). Sonst ändert der PR nichts, keine Pipeline, kein Bau; die Einbindung baut ein eigener Auftrag.

- 244 von 244 Titeln haben einen Satz, 0 Lücken, 0 Einträge mit `umfang: reihe` (jeder Titel hat einen Text zu genau diesem Teil).
- Quellen je Titel nur aus dem Repo (`data/anisearch.json`, `data/tmdb-titles.json`, `public/data/synopses/*.json`); kein Netzabruf nötig, weil jeder Titel mindestens zwei Familien hat. `quellen` nennt die Familien, keinen Text. Fremder Text steht nicht im Repo.
- Bei 288 (Beyblade) beschreibt der TMDB-Text eine andere Serie (Gingka Hagane), deshalb dort `quellen: [anisearch, anilist]`.
- Wo Quellen sich in Zahl oder Namen widersprechen, steht die Angabe nicht im Satz (161 Vater/Eltern, 452 200/300 Jahre, 493 Jahreszahl, 508 Laura/Hiroko, 544 Sommers/Summers).

Prüfung (Skripte im Scratch-Ordner, nicht im Repo): YAML parst, ids sortiert und eindeutig, längster Satz 160 Zeichen, genau ein Satz je Eintrag, jede Ziffernfolge steht in einem Quelltext des Titels. Wortnähe mit `vergleiche()` aus `tools/handlung-fakten/naehe.ts` gegen alle Quelltexte jedes Titels: 0 gemeinsame 5-Wort-Abschnitte, längste gemeinsame Folge 4 Wörter (im Erstentwurf 29 Titel mit Treffer, alle umformuliert). 10 Zufallssätze gegen die Volltexte gelesen: 9 unverändert richtig, 1 entschärft (321, „zugeteilt“ stand nur in einer Quelle).

`tools/handlung-naehe.ts` selbst passt nicht: es liest Faktenkarten (`tools/handlung-fakten/ablage.ts`), die es für diese Titel nicht gibt; genutzt ist deshalb nur seine Vergleichsfunktion.

Patch Notes: keine (Daten ohne Einbindung, für Besucher ändert sich nichts)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zqMPanCgjtbHGiR3ZD
