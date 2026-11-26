# Kalender-Fehler-Inventur (Analyst, 26.11.2026, Stand Live-Daten `generatedAt` 2026-11-26T19:23Z, Commit b9e37cd6)

Methode: Skripte lesen `public/data/{releases,events,titles,titles-core}.json` und `folgen/*.json`; die Anzeigelogik wurde mit den echten Funktionen auf den echten Daten gerufen (`berechneAntwort`, `expandEvents`, `terminZustand`, `istErschienen`; Uhr 26.11.2026 19:45 Berlin). Skripte: Scratchpad `inv-an1/m1…m13`. Keine Datei im Repo geändert.
Nicht doppelt gezählt: Klassen A, B, C, D, E, G (Auftrag). Wo eine neue Klasse an A/C/D grenzt, steht „Nachbar“.

## Klassen (Rang nach Zahl × Sichtbarkeit, heute bis 03.12. zuerst)

| # | Regel (so ist es falsch) | Zahl (Termine / Releases) | davon heute…03.12. | Rang-Begründung |
|---|---|---|---|---|
| N1 | **Verstrichener Termin trägt „≈“, zählt aber als erschienen.** `terminZustand` liefert für alle `estimated`-Termine in der Vergangenheit `erschienen`; das Datum bleibt „geschätzt“. | 81 / 24 (13 Katalog-/Filmstart, 53 Wochenserien, 15 TV-Sendetage) | 0 | größte Zahl; Panel („N von M erschienen“ mit ≈) und vergangene Kalenderwochen |
| N2 | **Folge vor/zwischen belegten Folgen bleibt „≈“** (zurückgerechnet oder fortgeschrieben, obwohl spätere Folge beobachtet bzw. `belegtBis` sie deckt). | 50 / 8 (ohne Yaiba = G) | 0 | gleiche Ursache wie N1, aber hier ist der Beleg im Datensatz schon da |
| N3 | **TV-Wiederholung mit Sendetagen: nur der Starttag belegt, jeder Folgetag „≈“**, obwohl EPG-Quellen am Release stehen und `skipDates` daraus gesetzt sind. | 21 / 1 (One Piece „Whole Cake Island“, ProSieben MAXX) + 3 Yaiba-TV (G) | **6 (heute 26.11. 18:50 eingeschlossen)** | heute sichtbar, tägliches Ereignis |
| N4 | **„Staffelstart“ auf Folge > 1, obwohl frühere Folgen derselben Plattform schon erschienen.** | 2 neue (+ Black Clover = A) | 0 (Black Clover 28.11. = A) | Muster kehrt bei jedem „Folge 1 sofort, Rest wöchentlich“ wieder |
| N5 | **Finale auf „≈“-Termin mit unbelegter Zahl.** Hinweis sagt „Gesamtzahl … von Netflix nicht genannt“, die Kachel zeigt „Staffelfinale“ ohne ≈ an der Zahl. | 1 (Das Band der Unterwelt, 12.12.); weitere 11 Finale stehen auf ≈-Tag (Zahl belegt, nur Datum ≈: in Ordnung) | 0 | klein, aber Behauptung ohne Beleg |
| N6 | **ADN-Release schneidet Termine vor `episodeCount` ab:** `lastEpisodeDate` liegt vor dem Wochentakt-Ende, Folgen 10 und 11 fehlen, kein Finale. | 1 (Dorohedoro Staffel 2, `adn-1375`: Zahl 11, 9 Termine) | 0 | einzige Abweichung im ganzen Bestand (Zählung: 1 von allen Nicht-TV-Wochenreleases) |
| N7 | **Hinweis widerspricht dem Termin daneben.** Tokyo Revengers Staffel 3 (Disney+): Hinweis „freitags 19:00 (ab 30.10. 18:00), Anime2You: samstags 19:00“, Termin steht Freitag 18:00 als „≈“. | 1 | 1 (27.11. 18:00) | heute/morgen sichtbar, Quellenstreit ungelöst |
| N8 | **Crunchyroll-Staffeln mit durchlaufender Zählung** (Nachbar von A): Folge 13–24 / 25–36 bei Titelzahl 12, „Staffelstart“ bei 13 bzw. 25. | 24 / 2 (Wistoria S2 `cr-GW4HM7WK9`, 100 Girlfriends S3 `cr-GNVHKN933`) | 0 (Mai–Okt.) | A-Nachbar, nur Vergangenheit |
| N9 | **„Auf Deutsch, ≈ N Folgen“ im Panelkopf bei Serien, deren Ton auf Serienebene belegt ist** (Beobachtung, Entscheidung nötig). | 1.456 von 2.924 Titeln (`berechneAntwort` → `fertig` + `gesamtAbgeleitet`) | – | größte Zahl überhaupt, aber Entwurf: Zahl = AniList-Werkfolgen, Beleg = „alles liegt dort“. `folgen/*.json` `de` stammt aus derselben Annahme (`folgen-dateien.ts:92`), ist also kein unabhängiger Beleg. |

