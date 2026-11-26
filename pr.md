<!-- titel: Daten: Ein Satz Handlung, Teil 08 (ids 101016–111131, 242 Sätze) -->

Auftrag: handlung-satz-teil-08

Neue Datei `data/curated/ein-satz-handlung/teil-08.yaml`: je Titel mit id 101016–111131 aus `public/data/titles.json` genau ein eigener Handlungssatz (Variante A nach dem Probelauf vom 26.11.2026: mehrere Quellen, eigener Wortlaut). Sonst ändert der PR nichts, keine Pipeline, kein Bau; die Einbindung baut ein eigener Auftrag.

- 242 von 244 Titeln haben einen Satz, 2 Lücken, 3 Einträge mit `umfang: reihe`.
- Lücken: 102651 (Musikvideo „The Perfect World“, die einzige Quelle beschreibt nur die Veröffentlichung) und 110173 (Midnight Occult Civil Servants OVA, beide Quellen nennen nur Folgenzahl und Veröffentlichung).
- `umfang: reihe`: 105245 (W’z OVA), 108972 (Space☆Dandy 2 Picture Drama), 109002 (Code Geass Akito 2 Picture Drama); dort beschreibt nur der eigene Text aus `data/handlung-eigen.yaml` die Reihe, keine Quelle den Teil.
- Quellen je Titel aus dem Repo (`data/anisearch.json`, `data/tmdb-titles.json`, `public/data/synopses/*.json`, `data/handlung-eigen.yaml`). `quellen` nennt die Familien, keinen Text; fremder Text steht nicht im Repo. Eine Netzsuche gab es nur für 104382 (Zweitquelle Fandom bestätigt Sugo, Okinawa 2112, Drohnenangriff drei Monate später) und 109911 (Rezensionen bestätigen die sechs Ultra-Krieger, keine erlaubte Quellenfamilie, deshalb bleibt dort `quellen: [anilist]`).
- TMDB-Text nicht genutzt, wo er einen anderen Teil oder etwas anderes beschreibt: 104382 und 104990 (dort steht der Text von Case.1), 102473 (deutscher Verleihtext mit anderer Handlung), 104721 (Vorgeschichte statt Film), 101166 (Serientext statt Film).
- Namenswahl bei widersprüchlicher Schreibung nach einem deutschen Quelltext: 101922 Tanjiro, 105333 Senku, 105334 Tohru, 105143 Buena Festa, 107905 Ryuka, 108853 Drum Kouryuu (englische Quelle: Dante Koryu).
- Staffeln, Cours und Filme einer Reihe tragen die Ausgangslage dieses Teils (z. B. 101167 Apollos Kriegserklärung, 104578 Rückeroberung von Mauer Maria, 108632 Rems Verschwinden, 110355 Trennung von Sugimoto und Asirpa).

Prüfung (Skripte im Scratch-Ordner, nicht im Repo): YAML parst, ids sortiert und eindeutig, längster Satz 160 Zeichen, genau ein Satz je Eintrag, jede Ziffernfolge steht in einem Quelltext des Titels. Wortnähe mit derselben Wortzerlegung wie `tools/handlung-fakten/naehe.ts` gegen alle Quelltexte jedes Titels: 0 gemeinsame 5-Wort-Abschnitte (im Erstentwurf 44 Treffer bei 31 Titeln, alle umformuliert; 25 Sätze waren zuerst länger als 160 Zeichen). 10 Zufallssätze gegen die Volltexte gelesen: 10 treffen Kern und richtigen Teil.

`tools/handlung-naehe.ts` selbst passt nicht: es liest Faktenkarten (`tools/handlung-fakten/ablage.ts`), die es für diese Titel nicht gibt.

Patch Notes: keine (Daten ohne Einbindung, für Besucher ändert sich nichts)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zpvcor9JjGzi8SSDoD
