# Bericht handlung-satz-teil-02 (26.11.2026)

1. Ergebnis: 244 Sätze für 244 Titel (ids 849–1887) in `data/curated/ein-satz-handlung/teil-02.yaml`, Zweig `daten/handlung-satz-teil-02`, sonst keine Datei geändert.
2. Lücken: 0. Jeder Titel hatte mindestens zwei Quellen im Repo (242 mit aniSearch-Text und AniList-Text, davon 200 zusätzlich mit TMDB-Text; id 1138 mit TMDB und AniList; id 1023 mit AniList und eigenem Text); keine Netzsuche nötig.
3. `umfang: reihe`: 0. Bei allen Folgeteilen (z. B. 969, 996, 1239, 1471, 1519, 1668, 1669, 1840) beschreibt mindestens ein Quelltext diesen Teil.
4. Länge: längster Satz 160 Zeichen; bei 103 Titeln war ein Entwurf zu lang und wurde gekürzt.
5. Wortnähe (5 gleiche Wörter in Folge, Zerlegung wie `woerter()` im Nähe-Werkzeug, gegen alle Quelltexte des Titels): vorher 41 Titel mit Treffer, nachher 0. Häufigste Ursache: Namensaufzählungen und feste Wendungen („über Gott und die Welt“).
6. `quellen` nennt nur Familien, die den Teil wirklich tragen: bei 8 Einträgen (969, 1313, 1335, 1519, 1533, 1669, 1798, 1840) fehlt `tmdb` trotz vorhandenem TMDB-Text, weil er die Reihe, eine andere Serie (1669: „Metal Fusion“) oder nur Produktionsangaben (1533) enthält.
7. Stichprobe, 10 zufällige Sätze (Seed 2611) gegen die Quellen: 1482, 1760, 1143, 887, 997, 1371, 1006, 1448, 856, 1210. Alle 10 treffen Kern und richtigen Teil. Ein Fund: 997 nannte „Schneekönigin“ (englischer Text), der deutsche Text schreibt „Schneeprinzessin“, korrigiert. 1448 folgt der deutschen Voltron-Fassung, der AniList-Text beschreibt das japanische Original GoLion.
8. Widersprüche zwischen Quellen wurden umgangen statt entschieden: Jahreszahl (888, 1000), Alter (1469), Name (1084 Yosuke/Ichitaka, 1533 Satania/Raindevilla, 1434 Nichte/Enkelin); der Satz nennt dort die strittige Angabe nicht.
9. Namensschreibung nach deutschem Quelltext (z. B. 1016 „Gally“, 859 „Marcus Damon“, 1710 „Mega Man“, 1081 „Harlock“), auch wo der deutsche Titel anders lautet.
10. Nicht geprüft: Zahlen- und Wertungsprüfung aus `tools/handlung-naehe.ts` (braucht Faktenkarten, die es für diese Titel nicht gibt); stattdessen eigene Liste großgeschriebener Wörter und Ziffern ohne Beleg im Quelltext, von Hand durchgesehen.

## Rückblick

- gut: Alle Quellen lagen im Repo; die Prüfung per Skript nach jeder Charge fing Länge und Nähe sofort.
- schlecht: Die 160-Zeichen-Grenze kostet oft den zweiten Handlungsstrang oder den Namen der Hauptfigur (z. B. 1088, 1818, 1731 ohne Heldennamen, weil der gekürzte Quelltext ihn nicht nennt). Ein Zwischenstand (Commit 1) enthielt 8 Sätze über 160 Zeichen, im Endstand behoben.
- unerwartet: `synopses/*.json` (de) ist bei 242 Titeln derselbe Text wie `data/anisearch.json`, zählt also nicht als eigene Quelle; der TMDB-Text beginnt bei 32 Titeln wortgleich mit dem aniSearch-Text.
- Vorschlag: Für die Einbindung ein Prüfer im Repo (Länge, Nähe, eine id je Titel), der dieselbe Wortzerlegung nutzt; `quellen: [tmdb]` bei Folgeteilen nur zulassen, wenn der TMDB-Text zur Staffel gehört (TMDB führt Staffeln unter der Serie).
- veraltet: Probelauf-Bericht nennt Sätze bis 230 Zeichen als Muster; mit der 160er-Grenze sind sie keine Vorlage mehr.
