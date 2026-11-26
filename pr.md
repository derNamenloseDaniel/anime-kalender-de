<!-- titel: fix: Berserk (1997) Part 1 und 2 bei aniverse – Sammler lässt „Part N“ nicht mehr still fallen -->

## Anlass
Daniel (26.11.2026): aniSearch-News 60167 / Anime2You 1074092 („aniverse Dezember 2026“) nennt sechs Neuzugänge, im Datensatz standen fünf. Es fehlte „24. Dezember: »Berserk« – Part 2“ (12 Folgen, Deutsch, Prime Video).

## Fünf Stufen
**(a) Ursache:** `sammelVerwurf` (`pipeline/lib/sammelartikel.ts`, `UNKLARER_TEIL`) verwarf jeden Zusatz mit „part“/„teil“ als „Staffel unklar“. Die Zeile wurde nie Vorschlag; es blieb ein Zähler im Scrape-Log, nichts in `data/proposals/nicht-zugeordnet.json`. Der Artikel galt als `alreadyCurated`, die fünf übrigen Zeilen gingen durch – nichts sah nach Lücke aus.

**(b) Klasse:** Alle 88 Sammelzeilen mit Zusatz in `data/proposals/anime2you.json` geprüft: 5 deutsche Zeilen mit Tag fielen am Zusatz. 3 davon „Part N“ (Berserk Part 1 01.10.2026, Berserk Part 2 24.12.2026, Shaman King Part 3 06.08.2026), 2 echte Unklarheiten (Detektiv Conan „Episode 1 bis 150“, My Happy Marriage „Special-Episoden“), die bleiben.

**(c) Fix:**
1. Sammler: genau „Part N“/„Teil N“ geht an `releasesAus`, das den Teil am Namen entscheidet (`teil-hinweis.ts`, nie geraten). Findet es keinen Titel „Part N“ in der Reihe, steht die Zeile in `nicht-zugeordnet.json` (`verluste.ohneTeil`). „Part 1 und 2“, Specials usw. bleiben „Staffel unklar“.
2. `data/curated/_SCHEMA.md` / `curated.ts`: `kanal` im Handeintrag (nur Prime) – wie bei `eigene-titel.yaml`.
3. Daten (`data/curated/streaming-nachtrag-2026.yaml`): Titel 33 Part 2, 24.12.2026, `firstEpisodeNumber` 14, 12 Folgen, Prime/aniverse, `sources` Anime2You 1074092 + aniSearch-News 60167, keine Uhrzeit. **Part 1:** 01.10.2026, Folgen 1–13, aus der Sammelzeile des aniverse-Oktober-Artikels (Anime2You 1056322); keine Websuche nötig, die Quelle lag im eigenen Bestand.

**(d) Test:** `pipeline/check-sammel-part.ts` (in `check-logic-liste.txt`), wörtliche Zeile aus 1074092. Mutationsprobe: Bedingung entfernt → 6 Fehler; Anker `$` entfernt → „Part 1 und 2“/„Part 2 Special“ fallen auf; `platform`-Bedingung bei `kanal` entfernt → 1 Fehler.

**(e) Warum die Prüfungen es nicht meldeten:** Kein Wächter vergleicht Sammelzeilen mit dem Datensatz; `pruefung.ts` prüft, was erzeugt wurde, nicht was fehlt. `check:logic` bestätigte das Verwerfen sogar (der Kommentar nannte „Part 1“ ausdrücklich als unklar). Der Zähler „Staffel unklar“ stand nur im Scrape-Log. Der Artikel war `alreadyCurated`, die Fünf-von-sechs-Lage fiel keinem auf.

## Prüfung
Lokal grün: `check-sammel-part`, `check-sammel-erste-folgen`, `-titel`, `-unzugeordnet`, `check-sammelartikel`, `check-saison-termin`, `tsc --noEmit -p .`, eslint, `check:umfang`, `mutationsanker-alle`, `data:validate` (312 Einträge). **Nicht lokal gelaufen:** der Bestandsbau (kein `data/cache` in der Cloud) – `public/data/*` entsteht erst durch den Bestandsbau nach dem Merge; danach messen, dass `berserk-1997-part2-primevideo` mit Kanal Aniverse live steht und Titel 33 die Folgenaufteilung (`data/anbieter-staffeln.json`, K57) nicht verschiebt.

## Offen / nicht Teil dieses PR
- Shaman King Part 3 (06.08.2026, 16 Folgen, aniverse): Reihe 154/119675 trägt keinen Titel „Part 3“ → steht nach dem nächsten Bau auf der Liste, Zuordnung zu 2001 oder 2021 ungeklärt.
- Die Aussagen-Zuordnung (`aussagen-zuordnung.ts`, `fragen()`) liest „Part 2“ als Staffel 2 und ordnete Berserk Part 2 dem CGI-Berserk von 2017 zu (`anilistId 97643`, Abstand 3548 Tage). Nur Nachrichten-Aussage, kein Termin – eigener Fix.
