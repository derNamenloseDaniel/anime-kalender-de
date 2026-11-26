# Bericht handlung-satz-teil-04 (26.11.2026)

1. Zweig `daten/handlung-satz-teil-04`, eine neue Datei `data/curated/ein-satz-handlung/teil-04.yaml`; kein PR angelegt.
2. 244 Titel im Bereich 4094–10483: **242 Sätze**, **2 Lücken**, **2 × `umfang: reihe`** (4616, 10076).
3. Lücke 5496 (Storm Rider: Clash of Evil): Quellen widersprechen sich zum Kern (aniSearch/TMDB Kampf gegen den Eroberer, AniList Fortsetzung um Ao Jue).
4. Lücke 8764 (Gon, der Höhlenfratz): nur Titelangabe; myanimelist.net und animenewsnetwork.com sind in der Cloud nicht freigegeben (Suchbegriff: „Hajime Ningen Gon 1996 synopsis“).
5. Nähe-Treffer (5 gleiche Wörter in Folge): Erstentwurf 39 Titel, nachher 0; Länge höchstens 160 (Mittel 147), jede Ziffer in einer Quelle belegt, YAML parst.
6. Stichprobe 10 zufällige Sätze gegen Quellen: 9 Kern und richtiger Teil getroffen; 5114 ungenau (beide Brüder als Staats-Alchemisten), berichtigt.
7. Quellenfamilien: aniSearch 233, AniList 229, TMDB 114, eigen 5; 9 Einträge mit nur einer Familie (4599, 4614, 5167, 5256, 8438, 8494, 9362, 9366, 10483).
8. Staffelfalle: TMDB-Texte beschreiben bei Fortsetzungen meist die Reihe (Clannad After Story, K-On!!, Spice and Wolf II, Shikabane Hime Kuro); dort trägt der Satz den aniSearch/AniList-Text des Teils, TMDB steht dann nicht in `quellen`.
9. Fremde Quelltexte nur im Scratch-Ordner; `pr-vorpruefung.mjs` grün.
10. Commit-Endzeile wie im Auftrag vorgegeben („Claude Opus 5.5“); die Sitzung lief laut Konfiguration auf einem anderen Modell.

## Rückblick
- gut: Ein Prüfskript mit Korrekturdatei (spätere Zeile ersetzt frühere) machte das Umformulieren schnell; `vergleiche` aus `naehe.ts` ließ sich ohne Faktenkarte direkt nutzen.
- schlecht: Rund jeder sechste Erstentwurf lag über 160 Zeichen oder traf eine 5-Wort-Folge, oft bloß eine Namensreihe („Yuri Lowell und Flynn Scifo“); die Namen mussten dafür umgestellt werden.
- unerwartet: Der lokale Zeiger `origin/main` der Cloud-Sitzung stand 191 Commits hinter dem echten main (flacher Klon, kein Merge-Base); Zweig vor Abgabe auf aktuelles main umgesetzt, Titelmenge und Quelltexte danach unverändert (244 Titel, 0 geänderte Texte). `tools/handlung-naehe.ts` selbst passt nicht (braucht Faktenkarten je Titel); TMDB-Text ist bei 2 Titeln als „Text: Anisearch“ gekennzeichnet oder wortgleich mit aniSearch, also keine zweite Familie im eigentlichen Sinn.
- Vorschlag: Namensreihen aus der 5-Wort-Regel ausnehmen (Eigennamen sind kein Wortlaut); myanimelist.net und animenewsnetwork.com für diese Aufträge freigeben; ein Blindprüfer für eine größere Stichprobe (20–30 Sätze), da 1 von 10 ungenau war.
- veraltet: Der Auftrag nennt `tools/handlung-naehe.ts` als mögliches Prüfwerkzeug; für Ein-Satz-Dateien ohne Faktenkarte ist es nicht nutzbar.
