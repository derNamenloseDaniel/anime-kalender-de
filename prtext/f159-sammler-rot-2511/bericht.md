# Bericht F159 – Sammler-PRs bleiben nicht mehr „[Prüfung rot]“ liegen

1. Zweig `fix/sammler-rot-basis` gepusht, PR-Text in `prtext/f159-sammler-rot-2511/pr.md` (kein `gh pr`, Sitzung legt den PR an).
2. Teil 1: Basis fährt nur die roten Prüfdateien des Funds (`quellen_pruefen_dateien`, `npx --no-install tsx` je Datei); nicht prüfbare Basis → alles rot, Grund als erste Zeile im PR-Text.
3. Teil 2: Workflow `sammler-rot-erneut.yml` (nach grünem Bestandsbau, nur `GITHUB_TOKEN`), Skript `tools/rote-sammler-erneut.sh`, Entscheidung in `.mjs`; Konflikt mit main bleibt markiert (der nächste Sammel-Lauf löst den PR ab).
4. Tests grün: `quellen-pruefen-main` (11), `rote-sammler-erneut` (17), `quellen-pr-pruefung`, Wächter, `check-workflows`, `zugangs-waechter`, `tsc --noEmit -p .`; Mutationsprobe 7 + 14 Mutanten, alle gefangen.
5. Wissen: `docs/wissen/betrieb.md`, Abschnitt „Sammler prüfen ihren Fund“, Eintrag vom 25.11.2026.
6. Entschieden ohne Rückfrage: eigener Workflow statt Bestandsbau-Schritt (kritischer Pfad zum Deploy); Konflikt = bleibt markiert (Freigabe ohne Prüfung wäre schlechter); Hinweis als ein aktualisierter Kommentar je PR; Laufstatus/`LAUF_ARTEN` nicht angebunden (Laufstatus-App zeigt den Lauf nicht).

**Offen nach dem Merge:** einmal `gh workflow run sammler-rot-erneut.yml` am echten markierten PR (Beleg); Beobachtung nach ~5 Fällen, 1 Tag, 1 Woche.

## Rückblick
- **Gut:** Der Test mit echtem git und nachgebautem `gh` fing beim Bau einen echten Fehler (`FETCH_HEAD` vom zweiten `git fetch` überschrieben: geprüft wurde main statt PR-Stand). Dateiweiser Vergleich ist schnell und genau.
- **Schlecht:** `quellen-pr-pruefung.test.mjs` hängt an `QUELLEN_PRUEFBEFEHL` für die Basis; der Testhaken bleibt als zweiter Pfad in `quellen_pruefen_main`, damit die vorhandenen Fälle gelten. Der Produktionspfad (`npx tsx`) ist nur in `quellen-pruefen-main.test.mjs` mit einer `npx`-Attrappe belegt.
- **Unerwartet:** `tools/test-kind-frist-stand.json` und `check-workflows` (`|| true`-Wächter, Zugangsregister) verlangten je eine Nacharbeit; `check:logic` ohne Sperre für `public/data` auf der Basis ist ein kleiner Unterschied zum Fund-Lauf.
- **Vorschlag:** Nach dem ersten echten Fall prüfen, ob die Basis-Umgebung (ohne `public/data`-Sperre) je einen Unterschied macht; sonst nichts tun. Teil 3 (Aufteilen von `data/source-health.json`) bleibt für nach der Messung.
- **Veraltet:** Der Satz in `docs/wissen/betrieb.md` „eigener Arbeitsbaum, Frist 240 s“ bleibt richtig (Frist gilt jetzt für alle Dateien zusammen); nichts entfernt.
