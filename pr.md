<!-- titel: Vier Fortsetzungen mit deutscher Synchro in den Bestand (folgenzahl-widerspruch 17 → 14 erwartet) -->
Auftrag: folgenzahl-fortsetzungen

## Was
Vier AniList-Fortsetzungen fehlten im Hauptbestand, obwohl die deutsche Fassung des Vorgängers ihre Folgen schon mitzählt. Sie kommen über den vorgesehenen Weg für Titel, die MyDubList nicht führt: `data/synchro-von-hand.yaml` (zwei Quellen je Eintrag; der Abruf holt die Kennung, der Bau nimmt sie auf). Keine Codeänderung.

| AniList | Titel | Folgen | Belege |
|---|---|---|---|
| 129610 | Sonic X Season 2 | 26 (dt. Folgen 53–78) | de.wikipedia „Sonic X“: deutsche Ausstrahlung 06.11.2005–26.03.2006; aniSearch 1013: Deutsch vertont, 78 Folgen |
| 146310 | Cat's♥Eye 2nd Season | 37 | de.wikipedia „Cat’s Eye – Ein Supertrio“: „alle 73 Folgen … synchronisiert“; aniSearch 2213: Deutsch vertont, 73 |
| 102427 | Saint Seiya: Knights of the Zodiac (Teil 1) | 6 | de.wikipedia „Saint Seiya: Die Krieger des Zodiac“: Premiere_DE 19.07.2019, Synchronisation ja; aniSearch 12698: Deutsch vertont, Netflix, 12 Folgen |
| 162314 | AoT Final Chapters Special 2 | 1 | de.wikipedia „Attack on Titan/Episodenliste“: dt. Erstausstrahlung 08.01.2024; aniSearch 17265: Deutsch vertont, 2 Folgen |

Patch-Note: `data/patchnotes/fortsetzungen-sonic-x-cats-eye-saint-seiya.yaml`. Doku: `docs/wissen/maengel.md` Block 8.

## Schnellweg (echte Funktionen, Bestand 26.11.2026)
`folgenzahlAusnahme` mit `franchiseTeile(titles.json)` plus dem neuen Teil:
- 1816 Sonic X: offen → `anbieter-franchise` (78 − 52 = 26)
- 114448 Saint Seiya Teil 2: offen → `anbieter-franchise` (12 − 6 = 6)
- 146984 AoT Special 1: offen → `anbieter-franchise` (Zugabe 1)
- 2043 Cat's Eye: bleibt offen (Remake 184718, ONA 12, zählt im Franchise mit: Seriensumme 37 + 12 = 49, gebraucht 73 − 36 = 37)

Erwartung nach dem Bestandsbau: `folgenzahl-widerspruch` 17 → 14 offen (lokal ohne Cache nicht baubar).

K57: `staffelZuordnung` mit 102427 an der Netflix-Adresse 80186926 (St. 1 = 6, St. 2 = 6): vorher und nachher kein Befund (29 → 29).

## Annahmen
- Die aniSearch-Seite des Vorgängers gilt als zweite Quelle, weil ihr deutscher Block die Folgen der Fortsetzung mitzählt (Folgenzahl und Zeitraum).
- 102427 und 114448 tragen dieselbe MAL 36040; zwei AniList-Titel mit gleicher MAL gibt es im Bestand schon dreimal (z. B. Steel Ball Run 190327/210482), keine Zusicherung verbietet es.
- Nicht aufgenommen: 151659 Battle Sanctuary (aniSearch 17500 ohne Deutsch; die Seriensumme für 114448 stiege auf 18) und 145406 Hamtaro Paradichu (aniSearch „Abgebrochen“, wie weit die RTL-II-Fassung reicht, belegt keine erreichbare Quelle).

## Prüfung lokal
`check-logic.ts` (Exit 0, „jeder Handbeleg einer Synchro nennt zwei Quellen“ grün), `check-patchnotes.ts`, `check-quellen.ts`, `check-maengel-regeln.ts`, `check-beleg-wege-protokoll.ts`, `check-ankuendigung-sichtbar.ts`, `check-anisearch-traeger-geplant.ts`, `check-nur-omu-hauptbestand.ts`, `check-omu-ohne-termin.ts`, `check-eigene-titel.ts`: alle Exit 0. Kein Code, also kein Rot/Grün-Test und keine Mutationstabelle.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zqt62yzGQefGRSmoks
