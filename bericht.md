# Bericht handlung-satz-teil-11 (26.11.2026)

- Zweig `daten/handlung-satz-teil-11`, eine neue Datei `data/curated/ein-satz-handlung/teil-11.yaml`: **241 Sätze** für 244 Titel (ids 163078-187941).
- **3 Lücken:** 167418 Pokémon-WM 2023 (AniList nur „Promotional Video“; Bulbapedia nicht abrufbar, nur Suchzusammenfassung, keine erlaubte Familie), 179126 Plus-Sized Elf Folgen 13+14 (nur Veröffentlichungshinweis und Folgentitel), 187054 Sylvanian Families Klee (nur „Third season of …“).
- **5 mit `umfang: reihe`:** 166523, 169826, 185515, 187053, 187055.
- **Nähe-Treffer (5-Wort) vorher/nachher: 13 / 0**; Überlängen im ersten Lauf 46, danach 0; YAML parst (241 Einträge). Prüfskript im Scratch-Ordner, gleiche Wortzerlegung wie `tools/handlung-fakten/naehe.ts`; `tools/handlung-naehe.ts` selbst passte nicht (braucht Faktenkarten je Titel).
- **Stichprobe 10 zufällige Sätze gegen die Quellen** (163137, 163146, 165557, 168092, 169755, 174188, 176158, 176496, 177580, 178868): 10 von 10 richtige Staffel und Kern getroffen; 163146, 169755, 176496 sind Fortsetzungen und tragen die Ausgangslage ihres Teils. Schwäche: 165557 ruht nur auf AniList (aniSearch nennt nur „Teaser“).
- Nur eine tragende Familie bei 25 Sätzen (meist Fortsetzungen, bei denen nur aniSearch den Teil beschreibt, z. B. 169441, 176276, 178789, 185756; nur AniList: 170535, 177166, 178707; nur TMDB: 179874, 186716). Netzquelle kam keine dazu: fandom.com, bulbapedia und mahouka.us sind im Sitzungsnetz gesperrt.
- Namen: bei widersprüchlicher deutscher Schreibung (aniSearch gegen TMDB, z. B. Kouichi/Koichi, Yuzuhira/Yuzuriha) gekürzt oder weggelassen, rund 30 Fälle.
- Unsicher, bitte beim Einbinden ansehen: 178707 (Satz nennt die Behauptung, Miyuki sei nicht Tatsuyas Schwester; steht in der Synopse, nah an der Spoilergrenze), 179828 (Cuckoos S2, Quellen überwiegend Rückblick, ohne `umfang: reihe`), 179344 (aniSearch und AniList beschreiben verschiedene Abschnitte, Satz folgt dem Staffelbeginn).
- Ablauf: Quelltexte je Titel in 6 Stapel im Scratch-Ordner, 5 Stapel von Agenten (je 2 gleichzeitig), 1 Stapel selbst; kein Quelltext im Repo.

## Rückblick
- gut: Stapel von 41 Titeln je Agent (rund 135k Tokens, gut 2 min); Längen- und Nähe-Prüfung als ein Skript, das jeder Agent selbst bis 0 fährt.
- schlecht: 160 Zeichen sind eng, 46 Sätze mussten gekürzt werden; Namenslisten lösen die 5-Wort-Regel aus (Reihenfolge tauschen).
- unerwartet: `synopses/*.json` (de) ist fast immer derselbe Text wie `data/anisearch.json`, zählt also nicht als zweite Quelle; die Probelauf-Sätze im Bericht waren länger als 160 Zeichen.
- Vorschlag: Für die Einbindung `quellen` mit einer Familie sichtbar zählen; Lücke 187054 ließe sich mit dem Reihentext des Stammtitels 187052 als `umfang: reihe` schließen, falls gewünscht; fandom.com für Cloud-Läufe freigeben.
- veraltet: Auftragstext nennt `tools/handlung-naehe.ts` als mögliches Werkzeug, es setzt aber Faktenkarten voraus, die es für diese Titel nicht gibt.
