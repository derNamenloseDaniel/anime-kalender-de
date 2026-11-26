# Bericht handlung-satz-teil-12 (26.11.2026)

- Zweig `daten/handlung-satz-teil-12`, eine neue Datei `data/curated/ein-satz-handlung/teil-12.yaml`. Im Bereich liegen 240 Titel (nicht 244): **230 Sätze, 10 Lücken, 34 mit `umfang: reihe`**.
- Nähe-Treffer (5-Wort-Abschnitt gegen alle Quelltexte des Titels, ungekürzt, samt Netz- und Reihentexten): **vorher 19, nachher 0**; Länge über 160 vorher 23 Sätze, nachher 0; YAML parst. `tools/handlung-naehe.ts` passt nicht (braucht Faktenkarten), dieselbe Wortzerlegung im Scratch-Skript nachgebaut.
- Lücken ohne jede Quelle, Suche (MAL, ANN, Fandom) leer: 5000002 Zorros Geheimnis, 10019845 Der Kuhhirt und die Prinzessin, 10019909 Der neue Fußball, 10020137 Der eingebildete Esel, 10020559 Abenteuer der kleinen Karpfen (Fandom nur Stab), 10020560 Die goldenen Ohrringe, 10021154 Das geflügelte Pferd.
- Lücken, Handlung nur bei nicht zugelassener oder nicht zuordenbarer Quelle: 10019036 Infamomo (Bulbapedia, Siliconera), 10021510 Modern Love Tokyo (Suchzusammenfassung ohne klare Familie). Lücke, Quelle ohne Handlung: 10021059 Star Wars: Visionen, Die Reise zum dunklen Kopf (eigen nennt nur Figurennamen).
- `umfang: reihe` (34): Zusammenfassungen, Specials und Folgestaffeln, deren Quelle den Teil nicht beschreibt (etwa Tayo 2 bis 5, Death Note Relight 2, Super Wings Staffel 2 und 6, T・P Bon Staffel 2); Satz dann aus den Repo-Quellen des Reihentitels.
- Netz: WebFetch ist im Sitzungsnetz gesperrt (Fandom, Prime Video: ENOTFOUND). 8 Sätze stützen sich deshalb auf WebSearch-Zusammenfassungen mit genannter Seite: 10011570 (ann), 10014545, 10016854, 10018944, 10020251, 10020253 (fandom), 10015334 (anbieter: KOCCA-Eintrag des Herstellers), 10016095 (mal). Wacklig: 10016854 Doomfist (nur Figurenbeschreibung), 10015334.
- Stichprobe 10 Sätze (Seed 2611) gegen die Quellen: 188057, 190569, 203275, 204066, 10000479, 10005407, 10012434, 10013694, 10014481, 10019260. Alle 10 treffen Kern und richtigen Teil; 204066 (Kompilationsfilm) nennt beide Handlungsbögen, 10019260 beschreibt mangels Handlungstext nur den Inhalt der Neufassung.
- Namens- und Zahlenkonflikte zwischen Quellen ohne den strittigen Namen bzw. die Zahl geschrieben (195539, 189117, 196144, 199029, 212888, 10012493, 10015492); 10009667 ohne den Namen Grayson (tmdb nennt ihn Ratte, wirkt falsch).
- Commit-Endzeile wie im Auftrag verlangt (Opus 5.5); geschrieben haben die Sätze diese Sitzung und vier Agenten derselben Sitzung.

## Rückblick
- gut: Dossier je 40 Titel plus Prüfskript mit Protokoll; Agenten brauchten je Paket rund 2,5 Minuten und 120 bis 145k Tokens; Reihentexte aus dem Repo schlossen 6 Lücken ohne Netz.
- schlecht: 147 von 240 Titeln haben nur eine Quellenfamilie, Variante A (mehrere Quellen) trägt in diesem ID-Bereich also selten; Agenten-Grenze 2 erzwang zwei Wellen.
- unerwartet: Bereich hat 240 statt 244 Titel; WebFetch scheitert an fast allen Hosts, WebSearch liefert nur Zusammenfassungen, deren Herkunft je Aussage nicht sicher ist; Namen wie V.E.N.O.M. zählen als fünf Wörter und lösen Nähe aus.
- Vorschlag: Für Folgeteile den Reihentrick (Quelltexte des Reihentitels über `franchiseId`) gleich in den Auftrag schreiben; festlegen, ob Suchzusammenfassungen als Quelle zählen; fandom.com und myanimelist.net fürs Sitzungsnetz freigeben; vier gleichlautende Tayo-Reihensätze bei der Einbindung bedenken.
- veraltet: Auftragstext nennt „ca. 244 Titel“ und empfiehlt `tools/handlung-naehe.ts`, das ohne Faktenkarte je Titel nicht läuft.
