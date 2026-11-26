# Bericht kalender-n6-adn-abschnitt
- Fix: `fix/kalender-n6-adn-abschnitt` (gepusht, kein PR angelegt). Dorohedoro S2 (`adn-1375`): ADN-Rohdaten belegen Zahl 11 und Ende 27.05. (Folge 13–15 am 01.04., Folge 23 am 27.05.); beide stimmen.
- Ursache: `07-adn.ts:266` gab nur Zahl und Ende mit, der Wochenraster setzte eine Folge je Woche und kappte am Ende: 9 Termine.
- Fix an der Klasse: `pipeline/lib/adn-beobachtet.ts` trägt ADNs Tage als `observed`, wenn ein Wochen-Abschnitt Mehrfachtage hat; sonst Raster. Belegtes Ende unverändert.
- Live betroffen: genau 1 Fall (`adn-1375`); Datensatz folgt dem nächsten Bestandsbau.
- Test `check-adn-mehrfachstart.ts`: gegen main-Fassung Exit 1 (9 statt 11), mit Fix Exit 0; tsc, check:umfang, Vorprüfung grün.

## Rückblick
- gut: Rohdaten in `data/adn-raw` klären Zahl gegen Ende ohne Websuche eindeutig.
- schlecht: Kein Wächter für „Termine < Zahl“ bei Wochenreleases; deshalb blieb der Fall unbemerkt.
- unerwartet: Der Klon war flach; `pr-vorpruefung` braucht vollen Verlauf (`git fetch --unshallow`, rund 2 Min.).
- Vorschlag: Bestandswächter „Wochenrelease mit Ende: Termine = episodeCount“ in `check:bestand`.
- veraltet: nichts gefunden.
