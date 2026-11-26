# Bericht handlung-satz-teil-07 (26.11.2026)

- Zweig `daten/handlung-satz-teil-07`, eine neue Datei `data/curated/ein-satz-handlung/teil-07.yaml`, 7 Commits, kein PR angelegt. Der Container startete auf einem main-Stand vom 24.11.; vor Abgabe auf aktuellen `origin/main` (22d37f70) umgesetzt, Titelmenge und Quelltexte dort identisch, Prüfung und `pr-vorpruefung` grün.
- Sätze: 243 von 244 Titeln (ids 21507–101004). Länge: längster 160, Mittel 153 Zeichen.
- Lücken: 1. 99643 „Ookami Heart“: Musikvideo, einzige Quelle (AniList) nennt nur Veröffentlichungsangaben, keine Handlung.
- `umfang: reihe`: 5 (21852 To Love Ru Darkness 2 Specials, 87482/87483 Cyborg 009 Call of Justice 2/3, 87488 Prisma Illya 3rei Mini-Episoden, 99717 Tekkon Kinkreet Pilot); bei den letzten vier stammt der Reihensatz aus den Quellen des Katalogtitels der Reihe (87481, 21379, 2154).
- Quellenfamilien: 131 Sätze mit 3, 94 mit 2, 18 mit 1 (meist OVA/Special, die nur aniSearch oder nur AniList beschreibt). Eine Websuche: 21783 Star Fox Zero (Repo-Quellen nur Produktionsangaben) über Fandom.
- Nähe-Treffer (5-Wort-Abschnitt, `tools/handlung-fakten/naehe.ts`): vorher 34 Sätze, nachher 0. Länge > 160: vorher rund 70 Sätze, nachher 0. Ziffern ohne Beleg: 0. YAML parst.
- Stichprobe 10 zufällige Sätze (Seed 2611: 21516, 21676, 21830, 21833, 97766, 97922, 98778, 99196, 99470, 100652) gegen die Quellen: 10 von 10 richtiger Teil und Kern; 21833 sprachlich nachgebessert. Beim Durchsehen zusätzlich 100658 korrigiert (Verwandtschaft stand so nicht in der Quelle).
- Staffelfalle: TMDB führt bei Fortsetzungen oft den Serientext (z. B. 21509, 21679, 21699, 21799); dort ist `tmdb` nicht als Quelle genannt und der Satz folgt aniSearch/AniList des Teils.
- Namensschreibung: deutsche Quelle des Titels; bei widersprüchlichen deutschen Texten einer Reihe die Schreibung des Haupttitels (Tohru statt Tooru in 98580, Shirou statt Shiro in 21719, Meikuumon in 98402).
- Offen für den Einbau: `tools/handlung-naehe.ts` selbst passte nicht (braucht Faktenkarten je Titel); genutzt wurde nur sein Nähe-Modul.

## Rückblick
- gut: Fast jeder Titel hat zwei Familien im Repo; Stapel von 40 mit Prüfskript nach jedem Stapel hielten die Fehler klein.
- schlecht: Die 160 Zeichen habe ich beim ersten Wurf in rund 70 Sätzen gerissen; Namenspaare („A und B“ samt Alter) lösen die 5-Wort-Prüfung aus, auch wenn sonst nichts übernommen ist.
- unerwartet: TMDB-Texte gehören bei Staffeln und Filmen häufig zur Serie oder zum falschen Film (99196 trägt den Text von Teil 1).
- Vorschlag: Im Einbau `tmdb` bei Format ≠ erster Staffel nicht als Beleg zählen; die Nähe-Prüfung könnte reine Eigennamenfolgen ausnehmen; Grenze 160 und Nähe als `check:` über alle Teile.
- veraltet: Der Auftrag nennt „ca. 244 Titel“, es sind genau 244; sonst nichts gefunden.
