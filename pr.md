<!-- titel: fix(daten): Crunchyroll-Folgen zählen je Staffel statt absolut -->

## Ursache
Crunchyroll zählt Folgen über alle Staffeln durch (Black Clover: Folge 171 = Folge 1 von S2), der Datensatz je Staffel. In `pipeline/bau/05-releases.ts` (`uebernehmeCrSlot`) mischt `observedEpisodes(slot)` die absolute Kalender-Nummer 174 (28.11.) unverändert in `schedule.observed` des Synchro-Eintrags (neben den kuratierten 1–3); `hebeFolgenzahlAufBeobachtung` (09-synchro) hob daraufhin `episodeCount` auf 174 (assumed). Der OmU-Begleiter `black-clover-s2-crunchyroll` bekam denselben deutschen Slot: `durchlaufendeZaehlung` sah nur {174} und setzte `firstEpisodeNumber` 174, Start 28.11., Zahl 1 → „Staffelstart“ am 28.11., Pille 174/174, „≈175“, Finale „≈28.11.“.

## Klasse (Zahl)
Gemessen an `public/data/releases.json` (926 Releases, Stand main b9e37cd6): Crunchyroll-Releases, deren beobachtete Nummern über `firstEpisodeNumber-1+Titel-Folgenzahl` liegen oder in einer Woche um mehr als `2·Wochen+2` springen: **1** (`black-clover-s2-crunchyroll-synchro`, 3→174). Betroffen im selben Fall außerdem der OmU-Begleiter (nur {174}, durch den Sprung-Wächter nicht erkennbar, durch die OmU-Regel behoben). Übrige absolut zählende CR-Fälle (`cr-GW4HM7WK9`, `cr-GNVHKN933`) tragen `firstEpisodeNumber` und sind richtig. Außerhalb Crunchyroll fielen 3 TV-Releases mit Nummer über Titel-Folgenzahl auf (`auto-118399-tv-prosieben-maxx` 28/24, `auto-10012621-tv-super-rtl`/`-toggo-plus` 73/52): Fernsehzählung, ohne Beleg nicht angefasst, nur gemeldet. Kuratierte OmU-Einträge mit Crunchyroll: nur dieser eine.

## Ansatz
- `pipeline/lib/cr-zaehlung.ts` (neu): `slotAufStaffelzaehlung(slot, ab)` rechnet Slot-Beobachtungen auf Staffelnummern um (`n − ab + 1`, Vorgängerstaffel entfällt); `crAbsoluteZaehlungFehler` ist der Wächter.
- `pipeline/lib/curated.ts`: neues optionales Feld `crZaehlungAb`.
- `pipeline/bau/05-releases.ts`: rechnet den Slot vor `uebernehmeCrSlot` um; ein `sprache: omu`-Eintrag übernimmt den deutschen Slot nicht (behält Start 03.10. mit Untertiteln; Slot bleibt als benutzt markiert).
- `data/curated/streaming-herbst-2026.yaml`: `crZaehlungAb: 171` am Synchro-Eintrag (Beleg: Katalog `nummer` 171 = `laufend` 1).
- `pipeline/lib/pruefung.ts`: ruft den Wächter in `pruefeErgebnis` auf.
- `pipeline/check-cr-zaehlung.ts` (neu) + Zeile in `tools/check-logic-liste.txt`: Fixtures, kein `Date.now`, kein `public/data`.
- `data/patchnotes/black-clover-folgen-je-staffel.yaml`: Patchnote.
Die Folgenzahl der Staffel bleibt unbelegt: es gilt die bestehende, als angenommen gekennzeichnete Standardzahl (kein neuer Beleg gefunden).

## Beleg
- Basis (rot): `observedEpisodes(slot)` → `{"174":"2026-11-28"}`; Wächter an `public/data/releases.json` meldet 1 Fehler (Folge 3 → 174 in 1 Woche).
- Nachher (grün): `slotAufStaffelzaehlung(slot,171)` → `{"4":"2026-11-28"}`, `derivedStart` → 07.11.; `npx tsx pipeline/check-cr-zaehlung.ts` 11 ✓.
- Mutationsprobe: Umrechnung entfernt → 3 ✖; Sprungregel entfernt → 1 ✖; Titelregel entfernt → 1 ✖; Original grün.
- Grün: `check-omu-synchro-begleiter`, `check-crunchyroll-zuordnung`, `check-cr-folgestaffel`, `check-folge-ueber-titel`, `check-folgenzahl-sichtung`, `check-staffel-anzeige-bau`, `check-cr-doppelt-weg`, `check-folge-ueber-anzahl`, `check-phasenfolge`, `check-sichtung-folge`; `tsc --noEmit -p .`, `check:umfang`, `uhr-in-tests`, Mutationsanker (Diff).
- Nicht gefahren (Cloud, kein `data/cache`): voller Bau, `check:vor-commit`. Live nach Bestandsbau + Deploy messen: Black Clover S2 28.11. = Folge 4, kein „Staffelstart“ am 28.11.

## Warum die Prüfungen es durchließen
`folgenzahlWiderspruch` und `folge-ueber-anzahl` prüfen nur gegen die Folgenzahl des Titels bzw. heben sie bei Beobachtung darüber an — AniList kennt für die laufende S2 keine Folgenzahl, und die Anhebung machte 174 selbst zur Zahl (Zirkelschluss). `durchlaufendeZaehlung` fing nur „kleinste Nummer über Staffellänge“ ab, nicht den Mischfall (kuratiert 1–3 plus absolut 174). Der neue Wächter prüft die Nummern gegeneinander (Sprung gegen Wochenabstand), nicht gegen eine abgeleitete Zahl.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
