# Bericht handlung-satz-teil-03 (26.11.2026)

- Zweig `daten/handlung-satz-teil-03`, eine neue Datei `data/curated/ein-satz-handlung/teil-03.yaml`, sonst nichts geändert.
- Sätze: 244 von 244 Titeln (ids 1889–4087). Lücken: 0. `umfang: reihe`: 0 (jede Fortsetzung, jeder Film und jede OVA hatte eine Quelle zum eigenen Teil).
- Quellenfamilien: 154× anisearch+tmdb+anilist, 75× anisearch+anilist, 5× anisearch+tmdb, 2× tmdb+anilist, 1× tmdb+fandom; nur eine Familie bei 7 Titeln (2226, 2237, 2905, 3444, 3812 nur anisearch; 3760, 3823 nur anilist).
- Nähe (5-Wort-Abschnitt gegen alle Quelltexte je Titel, `vergleiche()` aus `tools/handlung-fakten/naehe.ts`): vorher 32 Titel mit Treffer, nachher 0. Länge > 160: nachher 0 (vorher nicht gezählt). YAML liest dieselben 244 Sätze zurück.
- `tools/handlung-naehe.ts` selbst nicht genutzt: es liest Faktenkarten je Titel, die es für diese Titel nicht gibt; der Vergleich daraus läuft im Scratch-Skript.
- Stichprobe 10 zufällige Sätze (Seed 2611: 1904, 2041, 2313, 2332, 2558, 2577, 2913, 3024, 3110, 3810): 10 von 10 treffen Kern und richtigen Teil (1904 zweite Reihe mit Karin statt Akane, 2558 Fortsetzung, 2313 Film). Anmerkung 2313: „schwarzer Regen“ nach TMDB, aniSearch schreibt „Staub“.
- TMDB-Text gehört bei Filmen, OVAs und Folgestaffeln oft zur Hauptserie (z. B. 1889, 1904, 2961, 2962); dort ist tmdb nicht als Quelle gezählt.
- Netz: 2 Suchen (2226, 2831). 2831 bekam fandom als zweite Familie; für 2226 fand sich nur Wikipedia/TV Tropes (keine erlaubte Familie), Satz bleibt bei anisearch.
- Namen folgen dem deutschen Quelltext; wo sich Quellen widersprechen (Alter, Jahr, Name), steht der Punkt nicht im Satz (z. B. 2848, 3162, 4083).
- PR-Vorprüfung grün (ein gelber Hinweis: genannte Datei `naehe.ts` nicht im Diff). Kein PR angelegt.

## Rückblick
- gut: fast jeder Titel hat zwei bis drei Quellen im Repo; das Scratch-Skript fand jeden Nähe- und Längenfehler sofort.
- schlecht: Namenslisten („Meg, Jo, Beth und Amy“) und Allerweltsfolgen („nach dem Tod ihres Vaters“) lösen die 5-Wort-Regel aus; die Namen stehen deshalb teils in anderer Reihenfolge als in der Quelle.
- unerwartet: `pr-vorpruefung.mjs` bricht im flachen Cloud-Klon mit „no merge base“ ab; erst `git fetch --deepen=400 origin main` half.
- Vorschlag: Nähe-Regel für reine Eigennamen-Folgen lockern (oder Namen vor dem Vergleich ausnehmen); `pr-vorpruefung.mjs` könnte bei fehlender Merge-Basis selbst vertiefen; Wikipedia als Quellenfamilie zulassen.
- veraltet: Probelauf-Bericht nennt Sätze über 160 Zeichen als Muster; die Grenze gilt erst seit diesem Auftrag.
