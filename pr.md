<!-- titel: Staffelstart nur ohne frühere Folgen beim selben Anbieter; Hinweis Band der Unterwelt -->
Auftrag: kalender-n4-n5-staffelstart-finale
Patch Notes: `data/patchnotes/staffelstart-nur-bei-erster-folge.yaml`

## Was ändert sich

- **N4:** Die erste Folge eines Releases ist kein „Staffelstart“ mehr, wenn derselbe Titel beim selben Anbieter schon eine frühere Folge hatte („Folge 1 sofort, Rest wöchentlich“). Betroffen live: `ranma-s3-netflix` Folge 2 (10.10.) und `das-band-der-unterwelt-netflix` Folge 12 (19.09.). Staffelstarts im Datensatz: 230 → 228, sonst nichts (Messung an `public/data` mit `istStaffelstart`, main-Fassung gegen diese).
- **N5:** Kein Fehler im Etikett, sondern im Hinweistext. Das Finale 24/24 (12.12.) steht zu Recht ohne ≈: `hebeAnnahmeAuf` (`pipeline/lib/folgenzahl-belegt.ts`, Daniel 13.10.2026) hebt `episodeCountAssumed` auf, weil der Crunchyroll-Release derselben Titel-ID Folge 1–24 lückenlos beobachtet und das Finale am 10.10. belegt (`episodeCount` 24, `lastEpisodeDate` 2026-10-10). Die Inventur las die YAML, nicht den gebauten Datensatz. Korrigiert ist der Hinweis in `data/curated/streaming-herbst-2026.yaml`: „Gesamtzahl 24 durch Crunchyroll belegt (Finale am 10.10.), von Netflix nicht genannt.“ Finale-Anzahl live unverändert (218), Finale bei angenommener Zahl: 0.

## Fünf Stufen

(a) Ursache: `shared/tv-signale.ts` `istStaffelstart` prüfte nur `episode === firstEpisodeNumber`, nie ob ein anderer Release desselben Titels beim selben Anbieter früher beginnt. N5: veralteter Hinweistext, Etikett folgt der Belegregel schon.
(b) Klasse: 2 von 230 Staffelstarts live (Ranma, Band der Unterwelt), beide „Folge 1 als eigener Batch-Release“. Zählskript fand keinen weiteren Treffer, auch keinen echten geteilten Start (Teil 2 mit gleicher Titel-ID beim selben Anbieter: 0).
(c) Fix an der Klasse: neue Funktion `hatFruehereFolgen` in `shared/tv-signale.ts` (Index je Titel+Anbieter, an der Release-Map gecacht); sie wirkt im Bau (`ev.staffelstart`) und in der Oberfläche (WeekView, MonthView, Kachel-Folgen), weil beide dieselbe Funktion nutzen.
(d) Test: `pipeline/check-logic.ts`, Block „Staffelstart im Raster“, 3 neue Zusicherungen (frühere Folge beim selben Anbieter, anderer Anbieter, früherer Release mit höherer Startnummer). Gegen die main-Fassung von `shared/tv-signale.ts`: `✖ Staffelstart N4: frühere Folge beim selben Anbieter → kein Start`, Exit 1; mit dem Fix Exit 0. Mutationsprobe (4 Mutanten, je Exit 1, alle getötet): Anbieter aus dem Schlüssel, Nummernbedingung weg, `<` → `<=`, Prüfung entfernt.
(e) Warum durchgelassen: Der Test „geteilter Start zählt ab firstEpisodeNumber“ hatte nur einen Release je Titel und kannte keinen Folge-1-Vorläufer; der Datensatz-Wächter `kalender-plausibilitaet` prüft Staffelstart gegen frühere Termine nicht (Vorschlag der Inventur: dort ergänzen, nicht Teil dieses PR). Zur Prüferseite: Die Inventur zählte N5 an der YAML statt am Bauergebnis; Vorgabe an Analysen: Etiketten am gebauten `public/data` messen.

## Grenzen

- Ein echter Teil 2 mit gleicher Titel-ID, gleichem Anbieter und späterem Start würde nun ebenfalls unterdrückt. Aktuell 0 Fälle; die AniList-ID trennt Staffeln, also nicht erwartet.
- N8 (Crunchyroll-Zählung) bewusst nicht berührt (PR `fix/kalender-cr-absolut`).

## Geprüft

`npx tsx pipeline/check-logic.ts` Exit 0; Nachbartests (`check-cr-batch-phase`, `check-finale-wache`, `check-kachel-buendel`, `-bestand`, `-katalog`, `check-premiere`, `check-tv-premiere-merker`) Exit 0; `npx tsc --noEmit -p .` Exit 0; `npm run check:umfang` Exit 0. Nach dem nächsten Bestandsbau live messen: kein `staffelstart` an `ranma-s3-netflix` Folge 2 und `das-band-der-unterwelt-netflix` Folge 12.
