# Bericht handlung-satz-teil-01 (26.11.2026)

1. Zweig `daten/handlung-satz-teil-01`, eine neue Datei `data/curated/ein-satz-handlung/teil-01.yaml`, 7 Commits (je 40 Titel), gepusht; kein PR angelegt.
2. Sätze: 244 von 244 Titeln (ids 1–824). Lücken: 0. `umfang: reihe`: 0 (jeder Titel hat einen Quelltext zu genau diesem Teil, auch Fortsetzungen, Filme, Specials).
3. Quellenlage: 206 Titel mit 3 Familien (aniSearch, TMDB, AniList-en), 38 mit 2; kein Netzabruf nötig, kein fremder Text im Repo. 288 Beyblade ohne `tmdb` (TMDB-Text gehört zu einer anderen Serie).
4. Nähe-Treffer (5 Wörter gleich, `vergleiche()` aus `tools/handlung-fakten/naehe.ts`): vorher 29 Titel im Erstentwurf, nachher 0; längste gemeinsame Folge jetzt 4 Wörter.
5. Länge: vorher 26 Sätze über 160 Zeichen, nachher 0 (längster 160). YAML parst, ids sortiert, jede Ziffernfolge in einer Quelle belegt.
6. Stichprobe 10 Zufallssätze gegen Volltexte (405, 24, 329, 152, 321, 747, 71, 468, 198, 530): richtiger Teil 10/10 (405 Film, 468 Film 2), Kern getroffen 10/10; 321 entschärft („zugeteilt“ nur in einer Quelle), übrige unverändert.
7. Widersprüche zwischen Quellen: Angabe weggelassen statt gewählt (161 Vater/Eltern, 452 200/300 Jahre, 493 Jahreszahl, 508 Laura/Hiroko, 544 Sommers/Summers).
8. Namensschreibung nach deutschem Quelltext; Ausnahme 459 „Ruffy“ (Quelle dort „Luffy“, alle anderen One-Piece-Texte „Ruffy“). Bei zwei deutschen Schreibweisen gilt aniSearch (Claus statt Klaus, Yo statt Yoh).
9. `PR_TEXT=… node tools/pr-vorpruefung.mjs --titel …` grün (nur Hinweise auf genannte, nicht geänderte Dateien).
10. Offen für den Einbindungsauftrag: 31, 517, 659, 673, 760 beschreiben den Titel als Zusammenschnitt/Bonus, nicht eine Handlung; so gewollt, aber beim Anzeigen prüfen.

## Rückblick
- gut: Stapel von 40 mit Prüfskript nach jedem Stapel; Treffer fielen sofort auf, nichts sammelte sich an.
- schlecht: 26 Sätze im Erstentwurf zu lang, 160 Zeichen sind für Held + Ausgangslage + Kern knapp; Nebenfiguren fallen oft weg.
- unerwartet: alle 244 Titel haben ≥ 2 Quellfamilien, aber `synopses/*.de` ist in 242 Fällen der aniSearch-Text, zählt also nicht als eigene Quelle; TMDB wiederholt aniSearch oft wörtlich (und ist bei 288 falsch zugeordnet).
- Vorschlag: Prüfskript (Länge, ein Satz, 5-Wort-Nähe gegen Repo-Quellen, Zahlenbeleg) als `check:` ins Repo, sobald die Einbindung gebaut wird; TMDB-Zuordnung von 288 prüfen (falsche Serie).
- veraltet: Auftragstext nennt „ca. 244 Titel“ und Web-Rückfall; für Teil 01 war kein Rückfall nötig. `tools/handlung-naehe.ts` passt nur für Titel mit Faktenkarte.
