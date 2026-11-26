# Bericht pruefwerkzeuge-sammel

- (a) bau-vergleich nennt neue, geänderte und verschwundene Folgenlücken (`schedule.observed` in releases.json) als eigene Zeile: `tools/bau-vergleich-luecken.mjs`, eingebunden in `tools/bau-vergleich-stand.mjs`. Vorher rot (Exit 1), nachher grün.
- (b) pre-commit-Schritt `tools/listen-gestagt-pruefen.mjs` prüft gestagte `tools/check-*-liste.txt` auf Sortierung und Doppelzeilen; Hook über `--einrichten`. Vorher rot (Exit 1), nachher grün. Nach dem Merge einmal `bash tools/quellen-commit-wache.sh --einrichten` im Hauptordner.
- Bereits erledigt: nichts; beide Punkte fehlten auf origin/main (`git log -S` auf „Folgenlücke“ und `listenRot` nur im Bestandsbau-Commit bzw. in `pr-vorpruefung`, das gesperrt war).
- tsc, berührte Tests, eslint und Wächter grün; Mutationstabelle im PR-Text (10 Überlebende, alle begründet). bau-vergleich selbst in der Cloud nicht gefahren (kein `data/cache`).
- Gut: Die Prüfregel `liste-pruefen` ließ sich unverändert wiederverwenden. Schlecht: Der Mutantenläufer fährt je Datei nur `<name>.test.mjs`; Einbindungsfälle mussten in den Nachbartest.
- Unerwartet: `listenRot` gab es schon in `pr-vorpruefung` (nur in der PR-Kette, nicht im Hook). `public/data/folgen/*.json` führt keine Nummern je Termin, die Lückenprüfung gilt nur für releases.json.
- Vorschlag: Test-Namenskonvention beim Mutantenläufer verbessern (`leerzeichen-gestagt.test.mjs` wird nie mutiert, weil der Name nicht `leerzeichen-gestagt-pruefen.test.mjs` heißt). `listenRot` aus `pr-vorpruefung` später auf das neue Werkzeug umstellen, damit die Regel an einer Stelle steht.
- Veraltet: nichts gefunden.
