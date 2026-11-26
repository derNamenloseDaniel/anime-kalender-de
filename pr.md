<!-- titel: fix(wege): älteres Nein weicht jedem jüngeren sicheren Termin; Wächter für kein-weg trotz Termin -->
fix(wege): älteres Nein weicht jedem jüngeren sicheren Termin; Wächter für kein-weg trotz Termin

Auftrag: kein-weg-trotz-nachtrag

## Ursache

Kuroko Movie 2 (AniList 102836) stand vom 16. bis 23.11.2026 als `kein-weg`, `erstausgabe-ohne-weg` und `erschienen-ohne-weg` offen, obwohl der Nachtrag-Datei (streaming-nachtrag-2026) einen Prime-Termin vom 13.09.2026 mit Quelle (Anime2You 1049795) führt. Die Bauphase `pipeline/bau/11-7-wege-aus-terminen.ts` verwarf den Weg, weil der Handbeleg „Suche ohne Treffer“ (`available: false`, 30.08.2026) galt: `ueberholteNeins` hielt ein älteres Nein nur bei Terminen mit `kanal` für überholt (Entscheidung 17.11.2026, „kein Weg ohne Adresse und Ton“). Der Handbeleg vom 22.11.2026 (`dub: true`) hat den Einzelfall gelöst; auf `main` (Mängelregister, Stand 26.11.) ist die Zeile seit 23.11. `behoben`. Der Befund des Cloud-Laufs `maengel-weg-b` stützte sich auf einen älteren Stand.

## Klasse (gerechnet mit den echten Funktionen)

| Stand | offene `kein-weg`/`erstausgabe-ohne-weg`-Titel mit sicherem, begonnenem Termin ohne gültiges Nein | `ueberholteNeins` vorher → nachher |
|---|---|---|
| 20.11.2026 (`9a44baedf`) | 1 (Kuroko 102836, via Nachtrag-Datei) | 14713, 175914 → 102836, 14713, 175914 |
| 26.11.2026 (`main`) | 0 | 14713, 175914 → 14713, 175914 (unverändert) |

Gezählt mit `keinWegTrotzQuelle` (neu) über Mängelregister, gebaute Termine, alle 17 kuratierten Yaml-Dateien und die Handbelege; `ueberholteNeins` mit `loadDubChecks` wie im Bau. Auf `main` gibt es 364 offene Zeilen der beiden Arten (196 Titel); keiner hat einen kuratierten oder gebauten Streaming-Weg, keiner einen jüngsten Ja-Handbeleg. Die vier sicheren Termine ohne Weg im Bestand (185736 Netflix, 156040, 103631, 180829 Prime) verneint je ein „ohne deutschen Ton“, das bleibt.

## Änderung

1. Verhaltens-Commit `pipeline/bau/11-7-wege-aus-terminen.ts`: `ueberholteNeins` zählt jeden sicheren, begonnenen Streaming-Termin, nicht nur Kanal-Termine. Ausgenommen sind Schlüssel mit einem Ja-Beleg jünger als jedes Nein (`jaNachNein`; sonst übersähe `check-handbelege` den Ja-Beleg: am 26.11. wären Spy × Family 140960, Kuroko 102836 und Overgeared 212888 dort nicht mehr bewertet worden). Ein zweiter Termin ohne Adresse verdrängt den Kanal eines ersten nicht mehr. `pipeline/check-handbelege.ts`: Zählzeile heißt „Nein überholt (jüngerer Termin)“.
2. Wächter-Commit: `pipeline/lib/kein-weg-trotz-quelle.ts` (`keinWegTrotzQuelle`), Bestandsprüfung `pipeline/check-kein-weg-trotz-quelle-bestand.ts` (in `tools/check-bestand-liste.txt`: rot bei Termin, Warnung bei jüngstem Ja-Beleg ohne Weg, denn eine tote Adresse nimmt den Weg zu Recht), Logiktest `pipeline/check-kein-weg-trotz-quelle.ts` (in `tools/check-logic-liste.txt`), Doku `docs/wissen/maengel.md`, Patch Notes `data/patchnotes/neu-gemeldeter-start-zeigt-anbieter.yaml`.

Kino, Fernsehen und Disc zählen weiterhin nicht als Weg (`istSichererTermin`).

## Belege

- Rot gegen `main` (Bauphase aus `origin/main`, neue Tests): `FEHLER: Kuroko: Nachtrag-Termin ohne Kanal überholt das ältere Nein, Weg ohne Adresse und ohne Tonurteil — []`, `npx tsx pipeline/check-wege-aus-terminen.ts` Exit 1; `pipeline/check-handbelege-nein-ueberholt-lauf.ts`: `✖ Termin ohne Kanal überholt das Nein ebenso: kein Fund`, Exit 1. Danach beide grün.
- Wächter-Rückprobe am Stand 20.11.2026 (`git archive 9a44baedf`, `AK_ROOT`): `✖ 102836 ohne Weg offen, aber primevideo laut streaming-nachtrag-2026.yaml kuroko-winter-cup-movie-2-primevideo`, Exit 1. Am Stand `main`: `ok (196 Titel ohne Weg offen, 926 Releases, 17 kuratierte Dateien, 0 Warnung(en))`.
- `npx tsx pipeline/check-handbelege.ts` am Bestand: `Nein überholt (jüngerer Termin) : 2`, `VERSTÖSSE: 0` (wie vorher).
- Grün: `check-wege-aus-terminen`, `check-handbelege-nein-ueberholt-lauf`, `check-nein-handbeleg-abschluss`, `check-kein-weg-trotz-quelle`, `check-kein-weg-trotz-quelle-bestand`, `check-patchnotes`, `npx tsc --noEmit -p .`.

## Mutationen (Diff-Mutanten-Läufer)

| Datei | Test | Mutanten | überlebt | Überlebende |
|---|---|---|---|---|
| `pipeline/lib/kein-weg-trotz-quelle.ts` | `pipeline/check-kein-weg-trotz-quelle.ts` | 62 | 1 | Zeile 46 `dubKey` Argumente getauscht: gleichwertig (Schlüssel nur intern) |
| `pipeline/bau/11-7-wege-aus-terminen.ts` | `check-wege-aus-terminen`, `check-handbelege-nein-ueberholt-lauf` (`--test`) | 55 | 1 | Zeile 75 `>` → `>=` im Maximum von `neinAm`: gleichwertig |

Erste Runde überlebten 4 + 4; geschlossen mit Tests (Termin genau heute, taggleicher Ja-Beleg, Reihenfolge der Belege, Felder der Funde, zwei Kanal-Termine) bzw. durch Entfernen der bedeutungslosen Sortierung.

## Annahmen

- Die Entscheidung vom 17.11.2026 („ohne Kanal gilt das Nein weiter“) wird umgekehrt: Eine jüngere Quelle widerlegt ein älteres „Suche ohne Treffer“ (CLAUDE.md: gestrichen wird nur, was eine Quelle widerlegt). Der Weg ohne Adresse und Ton steht dann als `weg-ohne-adresse` bzw. `sprachurteil-offen` statt als `kein-weg` offen; der Besucher sieht den belegten Anbieter.
- Ein Ja-Beleg am selben Tag wie das Nein gilt nicht als jünger.
- Kein Bau-Lauf in der Cloud (kein `data/cache`); die Wirkung am heutigen Bestand ist 0 Änderungen (Tabelle oben), deshalb ohne `bau-vergleich`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zpExc6RD11UDLx28tq
