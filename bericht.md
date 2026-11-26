# Bericht: Vorschaubild mit Tageshighlight

- Zweig `feat/linkvorschau-tageshighlight` gepusht (1 Commit d684d327), PR nicht angelegt.
- Auswahl `shared/tages-highlight.ts` + Zeichnen `pipeline/lib/og-tag.ts`, eingehängt in `build-og.ts` (Bestandsbau) und `build-share-pages.ts`.
- Fixture-Test (26.11.2026) liefert Fool Night: „Alle 12 Folgen auf Netflix“; Test in `check-logic-liste.txt`.
- Beispielbild `vorschau-2026-11-26.jpg`: 1200×630, 51.530 Byte, 485 ms Erzeugung (Plakat aus vorhandenem Release-Bild, TMDB war gesperrt).
- tsc, umfang, og-termin, leerzeichen grün; `check-teilseiten` braucht `dist`, nicht gefahren.
- Entscheidungsbedürftig: Fool Night hat `sprache: offen` (Titel `very-high`, Stream `dub: true`); nur `omu` ist ausgeschlossen.
- Zeitpunkt: erster Bestandsbau nach 00:00 Berlin + Deploy; bis dahin Markenbild. Kein neuer Cron.

## Rückblick

- Gut: Karte, Lauf und Seitentausch waren da; nur Auswahl und Tagesdatei fehlten.
- Schlecht: Cloud sperrt `image.tmdb.org`; echtes Cover erst im CI-Lauf geprüft.
- Unerwartet: Der 26.11. hat keinen Beliebtheitswert im Datensatz; Gleichstand entscheidet `dubConfidence`, dann Slug.
- Vorschlag: nach dem ersten Lauf `curl -A "facebookexternalhit/1.1" https://anime-kalender.de/ | grep og:image` live prüfen.
- Veraltet: nichts; `docs/wissen/seo.md` nachgeführt.
