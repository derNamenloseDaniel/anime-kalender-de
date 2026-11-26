# Bericht Bauer: Berserk Part 2 (aniverse Dezember 2026)

- Ursache: `sammelVerwurf` (`pipeline/lib/sammelartikel.ts`, `UNKLARER_TEIL`) verwarf „Part N“ als „Staffel unklar“, nur Zähler im Scrape-Log, keine Liste.
- Klasse: 88 Sammelzeilen mit Zusatz, 5 deutsche mit Tag verworfen: Berserk Part 1 + 2, Shaman King Part 3 (alle „Part N“), Conan „Episode 1 bis 150“, My Happy Marriage „Special-Episoden“ (bleiben).
- Fix: einzelnes „Part N“/„Teil N“ geht an `releasesAus` (Name entscheidet); ohne Titel steht es in `nicht-zugeordnet.json`. Test `check-sammel-part.ts`, Mutationsprobe mit drei Mutanten, alle gefallen.
- Daten: `streaming-nachtrag-2026.yaml` Berserk Part 2 (24.12.2026, Folge 14, 12 Folgen, Prime/aniverse, 2 Quellen) und Part 1 (01.10.2026, 13 Folgen, Anime2You 1056322). Dafür `kanal` im Handeintrag (`curated.ts`).
- Geprüft: Tests der Nachbarn, `tsc`, eslint, `check:umfang`, Mutationsanker, `data:validate` grün. Bestandsbau lokal nicht möglich (kein `data/cache`): live nach Merge messen.
- Rückblick gut: Quelle für Part 1 lag im eigenen Bestand (aniverse-Oktober-Sammelzeile), keine Websuche nötig.
- schlecht: Bestandsbau konnte ich nicht fahren; ob `kanal` am Release und die Folgenaufteilung von Titel 33 (K57) stimmen, zeigt erst der Bau nach Merge.
- unerwartet: Die Aussagen-Zuordnung (`aussagen-zuordnung.ts` `fragen()`) macht aus „Part 2“ Staffel 2 und hängte Berserk Part 2 an das CGI-Berserk 2017 (97643, 3548 Tage Abstand); die Liste `nicht-zugeordnet` kürzt außerdem „– Part 2“ vom Titel ab (`sammel-unzugeordnet.ts` `eintrag`).
- Vorschlag: Wächter, der Sammelzeilen mit deutschem Ton, Tag und Verwurf „Staffel unklar“ zählt (Ratsche nur sinkend); Aussagen-Zuordnung bei „Part N“ nicht als Staffel lesen; Shaman King Part 3 klären.
- veraltet: Kommentar an `UNKLARER_TEIL` („Part 1 – Berserk 1997 oder 2016?“) ist angepasst; sonst nichts gefunden. Nebenbefund: `laeufe-aufraeumen --trocken` zeigt ALARM „Quelle crunchyroll-woche seit 2.6 Tagen ohne Erfolg“ und meldet `stand.md` fehlt (Cloud) – nicht Teil dieses Auftrags.
