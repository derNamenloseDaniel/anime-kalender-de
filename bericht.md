# Bericht handlung-satz-teil-09 (26.11.2026)

1. Zweig `daten/handlung-satz-teil-09` (Stand bf53bd8b), eine neue Datei `data/curated/ein-satz-handlung/teil-09.yaml`; `pr-vorpruefung.mjs` grün, kein PR angelegt.
2. Sätze: 244 von 244 Titeln (ids 111312–136707). Lücken: 0.
3. `umfang: reihe`: 7 (114448, 116415, 112177, 124896, 127863, 128390, 126438) – Quelle trägt nur die Reihe, nicht diesen Teil.
4. Nähe (gemeinsamer 5-Wort-Abschnitt mit einem Quelltext des Titels): vorher 33 Sätze, nachher 0; Länge über 160: nachher 0 (längster Satz 160). YAML parst, ids eindeutig und sortiert.
5. Prüfskript im Scratch-Ordner (eigener Vergleich gegen `data/anisearch.json`, `data/tmdb-titles.json`, `public/data/synopses`, `data/handlung-eigen.yaml`); `tools/handlung-naehe.ts` nicht genutzt, es braucht Faktenkarten je Titel, die es für diese ids nicht gibt.
6. Stichprobe 10 Zufallssätze gegen die Quellen (111965, 112323, 112609, 113917, 119683, 127958, 128705, 130050, 130622, 136149): 10 von 10 Kern getroffen, beide Fortsetzungen (112323, 113917) beschreiben ihren Teil. Hinweis 130622: Quellen nennen 1956 (aniSearch, AniList) und 1955 (TMDB); Satz nimmt 1956.
7. Nur eine Quellenfamilie: 113178, 115794, 120892, 126438, 132477 (AniList), 135865, 136436 (aniSearch; AniList-Text dort nur „zweite Staffel“ bzw. „unausgestrahlte Folge“), 136668 (Fandom per WebSearch; im Repo nur Produktionsnotiz). Bei 113178, 120892, 126438 bestätigt eine WebSearch-Zusammenfassung (Wikipedia/TMDB) den Inhalt, als Familie aber nicht eingetragen, weil die Seiten nicht abrufbar waren.
8. WebFetch gesperrt für www.themoviedb.org, www.animenewsnetwork.com, beyblade.fandom.com (Host nicht in der Netzfreigabe der Sitzung); nur WebSearch ging.
9. Namensschreibung nach dem deutschen Quelltext des jeweiligen Teils; dadurch zwischen Staffeln uneinheitlich (Tooru 111762 / Toru 124194, Tokisaki Kurumi 111852 / Kurumi Tokisaki 121034).
10. Erster Push (ed14c550) enthielt 17 doppelte ids (Korrekturzeilen), im Folgecommit da22bc7b behoben.

## Rückblick
- gut: fast alle Titel haben zwei Quellen im Repo; Blöcke von 22 Titeln lesen, schreiben, sofort prüfen lief flüssig; Wortliste „nicht in Quelle“ fing unbelegte Namen ab.
- schlecht: Ziel 160 Zeichen zu knapp angepeilt, rund 60 Sätze mussten nur wegen 1–9 Zeichen gekürzt werden; Namenslisten („A, B, C und D“) lösen die 5-Wort-Regel aus, ohne dass Wortlaut übernommen ist.
- unerwartet: flacher Klon ohne gemeinsame Basis mit `origin/main` (`pr-vorpruefung` brach ab, `git fetch --deepen=300` half); Heredoc-Hook sperrt auch harmlose Skripte mit Backslash.
- Vorschlag: im Auftrag 150 Zeichen als Schreibziel nennen; Namenslisten von der Nähe-Regel ausnehmen; `umfang: reihe` für Bonus-/Minifolgen ausdrücklich erlauben; TMDB/ANN/Fandom für Cloud-Läufe freigeben.
- veraltet: Auftrag sagt „ca. 244 Titel“ – stimmt genau; Hinweis „tools/handlung-naehe.ts nutzen“ passt nicht für Titel ohne Faktenkarte.
