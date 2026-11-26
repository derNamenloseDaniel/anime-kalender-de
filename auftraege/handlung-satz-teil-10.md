Rolle Autor fuer Handlungssaetze. Deutsch, frag niemanden (auch nicht Daniel). Zweig daten/handlung-satz-teil-10 von main.

Auftrag (Daniel 23.11.2026, '1-Satz-Handlung fuer jeden Titel'; Variante A nach Probelauf 26.11.: mehrere Quellen, eigener Wortlaut): fuer jeden Titel in public/data/titles.json mit numerischer id von 136804 bis 163077 einschliesslich (ca. 244 Titel) genau einen Satz Handlung schreiben. Zuerst den Probelauf-Bericht lesen: git fetch origin prtext/handlung-ein-satz-probelauf; git show FETCH_HEAD:bericht.md.

Quellen je Titel aus dem Repo: data/anisearch.json (descriptionDe), data/tmdb-titles.json (overviewDe), public/data/synopses/*.json (de, en), data/handlung-eigen.yaml. Hat ein Titel weniger als 2 Quellen, darf WebSearch/WebFetch eine weitere oeffentliche Quelle liefern (Anime News Network, Fandom, MyAnimeList, Anbieterseite; nie Seiten von anisearch.de abrufen, nie Netflix-Serienseiten). Fremde Quelltexte NIE ins Repo schreiben, nur in einen Scratch-Ordner ausserhalb des Repos.

Regeln je Satz: genau ein Satz, hoechstens 160 Zeichen, Deutsch, eigener Wortlaut (kein Abschnitt von 5 aufeinanderfolgenden Woertern gleich mit einer Quelle); nennt Held, Ausgangslage und Kern; kein Spoiler ueber die Ausgangslage hinaus; bei Staffel > 1, Fortsetzung, Cour 2 oder Film einer Reihe die Ausgangslage DIESES Teils (Quelle der Staffel, nicht der ersten Staffel) - traegt keine Quelle diesen Teil, schreibe den Reihensatz und setze umfang: reihe; keine Zahl und kein Name ohne Beleg in einer Quelle; Namensschreibung wie im deutschen Quelltext. Kein Satz moeglich (0 Quellen, Quellen widersprechen sich zum Kern, nur Titelangabe): keinen Eintrag, im Bericht als Luecke mit Grund. Nichts erfinden.

Ausgabe: genau eine neue Datei data/curated/ein-satz-handlung/teil-10.yaml. Kopfkommentar '# Ein Satz Handlung, Teil 10 (ids 136804-163077), Variante A, Quellenfamilien statt Texte'. Dann YAML-Liste, nach id sortiert, je Eintrag:
- id: 874
  satz: "..."
  quellen: [anisearch, tmdb, anilist]
  geprueftAm: 2026-11-26
(optional umfang: reihe). quellen = Familien der genutzten Quellen (anisearch, tmdb, anilist, eigen, ann, fandom, mal, anbieter). Keine anderen Dateien aendern (keine Pipeline, kein Bau; die Einbindung baut ein eigener Auftrag). Nach jeweils 40 Titeln committen und pushen.

Pruefung vor Abgabe: per Skript (Datei im Scratch-Ordner, nie Heredoc) je Satz Laenge <= 160 und 5-Wort-Naehe gegen alle Quelltexte des Titels (tools/handlung-naehe.ts ansehen und nutzen, falls passend); Treffer umformulieren. YAML muss parsen. Danach 10 zufaellige Saetze selbst gegen die Quellen nachlesen (richtige Staffel? Kern getroffen?) und das Ergebnis in den Bericht. Bericht nennt: Zahl Saetze, Zahl Luecken mit Gruenden, Zahl umfang: reihe, Naehe-Treffer vorher/nachher.

Kein gh pr (Cloud hat kein GraphQL), keinen PR selbst anlegen. Commit-Endzeile: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>. Pushe deinen Zweig vor jedem Warten auf einen Hintergrundlauf und am Ende; lege ausserdem einen Zweig prtext/handlung-satz-teil-10 (von origin/main abgezweigt, nicht orphan) mit pr.md (erste Zeile <!-- titel: ... -->, eine Zeile 'Auftrag: handlung-satz-teil-10', vorher PR_TEXT="$(cat pr.md)" node tools/pr-vorpruefung.mjs --titel "..." gruen) und bericht.md (max 10 Zeilen + Rueckblick gut/schlecht/unerwartet/Vorschlag/veraltet) an und pushe ihn.
