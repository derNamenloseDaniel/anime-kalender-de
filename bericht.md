# Bericht: fix/kalender-jojo-finale (Nachbesserung 1)
- Hinweis-Commit d155b7b29 verworfen; Zweig neu von origin/main, ein Commit, force-with-lease gepusht.
- `firstEpisodeNumber: 2` am Release; 27.11. = Folge 11 (kein Finale), 04.12. = Folge 12 (Finale). `zeiten` auf 7–12.
- Folge-1-Beleg und `episodes`-Anhebung nicht nötig: `pruefung.ts` und `folgenDavor` nehmen durchlaufende Zählung aus; Kasten sagt bei Titelzahl 11 und 12 „Finale Folge 12“.
- Wächter `check-netflix-zaehlung.ts` (Fixtures), Mutationsprobe 5/5 rot; tsc, check:umfang grün.
- Nicht lokal prüfbar: Bau, check:bestand (kein data/cache) – PR-Kette; nach Deploy live messen.
- Klasse nur zu zählen: Netflix-Titel mit eigener Folge-1-Seite plus Fortsetzung ab 1 – nicht gezählt.

## Rückblick
- Gut: Schnellweg über `expandEvents` + `tv-signale` zeigte rot/grün in Sekunden ohne Bau.
- Schlecht: Sammel-Befehle mit einem gesperrten Teil scheitern komplett (Hook), mehrfach Zeit verloren.
- Unerwartet: keine der beiden genannten Prüfungen verlangte Beleg/Override; Wächter pinnt das nun.
- Vorschlag: `zeiten`-Schlüssel dokumentieren (Gesamtnummern bei `firstEpisodeNumber`).
- Veraltet: Kommentar „Nummern von Titel 210482“ entfernt.
