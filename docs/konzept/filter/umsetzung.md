# Filterkonzept, Umsetzung (22.11.2026)

Schritt 3 von 3. Grundlage: [umsetzungsplan.md](umsetzungsplan.md) (Fassung 2) und [gegenpruefung.md](gegenpruefung.md). Mockup: `web/buehne/mockups/filter-konzept.tsx` (Bühne, Fälle unten). **NICHT MERGEN vor Daniels Test des Mockups.**

## Was gebaut ist

| Schritt | Stand | Wo |
|---|---|---|
| S1 Weg-Modell, Disc-Weg, Rettungsweg | gebaut | `web/src/lib/wege-filter.ts`, `check-filter-wege.ts` |
| S1 Speicher je Ansicht, Push-Abo-Leck, Migration | gebaut | `vorlieben.ts`, `router.ts`, `kalender-filter.ts`, `check-vorlieben-getrennt.ts` |
| S2 Kachel zeigt nur bestehende Wege (R5) | gebaut | `db-karte.tsx`, `kartenPlattform` |
| S2 Leerzustand nennt die Filter | war schon da (Suchhinweis „… ist ausgeblendet durch: …", Bild 4 und 5) | `suchhinweis*.ts` |
| S3 Einschluss auf gleichem Weg (Plattform, Art, Jahr, Status, kostenlos, `modus`) | gebaut | `wege-filter.ts` |
| S4 tote Zustände | gebaut (Umbenennung „Streambar" zurückgestellt, siehe Entscheidung 10) | `FilterDetails.tsx`, `schnellfilter.tsx`, `check-filter-ebenen.ts` |
| S5 aktive Chips, Zahlen an Chips, Schnellfläche, Schalter über der Liste am Handy, „Streambar" | gebaut (23.11.2026) | `filter/AktiveChips.tsx`, `lib/filter-zaehlung.ts`, `filter/FilterZaehlungsrahmen.tsx`, `ansicht-filterfenster-s5.mjs` |
| S6 Doku, Wächter | gebaut | `docs/wissen/*`, Skills, Agenten |

Umbau und Verhaltensänderung sind getrennte Commits; der Umbau (Weg-Block nach `wege-filter.ts`) ist an 21 Filterzuständen auf `titles.json` (Stichtag 22.11.2026) vorher/nachher identisch (Trefferzahl und Kennungs-Hash).

## Top 5 für den Besucher (Bildpaare Handy 375, hell und dunkel, [top5/](top5/))

Bilder: `top5/<n>-<fall>-vorher|nachher-hell|dunkel.png`, aus der Bühne (`npm run buehne:bilder -- --mockup filter-konzept`); Vorher ist der nachgebaute Stand von `main`.

1. **Yaiba bleibt bei „Disc aus"** (`1-yaiba-joyn-*`). Wer Disc ausblendet, verliert keinen Anime mehr, der streamt. Suche „Yaiba": 0 → 1 Treffer, die Kachel zeigt Joyn statt Disc. Datenbank-Basis `titles.json`: „Disc aus" 2.738 → 2.894 Titel; bleiben 156 Anime mit Stream (vorher zu Unrecht weg).
2. **Streamer bleiben sichtbar** (`2-attack-on-titan-*`). Suche „Final Season" mit „Disc aus": 2 → 3 Treffer (Final Season hat Crunchyroll und eine Disc). „Prime aus" 2.005 → 2.718, „Crunchyroll aus" 2.247 → 2.776, „Netflix aus" 2.528 → 2.703: ausgeblendet wird die Plattform, nicht der Titel, der noch woanders läuft.
3. **Kalender und Datenbank getrennt** (`3-sakamoto-days-*`). Das Kalender-Auge „Disc" ändert die Datenbank nicht: Filter-Zähler der Datenbank 1 → 0, Treffer für „Sakamoto" 0 → 2. Auch das Push-Abo hängt nur am Kalender.
4. **„Netflix + Disc" erfindet nichts** (`4-dan-da-dan-*`). Kombinierte Weg-Filter verlangen denselben Weg: Netflix + Disc 22 → 0, TV + Disc 5 → 0; Dan Da Dan 2 → 0 Treffer, und der Hinweis nennt die Filter („ausgeblendet durch: Plattform Netflix, Art disc").
5. **„Kostenlos + Crunchyroll" zeigt nur Kostenloses** (`5-fernsehtag-detektiv-conan-*`). Kostenlos + Netflix 17 → 0; Detektiv Conan (kostenlos nur auf Joyn) 1 → 0 Treffer; „Netflix + 2026" 90 → 47.

Nicht in den Top 5, aber geändert: Im Kalender fehlen „Jahr" und der doppelte TV-Plattformchip, in der Datenbank „bestätigt".

## Zahlen (titles.json, Stichtag 22.11.2026, Messskript im Scratchpad)

| Fall | vorher | nachher | Plan |
|---|---|---|---|
| Disc aus | 2.738 | 2.894 | 2.894 (mit Rettung) |
| Prime aus | 2.005 | 2.718 | 2.448 (ohne Rettung über Stream-Links, siehe Entscheidung 1) |
| Crunchyroll aus | 2.247 | 2.776 | 2.596 (dito) |
| Netflix aus | 2.528 | 2.703 | 2.694 (dito) |
| Netflix + Disc, TV + Disc, kostenlos + Netflix | 22, 5, 17 | 0, 0, 0 | 0 |
| Crunchyroll + Film | 115 | 115 | 115 |
| Film aus, Jahr 2026 (450), Status | gleich | gleich | gleich |

## Entscheidungen der Umsetzung (ohne Rückfrage getroffen)

1. **Stream-Links retten auch bei Plattform-Ausschlüssen.** Der Plan nennt „Prime aus 2.448", rechnet aber ohne die Rettung über `watchLinks` (kind `stream`, z. B. maxdome, Apple TV); mit Rettung (Auftrag, Gegenprüfung B5) bleiben 270 Prime-Titel, die auch dort zu streamen sind. Die Zahlen oben sind die mit Rettung.
2. **Jahr und Status im Ausschluss bleiben Titel-Eigenschaft** (Streams und Links tragen keinen Status/kein Jahr; Weg-Ausschluss würde jeden Titel mit Stream halten). Im Einschluss sind beide Weg-Eigenschaften; Titel ohne Release erben `jpYear` und Titelstatus.
3. **Anbieter im Einschluss bleibt Titel-Eigenschaft** (Kauflinks zählen dort, „maxdome" = Abo oder Kauf); im Ausschluss zählen Stream-Links als Weg.
4. **„kostenlos" im Einschluss** verlangt einen kostenlosen Weg nur zusammen mit gewählten Plattformen; allein bleibt es die Titel-Rechnung (`kostenloseFolgen`).
5. **Das Mockup hat Fälle mit vorhandenen Bühnen-Titeln** (Yaiba, Attack on Titan, Sakamoto Days, Dan Da Dan, Detektiv Conan): ein Titel steht nur in einem Fall (`buehne-faelle.mjs`). Der Kalender-Auge-Fall legt den Zustand vorab in den flüchtigen Speicher der Zelle.
6. **Messung:** `buehne:bauen` grün, `buehne:bilder` grün; `buehne:messen` läuft (Exit 0), misst aber nur die Mockups mit Messpunkten (disc-bereich); `filter-konzept` hat keine eigenen Bauteile, daher keine neuen Tippziele.
7. **S5 gebaut (23.11.2026):** aktive Chips (Handy eine Zeile, Rechner im Listenkopf), Zahlen an Chips (`filter-zaehlung.ts`, beim Öffnen des Fensters), einfarbige Schnellfläche, „ohne Synchro"/„Staffeln zusammenfassen" stehen am Handy über der Liste (die Werkzeugleiste unten hat keinen Platz dafür), `ModusSchalter` auf `ak-*`.
8. **Migration:** der alte Schlüssel `vorlieben` wird als Kopie gelesen und verschwindet, sobald beide Ansichten ihren haben; Code entfernen frühestens **31.01.2027**.
9. **Nebenbefund:** zwei Releases (`auto-544-disc`, `auto-142770-disc`) haben `platform disc`, aber `releaseType movie`; der Disc-Weg zählt sie jetzt als Disc, die Daten bleiben (eigener Auftrag).

## Beobachtung nach Einführung (Regel Neueinführung)

Am ersten Fall (Yaiba live bei „Disc aus", Kalender-Auge ändert die Datenbank nicht), nach etwa fünf Fällen, nach einem Tag, nach einer Woche (Zählprobe gegen die Live-Seite; Zahlen oben als Soll).

10. **„verfügbar" → „Streambar"** kam mit S5 (Tippfläche 44 px über `TIPPFLAECHE_HOCH`).

11. **Zählprobe 23.11.2026 (Beobachtung nach S5):** Live „Cartoon 922, Treffer 907" und „Prime Video 954, Treffer 953" waren eine Messlücke, kein Zählfehler: die Gruppe „Ohne bekannten Termin" (15 bzw. 1) steht am Listenende und erscheint erst nach „weitere anzeigen"; die Summe der Köpfe davor fehlt genau diese Gruppe. Gemessen wird die Zählzeile über der Liste (922). Echter Fund dabei: bei zusammengefassten Staffeln zählte der Chip Reihen, die Liste zeigt laufende und kommende Staffeln einzeln (`ordneListe`); Chip und Liste rechnen jetzt dieselbe Funktion. `check-filter-zaehlung-bestand.ts` prüft gegen die Quelle der Seite samt `cartoons.json` und gegen `ordneListe`.
