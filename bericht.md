# Bericht folgenzahl-fortsetzungen (26.11.2026)

Zweig `fix/folgenzahl-fortsetzungen`, Commit ec6714e46: vier Fortsetzungen per `data/synchro-von-hand.yaml` (je de.wikipedia + aniSearch).
Schnellweg (`folgenzahlAusnahme`, Bestand 26.11.): schließen 1816 Sonic X, 114448 Saint Seiya Teil 2, 146984 AoT Special 1 → erwartet 17 → 14 offen nach dem Bestandsbau.
Offen mit Ursache:
- 2043 Cat's Eye: 146310 aufgenommen, aber das Remake 184718 (ONA 12, ALTERNATIVE) zählt in der Seriensumme mit → Regelfrage (eigener PR: nur Vorgänger/Fortsetzungen statt ganzes Franchise).
- 508 Hamtaro: Paradichu 145406 ohne Beleg für deutsche Fassung (aniSearch 764 „Abgebrochen“), kein Weg.
- 98873 Overlord, 132232 Penguindrum, 109002 Code Geass PD: aniSearch bündelt Filme/Dramen (Bau-Entscheidung `jeAsId`, Block 8); Penguindrum-Kouhen 148179 würde als Film nicht zählen.
- 99470 Grisaia (Filme zählen nicht), 148149 Sailor Moon Cosmos (Kouhen 160850 ist MOVIE), 154147 GuP (Zugabe 130362 = 6, nötig 2): keine Fortsetzung löst es.
- 131586, 132340, 135255, 151126, 188055 (Liste um 1–2 länger), 175914 (Prime 13 = Folgen von Staffel 1): keine fehlende Fortsetzung.

Rückblick — gut: Simulation mit den echten Funktionen vor dem Eintrag zeigte Cat's Eye und Battle Sanctuary als Fallen. Schlecht: Cloud ohne Cache, Wirkung erst nach Bestandsbau messbar. Unerwartet: 102427/114448 teilen MAL 36040. Vorschlag: `ausFranchise` auf die Relationskette (PREQUEL/SEQUEL) begrenzen, dann schließt Cat's Eye.