Bestätigt ohne Befund (0): Termin mit Folge > Folgenzahl (0), beobachtete Folge > Folgenzahl (0), Releases ohne `sources` (0 von 926), doppelte Event-IDs (0), Folge n+1 vor Folge n am Datum (nur Pokémon-TV-Wiederholungen, korrekt als „Wdh.“), Folgenzahl < Folgenliste (1: One Piece Wiederholung 780–877 gegen Liste bis 1180: korrekt), „Pille Deutsch + Antwort ‚ohne‘“ (0), Panel „läuft“ mit nächster Folge in der Vergangenheit (0), Release mit Titel fehlt in `titles.json` (24, alle Cartoons in `titles-core.json`: kein Fehler).
Nachbar C (nur zur Zahl): 5 Termine mit `sprache: 'offen'` bei `dub: true` am Titel-Stream (Demon Slayer Entertainment District + Mugen Train Prime 10.10., `auto-141391-netflix`, `auto-10021751-netflix`; Zahl aus `events.json`, nicht weiter verfolgt).

## Beispiele und Ursachen

### N1 Vergangenes „≈“ gilt als erschienen (81)
1. `thunder-3` (Netflix) Folge 1–5, 7–12, 08.07.–23.09.: live „≈“, Folge 6 (12.08.) ist beobachtet, Serie seit zwei Monaten durch. Richtig: Folgen vor der beobachteten sind erschienen (Datum bleibt Rückrechnung, aber kein „≈“-Anspruch auf das Erscheinen).
2. `naruto-shippuden-s4-disneyplus` 04.11. (Katalogstart, `estimated`): drei Wochen alt, nie bestätigt, zählt als erschienen. Gleiche Gruppe: `yu-gi-oh-s5-disneyplus` 28.10., `auto-169969-netflix` 01.11., `auto-5000001-joyn`/`-primevideo` 03.11. (Filme).
3. `tank-chair-primevideo` Folge 2–4 (11.–25.10.): nur Folge 1 beobachtet, Folgen danach alle „≈“ und vergangen.
4. `seven-knights-marronnier-kingdom-primevideo` Folge 3–5 (17.–31.10.): Folge 1, 2 beobachtet.
5. `devils-crest-primevideo` Folge 4 (20.11.): „≈“, vergangen.
Ursache: `shared/logic.ts:314-322` (`terminGeschaetzt`): „belegt“ nur bei `observed[episode]`, `belegtBis` (nur mit niedrigerer Beobachtung) oder Sendeplan-Stützpunkt; ein Tag, der verstrichen ist, ändert nichts. `shared/termin-zustand.ts` liefert für sie `erschienen` (Live-Aufruf: 13 Katalog + 53 Woche + 15 TV → alle `erschienen`), `web/src/components/detail/folgen-spanne.ts:40` zeigt dann die Spanne mit „≈“.
Fix (Vermutung, Lesekette bis `folgen-spanne.ts` verfolgt, bis zum Kalender nicht): In `terminGeschaetzt` Folgen mit Nummer **kleiner als die höchste beobachtete** als belegt-erschienen führen (Datum bleibt Rückrechnung, `estimated` entfällt nur für die Erscheinens-Aussage) und für verstrichene Katalogstarts ohne Gegenbeleg den Hinweis „Termin vorausgesagt“ statt Dauer-„≈“.

