## Nachtrag (Cloud-Nachbesserung Runde 1, 5110)

- **A1 erledigt:** `check-adn-mehrfachstart` hat zwei Fälle „Folge 13 an zwei Tagen" (Wiederholung hinten und vorn). Mutant `e.date < bisher` → `>` in `beobachteteFolgen`: vorher Exit 0, jetzt Exit 1 (beide Fälle ✖), zurückgesetzt, Test wieder Exit 0.
- **A2 erledigt (Bilanz je Titel):** Bau-Eingang = `data/adn.json` + `data/adn-catalog.json` (121 Serien, nur `vde`-Folgen); darin 16 Wochen-Blöcke, `beobachteteFolgen` greift bei genau **1** (Dorohedoro 1375 S2); Vergleich `expandEvents` mit und ohne `observed` je Block. Die ~25 Serien aus `data/adn-raw` (u. a. 1013, 1121, 1165, 1259, 1369, 970) sind im Bau-Eingang nicht vorhanden (Archiv hält alle Sprachfassungen, der Bau nur `vde`), also keine Mitläufer.

  | Titel | Folgen | Termine alt → neu | estimated alt → neu | Ende alt → neu |
  |---|---|---|---|---|
  | 1375 Dorohedoro S2 | 11 | 9 → 11 | 0 → 0 | 27.05. → 27.05. (Folge 9 → 11) |
  | übrige 15 Wochen-Blöcke | – | unverändert (kein Mehrfachtag → `undefined`) | – | – |

  Ende-zu-Ende mit echtem Block aus dem Katalog (`adnRelease`, `staffelBloecke`), neu: `1@04-01 2@04-01 3@04-01 4@04-08 … 10@05-20 11@05-27`; alt: `1@04-01 2@04-08 … 9@05-27`, `episodeCount` 11. Skripte: Scratchpad `adn-a2/bilanz.ts`, `e2e.ts`.
- **A3 erledigt:** `data/patchnotes/dorohedoro-staffel-2-alle-termine.yaml` („Dorohedoro Staffel 2 zeigt alle 11 Folgen", 7 Wörter, `bugfix`, `check-patchnotes` Exit 0).
- **A4 erledigt:** Ja, gewollt: ADNs Kalendertag ist ein Sendeplan-Beleg, auch für noch nicht erschienene Folgen; Kommentar an `observed` in `07-adn.ts`, Testfall „Zukunftstermine" (Daten 2099: 11 Termine, keiner geschätzt).
- Lokal grün: `check-adn-mehrfachstart`, `check-adn-spanne`, `check-patchnotes`, `npx tsc --noEmit -p .`, eslint der Testdatei. Merge `origin/main` in den Zweig (kein Force-Push), Kopf `23e94b5319`.
