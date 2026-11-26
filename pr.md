<!-- titel: Daten: Ein-Satz-Handlung Teil 04 (ids 4094–10483, 242 Sätze) -->

Auftrag: handlung-satz-teil-04

## Was dieser PR tut

Eine neue Datei `data/curated/ein-satz-handlung/teil-04.yaml`: je Titel aus `public/data/titles.json` mit id 4094 bis 10483 genau ein Satz Handlung (Variante A: mehrere Quellen, eigener Wortlaut), dazu die Familien der genutzten Quellen und das Prüfdatum. Nichts liest die Datei bisher; die Einbindung baut ein eigener Auftrag. Keine andere Datei geändert, kein Bau.

- 244 Titel im Bereich, **242 Sätze**, **2 Lücken** (kein Eintrag):
  - 5496 Storm Rider: Clash of Evil — Quellen widersprechen sich zum Kern (aniSearch/TMDB: Kampf gegen den Eroberer; AniList: Fortsetzung um Ao Jue und dessen Schwert).
  - 8764 Gon, der Höhlenfratz — nur Titelangabe (AniList: Remake, je Folge drei Geschichten); MyAnimeList und Anime News Network waren im Lauf nicht erreichbar.
- **2 Einträge `umfang: reihe`** (4616 Topo Gigio Staffel 2, 10076 Kämpfer: Für die Liebe): keine Quelle beschreibt diesen Teil.
- Quellenfamilien: aniSearch 233, AniList 229, TMDB 114, eigen 5. Nur eine Familie bei 9 Einträgen (4599, 4614, 5167, 5256, 8438, 8494, 9362, 9366, 10483): die zweite Quelle im Repo nennt dort nur die Art des Titels, eine Netzquelle war nicht erreichbar.
- Fremde Quelltexte liegen nur im Scratch-Ordner der Sitzung, nicht im Repo.

## Prüfung

- Skript im Scratch-Ordner (nutzt `vergleiche` aus `tools/handlung-fakten/naehe.ts`): je Satz Länge ≤ 160, längste gemeinsame Wortfolge mit jedem Quelltext des Titels < 5 Wörter, jede Ziffernfolge im Satz steht in einer Quelle, ein Satz, Familien aus der erlaubten Liste. Endstand: 242 Sätze, 0 Befunde; längster Satz 160 Zeichen, Mittel 147.
- Nähe-Treffer (5 Wörter): im Erstentwurf 39 Titel, nach Umformulieren 0.
- YAML geparst (js-yaml), 242 Einträge, Inhalt gleich der Vorlage, nach id sortiert.
- 10 zufällige Sätze (fester Seed) gegen die Quellen nachgelesen: 9 treffen Kern und richtigen Teil; 5114 (Fullmetal Alchemist: Brotherhood) nannte beide Brüder Staats-Alchemisten, das trägt die Quelle nur für den Weg zur Armee — berichtigt.

## Nicht geprüft

- Kein Blindurteil eines zweiten Lesers; „trifft den Kern“ ist mein eigenes Urteil. Die Stichprobe (1 von 10 ungenau) lässt weitere Ungenauigkeiten im Rest erwarten.
- Namensschreibung folgt dem deutschen Quelltext des Titels und ist deshalb zwischen Titeln uneinheitlich (Ginga/Gingka, Horo/Holo).
