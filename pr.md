<!-- titel: Daten: Ein Satz Handlung, Teil 10 (ids 136804–163077, 240 Sätze) -->

Auftrag: handlung-satz-teil-10

Neue Datei `data/curated/ein-satz-handlung/teil-10.yaml`: je Titel mit id 136804–163077 aus `public/data/titles.json` genau ein eigener Handlungssatz (Variante A nach dem Probelauf vom 26.11.2026: mehrere Quellen, eigener Wortlaut). Sonst ändert der PR nichts, keine Pipeline, kein Bau; die Einbindung baut ein eigener Auftrag.

- 240 von 244 Titeln haben einen Satz, 4 Lücken, 4 Einträge mit `umfang: reihe`.
- Lücken: 145564 (Abenteuer auf dem Eis) und 153734 (Der Zauberpinsel) haben im Repo keine Quelle; 145850 (zwei Werbespots) und 154147 (Girls und Panzer Heartful Tank Disc) haben nur eine Titel- und Veröffentlichungsangabe, keine Handlung.
- `umfang: reihe`: 152677 (The Detective Is Already Dead Staffel 2), 155645 (Urusei Yatsura Staffel 2), 156001 (Eminence-in-Shadow-Minifolgen), 158871 (Pokémon Horizonte Staffel 4). Dort beschreibt jede Quelle nur die Reihe bzw. den Reihenanfang.
- Quellen je Titel nur aus dem Repo (`data/anisearch.json`, `data/tmdb-titles.json`, `public/data/synopses/*.json`, `data/handlung-eigen.yaml`). `quellen` nennt die Familien, keinen Text; fremder Text steht nicht im Repo. 7 Sätze stützen sich auf nur eine Familie, weil die zweite Quelle keinen Inhalt hat (136829, 146638, 147729, 151126, 151803, 154983, 155168).
- Wo ein Text einen anderen Teil beschreibt, ist er nicht genutzt (TMDB bei Fortsetzungen und Filmen einer Reihe, zum Beispiel 138565, 139498, 158927). Bei abweichender Namensschreibung gilt der deutsche Quelltext (143653 Isaki, 144176 Fay und Leshea, 158417 Kämpfer D).

Prüfung (Skripte im Scratch-Ordner, nicht im Repo): YAML parst, ids sortiert und eindeutig, längster Satz 160 Zeichen, genau ein Satz je Eintrag, jede Ziffernfolge steht in einem Quelltext des Titels. Wortnähe mit `vergleiche()` aus `tools/handlung-fakten/naehe.ts` gegen alle Quelltexte jedes Titels: 0 gemeinsame 5-Wort-Abschnitte, längste gemeinsame Folge 4 Wörter (im Erstentwurf 34 Sätze mit Treffer, alle umformuliert). 10 Zufallssätze gegen die Quelltexte gelesen: 10 treffen den richtigen Teil und den Kern, keiner geändert.

`tools/handlung-naehe.ts` selbst passt nicht: es liest Faktenkarten, die es für diese Titel nicht gibt; genutzt ist deshalb nur seine Vergleichsfunktion.

Patch Notes: keine (Daten ohne Einbindung, für Besucher ändert sich nichts)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zpnY96gfMGVWM948LW
