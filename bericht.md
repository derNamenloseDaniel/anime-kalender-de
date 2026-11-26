# Bericht handlung-satz-teil-08 (26.11.2026)

- Zweig `daten/handlung-satz-teil-08`, eine neue Datei `data/curated/ein-satz-handlung/teil-08.yaml`, 2 Commits, gepusht; kein PR angelegt.
- Sätze: 242 von 244 Titeln (ids 101016–111131). Längster Satz 160 Zeichen.
- Lücken: 2. 102651 (Musikvideo, Quelle nennt nur die Veröffentlichung), 110173 (OVA, Quellen nennen nur Folgenzahl und Veröffentlichung; ein Reihensatz aus den Quellen von 102939 wäre möglich, ist aber nicht aus Quellen dieses Titels belegt).
- `umfang: reihe`: 3 (105245, 108972, 109002; nur der eigene Reihentext trägt).
- Nähe-Treffer (5 Wörter gleich): vorher 44 bei 31 Titeln, nachher 0. Über 160 Zeichen: vorher 25, nachher 0. Ziffern ohne Beleg: 0.
- Stichprobe 10 zufällige Sätze (Seed 2611: 101115, 101317, 102346, 102348, 103277, 104157, 106287, 107226, 108241, 109979) gegen die Volltexte gelesen: 10 von 10 treffen Kern und richtigen Teil (103277 ist Film 2, 104157 der Film); Auffälligkeit nur Schreibung Clair/Claire bei 108241 (Satz folgt TMDB-de).
- Einzelquellen: 109911 nur AniList (Netzsuche bestätigt, aber keine erlaubte Familie gefunden); 104382 AniList + Fandom (TMDB-Text gehört zu Case.1). 7 Titel haben nur eine inhaltliche Quelle neben einer leeren (101471, 103588, 104243, 108945, 109085, 110686, 111048), Satz bleibt eng an dieser.
- TMDB-Text bei 104382 und 104990 ist der von 102649 (Case.1): Datenfehler in `data/tmdb-titles.json`, hier nur umgangen, nicht korrigiert.

## Rückblick
- gut: Auszug aller Quellen in eine Scratch-Datei und blockweises Schreiben (je rund 37 Titel) mit sofortiger Prüfung hielt die Nachbesserung klein.
- schlecht: Der Auszug war je Quelle auf 400–500 Zeichen gekürzt; bei gut zehn Titeln stand der Kern dieses Teils erst dahinter und musste nachgelesen werden.
- unerwartet: 160 Zeichen sind enger als die Probelauf-Sätze (dort bis rund 230); Eigennamenketten („Misaki Yata und Saruhiko Fushimi“) lösen allein den 5-Wort-Riegel aus.
- Vorschlag: Für Titel ohne eigenen Text (OVA, Picture Drama) im Auftrag festlegen, ob der Reihensatz aus den Quellen des Haupttitels kommen darf; TMDB-Zuordnung der drei Sinners-of-the-System-Filme prüfen.
- veraltet: Der Auftrag nennt `tools/handlung-naehe.ts` als Prüfweg; es braucht Faktenkarten, die es für diese Titel nicht gibt.
