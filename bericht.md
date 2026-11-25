# Bericht bestand-verstoss-zeile-2511

- Ursache: `zaehleOderMelde` liefert NaN, wenn die Zeile `VERSTÖSSE: <n>` fehlt; Quelle der Liste: `restSkripte` + `tools/check-bestand-liste.txt` (124 Prüfungen).
- Zahl: 16 von 124 druckten keine Zeile (keine mit mehreren), z. B. `pipeline/check-toggo-seiten-bestand.ts:91`, `check-kanal-merkliste-gesperrt.ts:35`, `check-cr-neu-bestand.ts:44-66`; Rohdaten lokal gemessen.
- Fix: 15 Prüfungen drucken die Zeile auf jedem Ausgang, Exit-Codes gleich (vorher/nachher je Prüfung geprüft); Zweig `fix/bestand-verstoss-zeile`.
- Wächter: `tools/bestand-verstoss-zeile.mjs` + Test (läuft über `tests-alle`), Ratsche `BEKANNT`; Mutationsprobe rot, zurück grün.
- Rest: `check-staffel-ohne-seite-bestand.ts` (steht in `BEKANNT`, nach der anderen Sitzung Zeile ergänzen und streichen); `check-staffel-folge-tv-schleife.ts` druckt die Zeile im Kindprozess, ein harter Absturz des Kinds ohne Ausgabe bliebe ohne Zeile.
- Rückblick: gut: Wächter `bestand-verstoss-zeile` existierte schon (stumme Ausgänge), nur erweitert; schlecht: dessen Kopfkommentar zählt noch „nichtleere Zeilen“ (überholt, nicht angefasst); unerwartet: `check-cr-neu-wache.ts` erwartete leeres stdout; Vorschlag: Zählvertrag im Kopfkommentar nachführen.