### N2 Beleg da, „≈“ trotzdem (50)
1. `ranma-s3-netflix` Folge 2–4 (10./17./24.10.): `belegtBis` Folge 4 am 24.10. vorhanden, Folge 1 liegt aber im **anderen Release** `ranma-s3-folge1-netflix`, darum `nachBeobachtung` = false → alle „≈“. Richtig: belegt.
2. `auto-189123-netflix` (Blue Box S2) Folge 1, 2, 5, 6 (04.10.–08.11.): Folge 3, 4 beobachtet, Rest „≈“, Serie fast durch.
3. `tokyo-revengers-s3-disneyplus` Folge 3–8: Folge 1 beobachtet.
4. `das-band-der-unterwelt-netflix` Folge 16–21 (17.10.–21.11.): Folge 12 und 15 beobachtet, `belegtBis` 15; Folge 16–21 danach „≈“, alle vergangen.
5. `thunder-3` siehe N1.
Ursache: `shared/logic.ts:314-316`, `nachBeobachtung` verlangt eine niedrigere Beobachtung im **selben** Release (Ranma-Folge 1 steht im Schwester-Release). Fix: `belegtBis` auch ohne `nachBeobachtung` gelten lassen, wenn das Release `firstEpisodeNumber > 1` hat.

### N3 TV-Sendetage (21, heute 6)
`one-piece-whole-cake-island-prosieben-maxx`: nur Folge 780 (05.11.) belegt; Folge 781–793 (06.–26.11.) und alle weiteren „≈“, obwohl Quellen `tvspielfilm.de` (13.11.) und `tv.de` (17.11.) am Release stehen und dort `skipDates` gesetzt haben. Heute 26.11. 18:50 „Folge 793/877“ trägt „≈“, ebenso 27.11., 30.11. bis 03.12. (6 Termine).
Ursache: `shared/logic.ts:318-322` (`nurStartBelegt && episode > first` → true); `observed` wird für Hand-Releases ohne `automatisch` nicht aus dem EPG gefüllt (Handeintrag `data/curated/tv-2026.yaml:79`). Fix: einen EPG-Lauf für Hand-TV-Releases `observed` setzen lassen (wie bei `auto-…-tv-…`).

### N4 „Staffelstart“ trotz früherer Folgen (2 neu)
1. `ranma-s3-netflix` Folge 2, 10.10.: Karte „Staffelstart“; Folge 1 lief am 05.10. (`ranma-s3-folge1-netflix`).
2. `das-band-der-unterwelt-netflix` Folge 12, 19.09.: „Staffelstart“; Folge 1–11 am 12.09. (`…-folge-1-11`), Crunchyroll hat seit 04.04. Folgen davor.
Ursache: `shared/tv-signale.ts:162-165` (`istStaffelstart`: `episode === firstEpisodeNumber`), Zuweisung `pipeline/bau/10-termine.ts:60`. Fix: nicht Staffelstart, wenn dasselbe Titel/Plattform-Paar im selben Bau einen früheren Termin hat.

### N5 Finale ohne belegte Zahl (1)
`das-band-der-unterwelt-netflix` Folge 24/24, 12.12.: `hinweis` „Gesamtzahl 24 nach AniList, von Netflix nicht genannt“ (`data/curated/streaming-herbst-2026.yaml:363`), `episodeCountAssumed` fehlt am Release (Zeile 348 ff.), deshalb `istStaffelfinale` = true (`shared/tv-signale.ts:210`). Fix: `episodeCountAssumed: true` setzen (Datenkorrektur in `data/curated`).

### N6 Dorohedoro (1)
`adn-1375`: `episodeCount` 11, `lastEpisodeDate` 27.05.; Termine nur bis Folge 9 (keine Folge 10, 11, kein Finale). Ursache vermutet `pipeline/bau/07-adn.ts:260-267` (`adnRelease` setzt Zahl und letztes Datum, aber kein `observed` für zwei Folgen am Schlusstag); Lesekette bis `termineAusPlan` nicht verfolgt = Vermutung. Fix: bei `anzahl` > Wochenplätzen die Schlussfolgen als `observed` aus den ADN-Terminen eintragen.

