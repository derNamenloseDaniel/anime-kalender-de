<!-- titel: ADN-Mehrfachstart: Dorohedoro S2 wieder mit allen 11 Terminen -->
Auftrag: kalender-n6-adn-abschnitt

## Was ändert sich
Dorohedoro Staffel 2 (`adn-1375`) zeigt wieder alle 11 Folgen bis zum Finale am 27.05. statt 9 Termine ohne Folge 10, 11 und Finale. Bei Serien, deren erste Folgen ADN am selben Tag einstellt, trägt jetzt ADNs Tag jede Folge.

## Die fünf Stufen
- **(a) Ursache:** Zahl (11) und Ende (27.05.) stimmen beide. ADN-Rohdaten `data/adn-raw/1375.json.gz`: Folge 13–15 alle am 01.04., Folge 23 am 27.05. Aber `pipeline/bau/07-adn.ts:266` (`adnRelease`) gab nur Zahl und Ende mit; der Raster in `shared/logic.ts:462` legt je Woche eine Folge und kappt am Ende → 9 Termine.
- **(b) Klasse live:** Zählung aus `public/data` (wöchentliche Releases mit Ende, Termine < `episodeCount`): genau 1 Fall, `adn-1375` (zahl 11, Termine 9). Keine weiteren.
- **(c) Fix an der Klasse:** neue `pipeline/lib/adn-beobachtet.ts` (`beobachteteFolgen`): gibt es im Wochen-Abschnitt Tage mit mehreren Folgen, werden ADNs Tage als `observed` gesetzt; ohne Mehrfachtag bleibt der Raster. Nummernlose Folgen: nichts wird behauptet. Das belegte Ende bleibt unverändert maßgeblich.
- **(d) Test:** `pipeline/check-adn-mehrfachstart.ts` (in `check:logic`), Fixture mit festen Daten. Rot-Beleg gegen die main-Fassung (Verdrahtungszeile in `07-adn.ts` entfernt): `✖ adnRelease trägt die Beobachtung ins Release`, `✖ 11 Termine wie episodeCount — gefunden: 9`, `✖ Finale Folge 11 am 27.05. — gefunden: …"episode":9`, Exit-Code 1. Mit Fix: Exit 0. Mutationsprobe: Wegfall der Zeile → rot (s. o.); `beobachteteFolgen` → `undefined` liefert dasselbe Rot.
- **(e) Warum durchgelassen:** Die Prüfungen verglichen Folgenzahl mit Terminen nur gegen „Termin > Zahl“ (zu viele), nicht „Termine < Zahl bei belegtem Ende“; ein Test auf den Mehrfachstart in `adnRelease` fehlte. Der Wächter (Test oben) deckt die Richtung „zu wenige“ am Bau ab.

## Geprüft
Neuer Test in `tools/check-logic-liste.txt` eingetragen (alphabetisch). `npx tsc --noEmit -p .` ok, `npm run check:umfang` ok, `check-adn-spanne` und `check-adn-block-durchgezaehlt` grün. Datensatz wird vom nächsten Bestandsbau neu erzeugt.
