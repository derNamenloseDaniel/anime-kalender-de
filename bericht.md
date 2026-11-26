# Bericht maengel-folgentitel (26.11.2026)

- Zweig `fix/maengel-folgentitel`, 6 Commits, gepusht; kein PR geöffnet (kein `gh pr`), Text in `pr.md`.
- Zahlen folgentitel (auto:tmdb): vorher 283 offen (Auftrag: 281), nachher 280 erwartet (Simulation mit echten Bau-Funktionen; gemessen erst nach dem Bestandsbau). Miraculous Staffel 1: 17 → 26 von 26.
- Teil 1: Alle 283 in sieben Klassen eingeordnet (99 Format, 47 ohne Kennung, 72 nie abgerufen, 16 Folgenzahl, 28 Platzhalter/englisch, 18 teils englisch, 3 voll aber offen). Echter Code-Fehler: Handzuordnung füllte nur vorhandene Zeilen und verlor Handfolgen ohne Zeile still; `mitHandTiteln` legt sie an, Test rot auf `main` (Exit 1), grün neu, 29 Diff-Mutanten 0 überlebt.
- Teil 2: 15 Titel in `data/folgentitel-hand.yaml` (Miraculous S1 ×9, S3 ×4, Es war einmal … Amerika ×2), Quelle de.wikipedia-Episodenliste plus TMDB, Reihenfolge an den vorhandenen Titeln gegengeprüft (17/17, 22/22, 24/24). fernsehserien.de nicht benutzt (laut Dateikopf ausgeschlossen).
- Nicht erledigt: Miraculous S2 und S4 (Wikipedia-Reihenfolge weicht von unseren Dateien ab, Nummern wären geraten); weitere Titel ohne Wikipedia-Liste (Mech Cadets, Wandance, Pacific Rim: The Black, Iruma-kun, Zestiria).
- Cloud-Grenzen: kein `data/cache`, kein Bestandsbau, daher keine Messung am gebauten Datensatz und kein `check:vor-commit`; die PR-Kette übernimmt das.

## Rückblick
- **gut:** Der Eintragsversuch deckte den Handzeilen-Fehler auf, bevor die Daten ins Leere gelaufen wären; Simulation mit den echten Funktionen statt Raten.
- **schlecht:** Die Vorgabe „fernsehserien.de oder de.wikipedia“ widerspricht dem Dateikopf der Handliste; Wikipedia steht dort nicht als erlaubte Quelle und wurde im Kopf ergänzt (Prüfer bitte bestätigen).
- **unerwartet:** TMDB-Staffelnummern und Wikipedia-Reihenfolge laufen bei Miraculous S2/S4 auseinander; Eigennamen und Englisch-Rückfälle sind in `tmdb-folgen.json` nicht trennbar.
- **Vorschlag:** Reihenfolge Miraculous S2/S4 (deutsche Erstausstrahlung gegen Produktionsfolge) lokal an einer deutschen Quelle klären; danach 10 + 2 Titel per Hand eintragen.
- **veraltet:** Die Zeile „Rang 8 … 294 → 283“ in `docs/wissen/maengel.md` nennt 283 als Stand; nach dem Bestandsbau auf 280 nachführen.