### N7 Tokyo Revengers (1)
Hinweis (Disney+ weltweit freitags 19:00, ab 30.10. 18:00; Anime2You samstags 19:00) und Termin Freitag 18:00 „≈“ stimmen nicht überein. Frage ist offen (Quellenstreit), die Kachel entscheidet leise für Freitag.

### N8 Crunchyroll durchgehende Zählung (24 / 2)
`cr-GW4HM7WK9` Wistoria S2 Folge 13–24 (03.05.–19.07.), `cr-GNVHKN933` 100 Girlfriends S3 Folge 25–36 (26.07.–11.10.), Titelzahl je 12. Nachbar A; gleiche Wurzel (Crunchyroll zählt über Staffeln).

### N9 „Auf Deutsch, ≈ N Folgen“ (1.456 Titel)
Beispiel: `naruto-20` (220), `monster-19` (74), `trigun-6` (26): Stream mit `dub: true` ohne `dubRanges`, Werkzahl AniList, Panelkopf „≈“. Entscheidung für Daniel: Bei Handbeleg `very-high` und AniList `FINISHED` das „≈“ weglassen, oder bewusst lassen (Annahme „alles liegt dort“, `antwort-regeln.ts:208-212`).

## Zahlen heute…03.12.
`events.json`: 207 „≈“-Termine, davon 170 Black Clover (A), 6+6 Yaiba (G), 6 One Piece (N3), 1 Tokyo Revengers (N7), 1 je Crunchyroll/Prime/Netflix-Wochenserie (fortgeschrieben, in Ordnung). Ohne Uhrzeit: Netflix 6, Prime 3, Crunchyroll 1 (Netflix-Lizenztitel ohne feste Zeit: Regelfall).

## Rückblick
- **gut:** Die Prüfketten fangen Folgenzahl > Termin, doppelte Termine, fehlende Quellen vollständig ab (0 Treffer). Die Anzeigelogik lässt sich mit `berechneAntwort`/`terminZustand` direkt auf `releases.json` rufen, ohne Build.
- **schlecht:** Der Auftragstext „≈ obwohl sicher“ trifft vor allem **verstrichene** Termine (N1/N2, 131 Fälle); im aktuellen Kalenderfenster ist es nur Black Clover, Yaiba, One Piece und je ein Einzelfall. Kein Wächter prüft „Termin vergangen, Release hat spätere Beobachtung, trotzdem ≈“.
- **unerwartet:** `terminGeschaetzt` vergibt „≈“ ausschließlich nach Datenlage, nie nach Zeit: ein Tag, der verstrich, ändert nichts (`logic.ts:314-322`). Schwester-Releases (Folge 1 getrennt von „ab Folge 2“) verlieren `belegtBis`.
- **Vorschlag:** Ein Wächter in `pipeline/lib/kalender-plausibilitaet.ts`: „estimated && date < heute && Folge < höchste beobachtete Folge“ und „staffelstart && früherer Termin am Titel/Plattform“ (Zahlen oben als Baseline: 131 bzw. 2).
- **veraltet:** `docs/wissen/maengel.md` (Zählregel „Termine geschätzt … Vergangenheit = Datum < heute“, 16.11.2026) nennt weder die 81 vergangenen „≈“-Termine noch ihre Ursache.

Offen/nicht gemessen: Wirkung der Fixes auf den Bau (kein Lauf), Kalenderkarte selbst (Marken.tsx zeigt „≈“ nur an der Uhrzeit, `timeEstimated`: 2 Termine; das Datum-≈ steht im Panel), Lehre 214: kein Webabruf nötig, alle Fälle sind Datenstand-Befunde, keine fehlenden Fakten.
Schätzung vs. Ist: Schätzung 40 min, Ist rund 7 min (zwei `date +%s`-Stempel: 1795722154 und 1795722561, Differenz 407 s; Zeitraum bis zur Abgabe).
