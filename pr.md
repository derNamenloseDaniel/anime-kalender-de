<!-- titel: Bastard!! Teil 2 doppelt gezählt — auf main bereits erledigt, kein Datenfix nötig -->
Auftrag: bastard-teil2-doppelt

**Kein PR öffnen.** Der Befund aus dem Auftrag ist auf `origin/main` (63bc8fd1, 26.11.2026 20:24 UTC) schon behoben; es gibt keine Änderung zu liefern.

## Stufen
- (a) Ursache: aniSearch führt Bastard!! als zwei Seiten (17066 = Folgen 1–13, 17505 = Folgen 14–24, 11 Folgen); AniList 144677 zählt beides als 24 Folgen. Teil 2 stand als eigener Titel 10017505 (11 Folgen) neben 144677 (24) → `ueberlappung` in `staffelZuordnung` (`pipeline/lib/maengel-staffel.ts:24`), Weg wanderte auf 144677 („Weg verschoben“).
- (b) Klasse: heute `staffelZuordnung` über `public/data/titles.json` + `data/anbieter-staffeln.json` gerechnet: 29 Befunde, davon 23 `ohne-bereich` (keine Staffelliste, kein Widerspruch) und 6 laufende Reihen (Blue Box 170942/189123, Ramparts of Ice 186497/213805, Steel Ball Run 190327/210482; Ausnahme `laeuft`, Netflix-Liste wächst). **Kein Bastard-Fall mehr.** Klasse ≤ 5 echte Fälle → kein Wächter.
- (c) Ist-Stand: `data/kennungen.json:18308` trägt `zuAk` 13900 (→ 144677) für 10017505; `maengel.json` führt 144677/159926 `behoben` (25.11.), 10017505 `abwesend`. Netflix 81281582 „St. 1“ = 24 Folgen (`data/anbieter-staffeln.json`), 144677 = 24, 159926 = 15 („St. 2“): jede Folge einmal gezählt, der Weg liegt bei beiden Titeln.
- Beleg Aufteilung: Netflix bringt 13 Folgen am 30.06.2022 und 11 (Folgen 14–24) am 15.09.2022 als eine Staffel (WebSearch 26.11.2026: animegeek.com, Anime News Network, MAL 51366 „Part 2“ = zweite Hälfte von Staffel 1).
- (d) Test/Mutationsprobe: nicht gebaut, weil keine Codeänderung (Basis-Beleg rot→grün entfällt).
- (e) Warum durchgelassen: PR 5026 legte Teil 2 an; die Kette prüft `ueberlappung` erst im Bestandsbau (`13-12-maengel.ts`), nicht im PR. Behoben wurde es durch die `zuAk`-Zusammenlegung im Datenlauf.
