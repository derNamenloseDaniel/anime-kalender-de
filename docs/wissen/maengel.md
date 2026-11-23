# Mängel-Inventur (16.11.2026)

Auftrag `maengel-inventur-1611`. Nur gelesen und gemessen, kein Code, keine Daten geändert. Anlass: Titel 10019697 stand ohne Cover live, bemerkt hat es der Betreiber. Alle Zahlen: Stand `main` 16.11.2026 (Bestandsbau 11:22 UTC), Messung lokal an den committeten Dateien; Live-Netz war aus der Sitzung nicht erreichbar.

## Kurzbefund

1. **Gemessen wird viel, gemeldet wird wenig.** Nur `mitStreamingWeg` (Rückgang > 1 %) und drei HART-Zahlen lösen `DATEN_WARNUNG` oder Abbruch aus. Alle übrigen Kennzahlen aus `check-qualitaet.ts` (ohne Verweis 1.208, ohne Sprachurteil 166, ohne deutschen Namen 77, Serien ohne Folgenzahl 16) haben keinen Leser außer der Verlaufsdatei.
2. **Der Cover-Fall war „gemessen und abgenickt".** Beide heute coverlosen Titel (10019697 „nicht-gefunden", 10020137 „ohne-adresse") stehen auf `data/cover-luecken.json`. Diese Liste schreibt der Bau selbst aus dem Befund; `check-cover-luecken-bestand.ts` warnt nur bei *neuen* Titeln ohne Cover (Exit 0) und wird rot nur bei veralteten Einträgen. Wer auf der Liste steht, ist für jede Wache erledigt.
3. **Je-Titel-Listen ohne Leser:** `data/luecken-titel.json` (166 Titel mit Lücke) liest nur die Gegenprobe der Handlisten; die Listen je Panel-Feld (`data:lueckenlisten`) laufen in keinem Workflow und liegen außerhalb des Repos.
4. **Ratschen decken nur Wege und Discs ab**, nicht Cover, Handlung, FSK, Folgentitel, Sprecher, Banner.
5. **Größte unbeobachtete Lücken** (Abschnitt 2/3): FSK (1.232), Streaming-Weg (990), Sprecher (412), Banner (310), Folgentitel unvollständig (217).

## 1. Was wird schon gemessen?

Spalte „Leser": **Abbruch** = Bau stoppt oder Titel in Quarantäne; **Warnung** = `DATEN_WARNUNG`/`::warning::`; **niemand** = nur Log oder Datei.

### A. Zahlenwerke

| Stelle | zählt | Wert heute | je Titel | Leser |
|---|---|---|---|---|
| `pipeline/check-qualitaet.ts` → `data/qualitaet-verlauf.json` (80 Tage ab 28.08.) | Titel, mit Verweis/Streaming-Weg, ohne Verweis, mit Synchro, ohne Sprachurteil, ohne deutschen Namen, Serien ohne Folgenzahl, künftige Termine; HART: dubFalse, doppelte Adressen, verwaiste Termine | 2.923 Titel; Streaming-Weg 1.932; ohne Verweis 1.208; ohne Sprachurteil 166; ohne dt. Namen 77; Serien ohne Folgenzahl 16; künftige Termine 429; HART 0/0/0 | nein | HART > 0: Abbruch; Streaming-Weg-Rückgang > 1 %: Warnung (`bestand-bauen.yml:315`); Rest: niemand |
| `pipeline/lib/pruefung.ts` (`pruefeErgebnis`) | Termin ohne Quelle, Ende vor Start, Folgenzahl über Werk, Herkunftsland, TMDB-Weg ungekennzeichnet; Warnungen: Folgen gegen AniList, Termin > 1,5 Jahre voraus | keine Zahl gespeichert | nur Log | Fehler: Abbruch; Warnungen: niemand (erreichen `DATEN_WARNUNG` nicht) |
| `bestand-pruefung.txt` | liegt nicht im Repo: `tools/commit-data.sh` schreibt dort `check:bestand` + `check:logic` hin (`:206–228`) | — | nur in Warnzeilen | Exit ≠ 0: Quarantäne (max. 3 Titel) oder rot; `⚠ WARNUNG` → `::warning::` |
| `npm run check:bestand` | 15 Skripte + 98 Prüfungen in `tools/check-bestand-liste.txt` (Details B) | s. B | teils | Abbruch/Warnung |
| `npm run data:validate` | nur kuratierte Eingaben (`data/curated/*.yaml`, Handlisten): Quelle, Plattform, Datum, FSK, Uhrzeit | — | nein | PR-Kette, nicht der Bestandsbau |

### B. `check:bestand` — 98 Prüfungen, zusammengefasst

Rund 60 brechen (Zusicherungen: Cartoon-Aufnahme, Crunchyroll-Batch/Auftakt/Katalog, Netflix-Umleitung, Handbeleg-Staffeln, TMDB-Ablauf > 180 Tage, `ja-hat-weg` …), rund 25 warnen nur (Streaming-Lücke, Disc-Verweise, Joyn, JustWatch ohne TMDB, Netflix-Kennungen, Cover). 51 von 107 Läufen liefen lokal, 56 nicht (`node_modules` fehlt). Aktive Warnungen heute:

- Streaming-Lücke: 990 Haupttitel ohne Streaming-Weg, 201 ohne jeden Weg (Stand-Datei 06.11.: 1.044/316); 194 Kennungen der Stand-Datei haben inzwischen einen Weg.
- Disc: Namenssuchen 39 gegen Grenze 33; Handlinks 13 gegen 12; Archiv-Disc ohne Verweis 20 (Grenze 20).
- Cover-Vorschau: 2 neue Kennungen (2842, 100353); Cover-Lücken 100 auf Liste, 0 Verstöße.
- JustWatch ohne TMDB-Kennung: 714 Titel, 167 nie gefragt, 91 Befund > 28 Tage alt.
- Joyn: 4 offen; TV-Termin ohne Joyn-Weg 4; 3 MAXX-Serien ohne Fenster.
- Netflix-Kennungen widersprüchlich (20594, 101597 …); Folgentitel TMDB-Staffel 191788 (7 von 24).

### C. Ratschen (nur sinkende Zahlen)

| Datei | zählt | Wert/Grenze | je Titel | Wirkung |
|---|---|---|---|---|
| `data/streaming-luecke-stand.json` | Haupttitel ohne Streaming-Weg / ohne Weg | 06.11.: 1.044/316; heute 990/201 | ja | Warnung |
| `data/disc-archiv-stand.json`, `disc-handlinks-stand.json`, `disc-suchlinks-stand.json` | Disc ohne Verweis / Handlink ohne EAN / Namenssuche | 20 / 12 (13) / 33 (39) | ja | Warnung |
| `data/gleiche-adresse-stand.json` | Amazon-Seite mit Handbelegen zweier Titel | Grenze 0, erlaubt 6 | ja | Warnung |
| `check-cover-vorschau-bestand.ts` | Cover, aber Standardbild als Vorschau | Grenze 27 | ja | Warnung |
| `check-prime-seite-ohne-weg-bestand.ts` | Prime-Titelseite ohne Weg | Grenze 290 | ja | Abbruch |
| `tools/kalender-plausibilitaet-grenzen.json` | 6 Kalenderregeln (z. B. erschienen ohne Termin 0, Prime ohne Titelseite 4) | s. Datei | ja | Abbruch |
| `data/joyn-luecke-ausnahmen.json`, `check-handbelege.ts` `OFFEN_OHNE_ZUORDNUNG` | Joyn ohne Weg 2 Ausnahmen/4 offen; Netflix-Staffelliste 1 | — | ja | Warnung/Abbruch |
| `tools/design-klassen-grenzen.json`, `umfang-grenzen.json` | alte Farbklassen, Überlängen (Code, nicht Daten) | — | Datei:Zeile | Abbruch (`check:logic`, PR-Kette) |

### D. Ausgelassen, entfernt, widerlegt, verpasst

| Datei | Inhalt | Wert 16.11. | Leser |
|---|---|---|---|
| `data/termine-ausgelassen.json` | CR-Termine, die der Bau bewusst nicht erzeugt | 276 (228 Blöcke ≠ Titel, 44 Folgenzahl geht nicht auf, 4 deutscher Termin vor japanischem) | Bau, Wachen; keine Seite |
| `data/verweise-entfernt.json` | entfernte Streaming-Verweise mit Grund | 852 (Crunchyroll 694, ADN 50, Prime 58, Netflix 26, YouTube 21) | Bau-Gedächtnis, Delta-Wache |
| `data/termine-verpasst.json` | verspätet erschienene Termine | 16 | Bau, Recherche-Workflow |
| `data/widerlegte-termine.json` | von Hand widerlegt | 1 | Bau |
| `data/beleg-fehlschlaege.json` | gescheiterte Belegabrufe | 16 Adressen | `belege-lesen.ts`, sonst niemand |
| `data/crunchyroll-offene.json` | offene/tote CR-Verweise | 67 | Bau, `check-cr-ja-deckung` |

### E. Prüflisten und Offen-Listen

| Stelle | Inhalt | Wert | je Titel | Leser |
|---|---|---|---|---|
| `public/data/pruefstand.json` | Erweiterungs-Prüfstand je Anbieter | Amazon 1.009 gesamt/31 offen/2 ohne Seite; Netflix 934/163 offen; Disney+ 340/157 offen | je Anbieter | Browser-Erweiterung, Workflow; nicht die Webseite |
| `public/data/pruefliste-stand.json` | nur Prüfsumme der Amazon-Liste | 1 Hash | nein | Erweiterung |
| `data/luecken-titel.json` | fehlende Felder (titleDe, Jahr, Cover, MAL, Beschreibung) | Hauptbestand 166 Titel (77/6/2/76/23); Katalog 14.018; aniSearch-Zeilen 2.346 | ja | **niemand** (nur Gegenprobe der Handlisten) |
| `npm run data:lueckenlisten` | je Panel-Feld eine Liste (Cover, Banner, Titel, Handlung, Studio, Jahr, Folgenzahl, Weg, Beleg; Sprecher, Trailer, FSK, Wertung) | schreibt nach `daniel-zum-abarbeiten/` (nicht im Repo), in keinem Workflow | ja | nur Daniel manuell |
| `data/cover-luecken.json` | Titel ohne Cover samt Grund | 100 (93 ohne Adresse, 6 NSFW, 1 nicht gefunden) | ja | Bau, Wache (nur Warnung bei neuen) |
| `data/folgentitel-offen.json` | Folgentitel ohne erlaubte Quelle | 67 Titel | ja | Wächter `folgentitel-luecke` |
| `data/pillen-luecken.json`, `suchadressen-offen.json` | Haken ohne Folgenzahl / Prime nur Suchadresse | 2 / 0 | ja | Erweiterungs-Prüfliste |
| `data/adn-anisearch-offen.json`, `adn-offen-seit.json` | ADN-Serien ohne aniSearch-Zuordnung | 21 | ja | Wache (warnt nur bei `titelliste-fehlt`: 0) |
| `data/anisearch-offen.json` | aniSearch ohne eindeutige Zuordnung | 3.075 (1.122 ohne MAL) | ja | Zuordnungslauf; keine Seite |
| `data/dub-pruefliste-zurueckgestellt.md` | zurückgestellte Prüfzeilen | 18 | ja | niemand (Archiv) |
| `public/data/ohne-synchro.json` (+`-namen`) | Titel ohne belegte Synchro (Katalog, Schalter) | 17.769 | ja | Webseite |
| `data/*-pruefliste.json` | Reihen 163, Dubletten 4, Cartoon-Staffeln 348, CR-Teilseiten 116, Prime-Teilseiten 16 | — | ja | je `check-*-bestand` |

### F. Lücken der Messung (belegt)

1. `ohneDeutschenNamen`, `serienOhneFolgenzahl`, `ohneSprachurteil`, `ohneVerweis` haben keinen Leser außer `check-qualitaet.ts` und dem Verlauf. `ohneVerweis` zählt nur `streams` (1.208) statt Streaming-Weg (990).
2. `luecken-titel.json` und die Panel-Feld-Listen haben keinen Leser (Handlung fehlt bei 23 Titeln ohne jede Ratsche).
3. Bau-`warn()`-Zeilen aus `pruefung.ts`/`10-termine.ts` erreichen weder `DATEN_WARNUNG` noch einen Workflow.
4. „Sprache offen" je Weg wird nirgends als Mangelzahl fortgeschrieben (`ohneUrteil` 322 nur in `bestand-historie.jsonl`).
5. Nicht verifiziert: 56 von 107 Bestandsskripten nicht gelaufen (Heuristik aus Quelltext), `check:logic` (737 Zeilen) nicht ausgewertet.

## 2./3. Was fehlt? Mängel je Art (gemessen 16.11.2026)

Nenner, wenn nicht anders genannt: 2.923 Titel in `public/data/titles.json` (Hauptbestand). Weitere Töpfe: 916 Cartoons, 17.769 Titel ohne Synchro (`ohne-synchro.json`), 876 Releases, 4.515 Events (429 davon ab heute). „Sichtbar" = die Oberfläche zeigt das Feld oder dessen Fehlen. Beispiele sind `titles.json`-Kennungen (bei Events/Releases: `titleId`).

### Fehlend

| Art | Zahl | Anteil | sichtbar | Beispiele | schon gemessen | Behebung | Aufwand |
|---|---|---|---|---|---|---|---|
| Cover | 2 | 0,07 % | ja (Kachel/Panel leer) | 10019697, 10020137 | ja: `luecken-titel.json`, `cover-luecken.json` — beide stehen auf der Liste, Wache warnt nur bei neuen; kein Leser | TMDB/aniSearch automatisch, sonst `cover-eigen` von Hand | klein |
| Banner | 310 | 10,6 % | ja (leerer Farbverlauf im Panel-Kopf) | 65, 448, 507 | nein | TMDB-Banner automatisch (`tmdb-banner.json`), Rest keine Quelle | mittel |
| deutscher Titel | 77 (16 davon mit Synchro-Weg) | 2,6 % | ja (Romaji-Ersatz) | 65, 495, 733 | ja: `check-qualitaet` `ohneDeutschenNamen`, `luecken-titel.json` | `data/titel-de.yaml` von Hand; teils aniSearch | klein–mittel |
| deutscher Titel = Romaji (titleEn fehlt, vermutlich unübersetzt) | 56 | 1,9 % | ja | 317, 322, 342 | nein | Verdacht, Handprüfung | klein |
| Handlung deutsch | 72 (23 ohne jede Handlung) | 2,5 % / 0,8 % | ja (Panel) | 3760, 4614, 8438 | ja für „weder de noch en" (23, `luecken-titel.json` „beschreibung"); de allein nein | `handlung-eigen.yaml`, aniSearch/TMDB | mittel |
| Folgentitel: keine Datei (Serie ≥ 2 Folgen) | 39 von 1.768 | 2,2 % | ja (Folgenliste) | 3723, 100049, 151384 | teils: `folgentitel-offen.json` | aniSearch/TMDB/Wikipedia automatisch, `folgentitel-hand.yaml` | mittel |
| Folgentitel: Datei, aber nicht alle Folgen benannt | 217 (120 davon ohne einen einzigen Titel, 76 mit Synchro) | 12,3 % der Serien | ja | 51, 105, 115 | teils (`folgentitel-offen.json`, Umfang nicht geprüft) | wie oben; Titel von Synchro-Serien: 20.506 von 21.374 Folgen haben einen (96 %) | mittel |
| Folgenzahl (TV/ONA/OVA) | 18 (alle Formate 20) | 0,6 % | ja | 21, 235, 966 | ja: `serienOhneFolgenzahl` (16, nur TV) | AniList/aniSearch; Langläufer (One Piece 21) absichtlich offen | klein |
| FSK | 1.232 (498 mit Synchro-Weg) | 42 % | ja (Filter/Panel) | 7, 44, 46 | nein | JustWatch/aniSearch automatisch, sonst FSK-Datenbank von Hand | groß |
| Wertung | 108 | 3,7 % | ja (Sortierung) | 3823, 3828, 8494 | nein | AniList/TMDB automatisch | klein |
| Studio | 105 | 3,6 % | ja (Panel, Filter) | 2033, 2578, 2884 | nein | AniList/aniSearch | klein |
| Genre | 173 | 5,9 % | ja (Filter) | 10282, 16570, 99643 | nein | AniList/TMDB | klein |
| Schlagworte | 194 | 6,6 % | ja (Suche) | 734, 1448, 1572 | nein | automatisch (aniSearch) | klein |
| Laufzeit je Folge | 307 | 10,5 % | ja (Panel) | 384, 395, 1023 | nein | aniSearch/TMDB | klein |
| Jahr | 6 | 0,2 % | ja (Sortierung) | 185515, 204584, 204585 | ja: `luecken-titel.json` „jahr" | AniList/aniSearch | klein |
| Originaltitel | 18 | 0,6 % | ja (Suche) | 105245, 5000001, 5000002 | nein | AniList | klein |
| Sprecher (Datei ohne Rollen) | 412 (149 mit Synchro-Weg) | 14,1 % | ja (Panel, Sprecher-Suche) | 115, 392, 571 | nein | aniSearch automatisch; Rest Handarbeit | mittel |
| Weg: weder Stream noch Kauf-/Link | 209 | 7,2 % | ja | 65, 495, 733 | teils: `ohneVerweis` zählt nur Streams (1.208) | automatisch aus Katalogen; Rest nur Betreiber | mittel |
| Weg: kein Streaming-Weg (nur Kauf oder gar nichts) | 990 (808 mit Stufe ≥ high) | 33,9 % | ja | 7, 24, 26 | ja: `mitStreamingWeg` (1.932), `streaming-luecke-stand.json` | meist Disc-/Ältere Titel ohne Stream — echte Lücke nur, wo ein Anbieter es führt | groß |
| Trailer | 1.801 | 61,6 % | ja (Panel) | 7, 15, 24 | nein | optional, YouTube-Suche | groß, geringer Nutzen |
| Termin trotz laufender Serie (TV/ONA, Synchro, kein künftiges Event) | 3 | 0,1 % | ja (Serie ohne Kalendereintrag) | 165159 Beyblade X, 209872 Ranma 1/2 S3, 213805 Ramparts of Ice S2 | nein | Anbieterkalender automatisch | klein |
| Uhrzeit künftiger Streaming-Folgen | 9 Titel (52 Events von 429) | 12 % der künftigen Events | ja | 20701, 156040, 175914 | nein (`time` wird nur auf Erfindung geprüft, nicht auf Fehlen) | Anbieterkalender; sonst offen lassen | klein |

### Schwach

| Art | Zahl | Anteil | sichtbar | Beispiele | schon gemessen | Behebung | Aufwand |
|---|---|---|---|---|---|---|---|
| Sprachurteil offen (Weg, nie `dub` gesetzt) | 167 (35 mit JustWatch-Hinweis) | 5,7 % | ja („🇩🇪 ?") | 5, 54, 147 | ja: `ohneSprachurteil` (166), `pruefliste-stand.json` | Handbelege (`dub-confirmed.yaml`), JustWatch | mittel |
| `dubConfidence` low | 79 | 2,7 % | ja (Hinweis) | 495, 733, 760 | nein | Belegrecherche | mittel |
| `dubConfidence` normal | 248 | 8,5 % | teils | 457, 548, 551 | nein | Belegrecherche | mittel |
| Synchro nur eine Quelle (`einzelquelle`) | 304 | 10,4 % | teils | 571, 673, 1003 | nein | zweite Quelle | mittel |
| Ja nur angenommen (`dubAbgeleitet`: Joyn pauschal, Kanal erbt) | 135 | 4,6 % | ja (≈) | 15, 21, 161 | nein | Einzelbeleg je Titel | mittel |
| FSK nur Anbieter-Einstufung | 355 | 12,1 % | ja (Kennzeichnung) | 47, 50, 63 | nein | offizielle FSK | groß |
| Termine geschätzt (künftig) | 34 Titel (292 Events von 429) | 68 % der künftigen Events | ja (≈) | 21, 532, 996 | teils: `estimated` gekennzeichnet, nicht gezählt | wird mit Sichtung fest | laufend |
| Folgenzahl angenommen | 29 Titel (729 Events); 33 Releases | — | ja (≈) | 15, 21, 223 | nein | Quelle für Gesamtzahl | klein |
| Uhrzeit geschätzt | 2 Events | — | ja | 190327, 195539 | ja (`data:validate`, `FESTGELEGTE_ZEITEN`) | — | klein |
| Termin in Vergangenheit noch geschätzt | 19 Titel (57 Events) | — | ja | 21, 269, 10015 | teils (`termine-verpasst.json`, 7 Releases) | Sichtung | klein |
| Release nur eine Quelle | 721 (580 ohne Disc) | 82 % | ja (Beleg) | -318918, -204084, -197065 | nein | zweite Quelle | groß |
| Release ohne `quellen`-Feld (nur `sources`, keine Belegdetails) | 248 (247 Crunchyroll-Wochen/-Pakete, 1 RTL+) | 28 % | ja (kein Belegbild) | 161, 177, 249 | nein | Belegerzeugung nachziehen | mittel |
| Beleg älter als 90 Tage | 0 (Release-Quellen: älteste jüngste Sichtung 01.10.2026); Handbelege: 68 von 4.819 | 1,4 % | nein | — | nein | Wiedervorlage | — |
| Streamadresse nie geprüft | 1.035 von 2.462 | 42 % | nein | Crunchyroll 678, ADN 146, YouTube 58 | ja: `link-check.json` (deckt diese Anbieter nicht ab) | Prüfer für Crunchyroll/ADN | mittel |
| Streamadresse nur 503/unklar (Amazon sperrt) | 99 | 4 % | nein | primevideo | ja (`link-check.json`) | nicht messbar von außen | — |

### Falsch-verdächtig

| Art | Zahl | Anteil | sichtbar | Beispiele | schon gemessen | Behebung | Aufwand |
|---|---|---|---|---|---|---|---|
| erschienen laut Termin, aber Titel ohne Weg bei dieser Plattform | 15 | 2 % der Releases | ja | 21 One Piece, 10015 Yu-Gi-Oh! Zexal, 14713 Kamisama Kiss | nein | Weg ergänzen oder Release prüfen | klein |
| Netflix-Adresse laut Linkprüfung 404 | 58 (39 mit `dub: true`, 12 Titel ohne anderen Weg) | 2 % | ja (toter Link möglich) | 15, 1366, 1735 | ja: `link-check.json`; Regel: ein 404 ist bei Netflix Rauschen (`quellen.md` „Ein einzelnes Netflix-404", 02./05.11.2026) | Zwei-Tage-Regel; kein Eingriff | — |
| Release-Folgenzahl > Titel-Folgenzahl | 13 | — | ja | 202, 384, 857 | nein | Folgenzahl klären | klein |
| Folgenliste länger als Folgenzahl | 18 | — | ja | 202, 508, 1816 | teils: `check:folgen` | klären | klein |
| Folgentitel dreimal gleich in einer Liste | 198 | 6,8 % | ja | 21, 51, 105 | nein (viele sind leere Titel `""`, siehe oben) | Datei bereinigen | mittel |
| `dubRanges` über Folgenzahl, ohne Teilbereich | 1 | — | ja | 150672 | teils | klären | klein |
| Stream-Adresse bei mehreren Titeln ohne `sharedWith` | 12 Titel | — | ja | 482, 1726, 11499 | nein | Zuordnung prüfen | klein |
| gleiches Cover bei Titeln verschiedener Franchises | 2 | — | ja | 12191, 16419 | nein | Cover klären (236 weitere Titel teilen Cover innerhalb einer Franchise: Staffeln, normal) | klein |
| `jpEnd` vor `jpYear` | 5 | — | ja | 1709, 3782, 5204 | nein | Jahre klären | klein |
| Releases/Events ohne Titel in `titles.json` | 24 / 38, alle Cartoons (negative Kennung, in `cartoons.json`) | — | nein | -318918, -314271, -284833 | ja (`verwaisteTermine`, 0, prüft gegen Cartoons) | kein Mangel | — |
| gleiche MAL-/aniSearch-Kennung bei mehreren Titeln | MAL 6; aniSearch 115 Titel in 41 Gruppen, alle derselben Franchise, alle Filme | — | nein | 106169, 106896; 202, 384, 395 | teils (`datensatz.md` „Gleiche MAL-Kennung", 4 echte Dubletten) | aniSearch-Gruppen sind Sammeleinträge, kein Mangel | — |

### Nicht gemessen / nicht messbar

- Lebt die Adresse jetzt? Kein Netz aus der Cloud-Sitzung (Proxy sperrt Anbieter und Bild-Hosts): nur Stand der `link-check.json` (letzter Lauf 16.11.2026).
- Cover-Dateien erreichbar / Bildinhalt richtig: nicht geprüft (nur Vorhandensein und Doppelungen).
- Inhaltliche Richtigkeit von Terminen, Folgenzahlen und Synchro-Urteilen: nur Widersprüche zwischen Feldern, nicht gegen die Wirklichkeit.
- Termine „in der Vergangenheit ohne Sichtung": ein Feld dafür gibt es nicht; `ohneSichtung` ist nur bei künftigen Terminen gesetzt (117, 0 in der Vergangenheit, also Mechanismus gesund).
- Beleg-Alter einzelner `dubStand`/`dubQuelle` an Streams, aniSearch-Lesedaten: nicht ausgewertet.
- Mängel in `woche.json`, `franchises.json`, `reihen.json`, `news.json`, `saison*.json`: nicht gemessen.
- Cartoons (916): 502 ohne deutschen Titel, 4 ohne Cover; ohne Synchro (17.769): 98 ohne Cover, 492 ohne Jahr, 275 TV ohne Folgenzahl (16.267 ohne deutschen Titel erwartbar).

## 4. Zählregeln (Messskript nicht im Repo)

Alles aus `public/data/*.json` mit Datum 16.11.2026; `T` = `titles.json`, `R` = `releases.json`, `E` = `events.json`, `F` = `folgen/<id>.json`, `S` = `synopses/*.json` (nach Kennung), `V` = `voices/<id>.json`, `L` = `data/link-check.json`.

- **Cover/Banner/titleDe/Wertung/Studio/Genre/Schlagworte/Laufzeit/Jahr/native:** Feld in `T` fehlt oder ist leer.
- **Handlung de / gar keine:** `S[id].de` bzw. `de` und `en` leer oder Eintrag fehlt.
- **Folgentitel:** Serie = Format TV/ONA/OVA/TV_SHORT mit `episodes` ≥ 2 (1.768); „keine Datei" = kein `F[id]`; „unvollständig" = weniger nichtleere `f[i][1]` als `episodes`.
- **Folgenzahl:** `episodes` fehlt/0.
- **FSK:** `fsk` fehlt; „nur Anbieter" = `fskQuelle` gesetzt.
- **Sprecher:** `V[id].roles` leer.
- **Weg:** „weder" = `streams` leer und `watchLinks` leer; „kein Streaming-Weg" = `streams` leer und kein `watchLinks` mit `kind: stream` (`tools/streaming-weg-zaehlen.mjs`).
- **Termin fehlt trotz laufender Serie:** Format TV/ONA, mindestens ein Stream mit `dub: true`, `jpEnd` leer oder ≥ heute, kein Event ab heute.
- **Uhrzeit künftig:** Event ab heute, Typ weekly/batch, Plattform ≠ tv, ohne `time`.
- **Schwach (Sprachurteil):** `streams` nicht leer und kein Stream mit `dub` gesetzt; low/normal = `dubConfidence`; `einzelquelle`, `dubAbgeleitet`, `fskQuelle` als Feldvorkommen.
- **Termine geschätzt / Folgenzahl angenommen:** Events mit `estimated` bzw. `episodeCountAssumed` (Titel = verschiedene `titleId`); Vergangenheit = Datum < heute.
- **Release nur eine Quelle / ohne `quellen`:** `len(sources)==1` bzw. Feld `quellen` fehlt; Beleg-Alter = jüngstes `quellen[].gesehenAm` vor mehr als 90 Tagen; Handbelege = `checkedAt` in `dub-confirmed.yaml`.
- **Adresse nie geprüft / 404:** Stream-URL nicht in `L` bzw. `L[url].status` 404/410.
- **erschienen ohne Weg:** Release (Streamingplattform) mit `firstEpisodeDate` ≤ heute, Titel hat keinen Stream derselben Plattform.
- **Release-Folgenzahl > Titel / Liste länger:** `schedule.episodeCount` (nicht Disc) bzw. `len(F.f)` größer `episodes`.
- **Folgentitel dreifach:** ein Titel kommt ≥ 3-mal in `F.f` vor (leere Strings eingeschlossen).
- **`dubRanges` zu groß:** `to` > `episodes`, Stream ohne `teilBereich` und `sharedWith`.
- **Adresse bei mehreren Titeln:** gleiche Stream-URL bei verschiedenen Titeln, ohne `sharedWith`.
- **Gleiches Cover:** gleiche `coverImage` bei Titeln mit verschiedener `franchiseId`; `jpEnd` < `jpYear` nach Jahr.

## Register (Entscheidung 16.11.2026)

Auftrag `maengel-register-1611`. Gewählt ist Variante A des Gegenentwurfs (`maengel-gegenentwurf.md`): ein Register, vom Bau erzeugt. Kein Ereignisprotokoll, kein Abbau-Workflow, kein Feld in `titles.json`, nichts nach `public/`.

**Datenform** (`data/maengel.json`, eine Zeile je Mangel, ~390 KB roh, 16 KB gzip bei 3.684 Zeilen):
`{stand, zaehler:{<art>:{wirkung,wer,offen,neu,behoben,rueckfall,ausnahme}}, zeilen:[{t,art,wirkung,seit,wer,status}]}` (Wirkung und `wer` auch im Zähler, damit `tools/maengel.mjs` sie ohne TypeScript kennt).
`status` ist `offen`, `behoben` oder `abwesend` (die beiden mit `bis`; sie bleiben 90 Tage, damit ein Rückfall bzw. die Rückkehr erkennbar ist). `abwesend`: der Titel steht nicht mehr in `titles.json`, der Mangel ist nicht behoben, nur nicht mehr zu messen; er zählt nirgends, und kehrt der Titel mit dem Mangel zurück, ist das weder „neu“ noch ein Rückfall (`seit` bleibt), ohne Mangel ist er „behoben“. `ereignis` (`neu` | `rueckfall`) und `hinweis` stehen nur in dem Bau, in dem es geschah.
`seit` kommt aus der **committeten** Vorfassung (`git show HEAD:data/maengel.json`, nicht die Datei im Arbeitsverzeichnis: ein Neuversuch in `commit-data.sh` baut sonst mit dem Register des ersten Versuchs) und bleibt, solange der Mangel offen ist. Ausnahmen („zu Recht leer“) stehen nur im Zähler, nicht als Zeile. Der Erstlauf ohne Vorfassung kennt kein „neu“, ebenso keine Art, die die Vorfassung noch nicht kannte (kein NEU-Schwall bei einer neuen Art). Ist die Vorfassung nicht lesbar, baut der Bau ohne sie weiter (alles gilt als Bestand) und setzt `hinweis`; die Wache gibt ihn als `MAENGEL_VORFASSUNG …` in die Lauf-Meldung.
Nur der Hauptbestand (`titles.json`); der Katalog ohne Synchro ist zu Recht fast überall leer.

**Regeln:** `pipeline/lib/maengel-regeln.ts` (Tabelle `REGELN`: `art`, `gruppe`, `wirkung` 1–3, `wer`, `zaehle`, `ausnahme`). Fortschreibung: `pipeline/lib/maengel-register.ts`. Phase: `pipeline/bau/13-12-maengel.ts` (hinter den Cover-Lücken). Tests: `pipeline/check-maengel-regeln.ts` (je Regel Treffer, Ausnahme, Grenzfälle), `pipeline/check-maengel-register.ts` (neu/behoben/Rückfall/abwesend/`seit`, 90 Tage, Wache-Zeilen), `pipeline/check-maengel-bau-lauf.ts` (Bauphase gegen eine Kulisse im Git-Repo, Vorfassung aus HEAD, kaputte Vorfassung), `pipeline/check-qualitaet-maengel-lauf.ts` (Wache und Verlauf in `check-qualitaet.ts`), `tools/bestand-qualitaet-schritt.test.mjs` (Workflow-Schritt, Mängel-Zeilen), `tools/maengel.test.mjs`.

**Leser:**
- Wache: `pipeline/lib/qualitaet-warnzeilen.ts` (`warnZeilen`, Aufruf in `check-qualitaet.ts`) druckt je Ereignis `MAENGEL_NEU …` / `MAENGEL_RUECKFALL …` / `MAENGEL_VORFASSUNG …` (je Art mit Zahl und drei Beispielen), Exit 0; der Schritt „Datenqualität messen“ in `bestand-bauen.yml` macht daraus `DATEN_WARNUNG`, wie bei `STREAMING_RUECKGANG`. Cover bleibt draußen (`OHNE_WACHE`), es steht nur im Register. Ein eigener Schritt und ein eigenes Skript entfallen (Nachtrag 16.11.2026, nach #4030).
- `node tools/maengel.mjs`: Übersicht je Art; `--top N [--wer auto|hand|daniel]`: die nächsten Titel nach Wirkung, bei gleicher Wirkung Termin in 30 Tagen vor laufend vor Rang (`tr`).
- `data/qualitaet-verlauf.json`: je Tag `maengel` = offene Mängel je Art (`check-qualitaet.ts`).

**Wiederverwendet, nicht doppelt gezählt:** `erstausgabe-ohne-weg` zählt über `zaehleErstausgabeOhneWeg` (`pipeline/lib/erstausgabe-ohne-weg.ts`), `cover` nimmt seine Ausnahmen aus der Handliste `data/cover-ohne-bekannt.json`, `sprachurteil-offen` zählt über `ohneSprachurteil` (`pipeline/lib/ohne-sprachurteil.ts`, dieselbe Formel wie `check-qualitaet.ts`). Ein Disc-Termin (`discTitelIds`) gilt bei `kein-weg` wie bei `erstausgabe-ohne-weg` als Weg.

**Ausnahmen:** `folgentitel` nur für `format` MOVIE (SPECIAL/MUSIC/OVA mit mehreren Folgen zählen); `folgenzahl` für Serien, die noch laufen (`jpEnd` ab heute; ohne `jpEnd` nur mit Wochentakt-Release (`weekly`) ab einem Tag ≤ heute ohne `lastEpisodeDate`, Termin ab heute, Jahr dieses Jahres oder ohne Jahr, nie bei FINISHED/CANCELLED, RELEASING nur beim Katalog; im Hauptbestand fehlt `jpStatus`; Fix 20.11.2026, davor galt jede Serie ohne `jpEnd` als laufend; Bilanz Bestand 20.11.2026: `folgenzahl` offen 0 → 0), Grund `laeuft`; `cover` für Titel der Handliste; `sprecher` ohne Synchro; `titel-de` ohne Weg und Erstausgabe.

**Bestandsbau-PRs:** `data/maengel.json` steht in `ERZEUGTE_DATEIEN` (`tools/pr-nachrechnen-bot-erzeugt.mjs`), sonst entwertete jeder Bau-Sprung der Datei (täglich) alle offenen PRs.

**Eine Art kommt dazu:** eine Zeile in `REGELN` (`zaehle` reine Funktion je Titel; `ausnahme` nur, wenn eine Lücke zu Recht besteht), ein Treffer- und ein Ausnahme-Test in `check-maengel-regeln.ts`. Braucht die Regel Daten, die `Kontext` nicht trägt, kommt das Feld in `Kontext` und in `baueKontext` (`13-12-maengel.ts`). Die Art erscheint beim nächsten Bau im Register, der Zähler im Verlauf ab dem Tag danach. Die Treffer einer später ergänzten Art stehen einmalig als NEU auf der Wache.

**Gemessen 16.11.2026, nach den Prüfer-Auflagen** (Stand `main` 14:00 UTC, 3.689 offene Mängel, 392 KB roh): cover 0 (+1 Handliste), banner 310, titel-de 55 (+22), handlung-de 72, folgentitel 290 (+6 MOVIE), folgenzahl 0 (+18 laufend), fsk 1.232, wertung 108, studio 105, genre 173, laufzeit 307, jahr 6, sprecher 362 (+50), kein-weg 200, erstausgabe-ohne-weg 166, termin-fehlt-laufend 3, sprachurteil-offen 167, synchro-schwach 79, erschienen-ohne-weg 13, folgenzahl-widerspruch 29, adresse-mehrfach 12.

**Erste Messung** (gegen Inventur, vor den Auflagen und dem Merge von #4030/#4029): offen + Ausnahme = Inventurzahl bei cover 2, banner 310, titel-de 55 + 22 = 77, handlung-de 72, folgentitel 256 (+ 40 Filme mit ≥ 2 „Folgen“), folgenzahl 13 + 5 Langläufer = 18, fsk 1.232, wertung 108, studio 105, genre 173, laufzeit 307, jahr 6, sprecher 362 + 50 ohne Synchro = 412, kein-weg 209, termin-fehlt-laufend 3, sprachurteil-offen 167, synchro-schwach 79, adresse-mehrfach 12. Abweichungen: erstausgabe-ohne-weg 171 statt 172 (gleiche Regel: Bestandsbau 11:20 UTC hatte 172, der von 11:39 hat 171, gemessen an den committeten `titles.json`); erschienen-ohne-weg 13 *Titel* statt 15 *Releases* (Einheit); folgenzahl-widerspruch 29 Titel (13 Titel mit Release-Folgenzahl über Titel, 18 mit längerer Liste, 2 in beiden).
Bau +0,23 s (Scan, 1.818 Folgen-Dateien und 32 Synopsen-Gruppen werden gelesen).

## Erster Abbau-Block (16.11.2026)

Regeln geschärft: `adresse-mehrfach` zählt eine leere Adresse nicht mehr (sechs Titel zählten doppelt), dafür die neue Art `weg-ohne-adresse` (Wirkung 3). `erschienen-ohne-weg` zählt nur **sichere** Termine (`istSichererTermin` aus `11-7`, ein geschätzter baut dort keinen Weg) und kennt die Ausnahme `belegtes-nein` (`lib/maengel-nein.ts`: „nicht verfügbar“ gilt nur, wenn es nicht älter ist als der Termin, „ohne deutschen Ton“ immer). Geschätzte, verstrichene Termine ohne Weg stehen sichtbar in `termin-geschaetzt-ohne-weg` (Wirkung 2). Klassenfixes im Bau: Phase 11 vermerkt `sharedWith` ein zweites Mal (Wege aus JustWatch/Termin entstehen nach 09-7, Iruma-kun Disney+), ein RTL+-Weg ohne Adresse nimmt die seines einzigen RTL+-Bezugswegs (Pokémon 98298).

## Neue Art `staffel-zuordnung` (17.11.2026, Block 2a, Issue 4089)

Misst, ob die Titel einer geteilten Netflix-Adresse zur Staffelliste des Anbieters passen (`pipeline/lib/maengel-staffel.ts`, Test `pipeline/check-maengel-staffel.ts`). Nur Netflix hat Staffelbereiche (`data/anbieter-staffeln.json`, 69 der 224 geteilten Adressen); Crunchyroll, Amazon, ADN, Joyn, Disney+ haben keine, dort misst die Art nicht. Nur Titel desselben Franchise (fremde Partner zählt `adresse-mehrfach`). Gruppe falsch, Wirkung 2, wer `hand:synchro-belegen`.
Befunde (Stand 17.11.2026, Hauptbestand, Prüferrunde 1 eingearbeitet): **offen 6** = `laenger-als-staffel` 2 (Titipo, 26 + 26 gegen 13 + 13) und `ueberlappung` 4 (Kuroko’s Basketball). Ausnahmen 29: `ohne-staffelliste` 25 Titel (12 Adressen; nicht messbar, kein belegter Widerspruch, die Folgenzahlen können passen) und `liste-veraltet` 4 (Blue Box 2 und Steel Ball Run 2: Netflix-Termin ab `gemeldetAm`, die Liste zählt die laufende Staffel nur bis zum Meldetag). Nicht gezählt: Staffeln ohne Titel (der Katalog kennt sie nicht, 2 Adressen), Titel ohne Folgenzahl (Art `folgenzahl`, 2 Adressen), passende Zuordnung (49 Adressen).
Grenzen der Messung: Die Staffelliste ist ein Stand (`gemeldetAm`); ein Titel ohne Netflix-Termin an der Adresse kann sie nicht als veraltet ausweisen. Bei Steel Ball Run hängt der wöchentliche Netflix-Termin (11 Folgen ab 25.09.) am Titel 190327 (Phase 1), nicht an 210482 (Phase 2-3): ob der Termin falsch zugeordnet ist, gehört in Teil b. Kuroko: Der Einfolgen-Titel „Tip Off“ (16916) steht nicht in Netflix’ drei Staffeln, die Summe 76 > 75 flaggt deshalb alle vier Titel der Adresse gemeinsam als einen Fall. Die Regel misst nur gegen `data/anbieter-staffeln.json`; Netflix-Serienseiten lesen wir nach Projektentscheidung nicht (nur Filme), die Cloud erreicht keine Anbieterseiten (Entscheidung Dirigent 17.11.2026, das Issue-Kriterium „Stichprobe gegen die Anbieterseite“ entfällt). Gegenprobe stattdessen gegen zweite Quellen im Repo (Folgenliste `public/data/folgen/<id>.json`, `episodeCount` des Netflix-Termins): Die Folgenzahl der Treffer stimmt dort überein (Kuroko 25 / 25 / 25, Titipo 26 / 26), der Widerspruch liegt also in der Anbieterliste (Titipo: Netflix zählt 13 + 13). **Laufende Titel** (`jpEnd` leer oder ab heute) sind grundsätzlich Ausnahme `laeuft`: Ihre Staffel wächst, die Liste ist ein Stand (Steel Ball Run 82116553).

- **Mängelart gegen Anbieterstand (Lehre 127, 17.11.2026, PR 4094):** Eine Mängelart, die gegen einen Anbieterstand misst (Staffelliste), nimmt laufende Titel aus (Steel Ball Run war Falschalarm); Stichproben brauchen eine zweite Quelle.

## Block 3: „laufend“ ohne Weg (17.11.2026)

- **Befund:** `laufend` im Register heißt nur „kein Ende (`jpEnd`) bekannt“ (`maengel.mjs`), nicht „läuft“; von 33 solchen Titeln der obersten Wirkung trugen 6 `kein-weg`. Zwei davon waren zu Unrecht offen: Witch on the Holy Night (Kinostart 26.01.2027 mit Synchro laut Anime2You, der Kino-Termin ist der Weg) und Princess Principal: Crown Handler Chapter 5/6 (kein Erscheinungsdatum, kein Termin, nichts, worauf ein Weg zeigen könnte).
- **Regel:** `kein-weg` kennt die Ausnahmen `kinostart` (belegter Kino-Termin ab heute) und `unveroeffentlicht` (weder `jpYear`/`jpStart`/`jpEnd` noch irgendein Termin); danach zählt der Mangel wieder, sobald der Kinostart vorbei ist oder ein Datum auftaucht.
- **Z wie Zorro – Der Film:** Der Prime-Handbeleg vom 12.11. (`B0GZ8BBZD8`, Tonspur Deutsch) trägt `kanalOhneBeleg`: `loadDubChecks` verwirft dort das `dub` (Kanal-Titel, Amazons Sprachangabe ist kein Beleg), `belegFuer` liefert nichts. Ein Weg aus dem geschätzten Termin („ab sofort“, `geschaetzt: true`) entsteht deshalb nicht; ein `dub`-Handbeleg hätte ihn nicht erzeugt (Probe 17.11.). Zorros Geheimnis hat gar keine Messung.

## Überholtes Prime-Nein bei Kanal-Terminen (17.11.2026, PR 4133)

- **Regel:** Ein Handbeleg-Nein „Suche ohne Treffer“ (`available: false`) älter als ein sicherer, begonnener Prime-Kanal-Termin verneint den Kanal-Weg nicht (`ueberholteNeins` in `bau/11-7-wege-aus-terminen.ts`, dieselbe Ausnahme in `check:handbelege`). Der Weg trägt `kanal`, kein `dub`, die Adresse kommt vom Bezugsweg. Klasse am 17.11.2026: 14713 (behoben), 175914 (ab 20.11. von selbst). Ohne `kanal` (Kuroko 102836) und bei `dub: false` gilt das Nein weiter.
- **Tauschgeschäft:** Der Weg ohne Tonurteil ersetzt `erschienen-ohne-weg` (Wirkung 3) durch `sprachurteil-offen` (Wirkung 2); nur eine gemessene Kanal-Seite schließt ihn.
- **`kanal` in `watch-links.yaml`-Streams ist untauglich (gemessen):** `09-1-belege` setzt jedem Stream mit begonnenem Termin derselben Plattform `dub: true`, auch einem früh angelegten Hand-Kanal-Weg; `11-6` bricht dann ab („Prime-Weg trägt deutsch ohne Handbeleg“). Snowball Earth (196144) bleibt offen, bis ein Tonschutz für Kanal-Hand-Wege lohnt (nur 1 Titel).
- **Fallstrick (17.11.2026, PR 4133):** `import { type X } from './grundlagen.ts'` bleibt unter tsx ein Seiteneffekt-Import und liest beim Laden Datendateien; `check-handbelege.ts` zog so `grundlagen.ts` in die Mini-Repo-Tests (`check-handbelege-*-lauf`, ENOENT `kino-ankuendigungen.yaml`). In Prüfskripten und ihren Importen nur `import type { X }`.

## Block 6: „laufend“ ohne Termin (17.11.2026)

- **Befund:** `laufend` in `node tools/maengel.mjs --top` hieß nur „`jpEnd` leer“ und war eine Sortierhilfe, kein Status (`shared/logic.ts` `titleStatus` bleibt unberührt). Zu Unrecht „laufend“: die Filme Z wie Zorro und Zorros Geheimnis (Eigentitel 5000001/2, kein `jpEnd`) und Eichhörnchen und Igel (10009970, `jpYear` 1977, Erstausgabe 1988). Regel jetzt: Film nie, sonst gilt ohne `jpEnd` das Jahresende von `jpYear` (wie `titleStatus`). Echt laufend bleibt Ranma S3 (2026). Mutationsliste `tools/mutationen/maengel-laeuft.json`, 3 von 3 rot.
- **Daten unverändert** (Bau byte-gleich, nur das Werkzeug): Register und Zähler ändern sich nicht, nur die Rangfolge von `--top`.
- **Zorro (Klasse `termin-geschaetzt-ohne-weg`, 4 Titel mit begonnenem geschätztem Termin ohne Weg zu dieser Plattform: 5000001, 5000002, 169969 Netflix, 196144 Prime):** Quelle Anime2You 1066831 nennt „Sprache: Deutsch, Stream: Joyn, Prime Video“, Tag nur „ab sofort“ (≈ 03.11.). `istSichererTermin` baut aus einem geschätzten Termin bewusst keinen Weg; ob ein „ab sofort“-Termin mit ausdrücklich genanntem Anbieter einen Weg ohne Tonurteil bauen darf (nur Joyn; Prime braucht `kanal`, die Quelle nennt keinen), ist eine Regeländerung mit Außenwirkung und bleibt offen (Entscheidung nötig, kein Fix auf Verdacht).
- **Eichhörnchen und Igel (10009970):** Nur `deErstausgabe` (Progress Film 1988, Synchro belegt), kein Streaming, keine Disc-Zeile; kein Beleg für einen Weg gefunden, bleibt `kein-weg`/`erstausgabe-ohne-weg` (Klasse: 166 `erstausgabe-ohne-weg`, Aufgabe `daniel`).
- **Ranma 1/2 Staffel 3 (209872):** Weg Netflix, Folgen 1–4 deutsch belegt (Handbeleg 24.10.), Termin nur Folge 1 am 05.10. (Anime2You 1057709: „ob weitere Folgen synchron samstags folgen, ist offen“). Suche 17.11.2026: Websuche nur Treffer, die sich widersprechen (kino.de 06.10., Moviepilot 20.10.) und keinen Wochenplan für Staffel 3 nennen; gamepro.de nicht erreichbar (Netzwerksperre der Cloud). Kein Beleg, Rhythmus bleibt offen, `termin-fehlt-laufend` bleibt zu Recht.

## Block 7: `titel-de` (17.11.2026)

- **Herkunft:** `titleDe` kommt aus aniSearch-Sprachblock, TMDB (de-DE, nur wenn der Name von Original/Englisch abweicht) und `data/titel-de.yaml` (Handwert, schlägt alles; zwei Quellen Pflicht). Die 55 offenen Titel sind fast alles Filme: TMDB liefert dort entweder den englischen Namen (vom Filter als „kein Gewinn“ verworfen), den japanischen, nichts, oder dieselbe TMDB-Kennung für mehrere Teile (`mehrdeutigeFilmzuordnungen` verwirft beide: Code Geass Akito 1/2, Sailor Moon Eternal 1/2, Psycho-Pass Case 1–3).
- **Gemacht:** 23 Titel mit Handwert, belegt durch TMDB-Eintrag (de-DE, `data/tmdb-titles.json`) plus aniSearch-Ausgabe (`data/disc-ausgaben.json`, deutsche Disc-Namen): Mardock Scramble 1–3, Appleseed XIII Tartaros/Ouranos, Persona 3 Movie 1–4, GITS Arise Border 1–4, Digimon tri. 1/2/3/6, Free! Timeless Medley 1/2, FGO Camelot 1/2, Princess Principal Crown Handler 1/2. Cloud-Lauf ohne Netz zu Wikipedia, OFDb, TMDB, aniSearch: nur Repo-Stand gelesen, keine Seite abgerufen.
- **Offen (32), ohne zweite Quelle:** Ajin 2/3 (nur aniSearch), Attack on Titan Part I (nur aniSearch, „Feuerroter Pfeil und Bogen“), Cyborg009 2/3, Date A Bullet 1/2, Free! Final Stroke 1/2 und Donten ni Warau Gaiden 1/2 (nur TMDB), Sinbad 3 Filme (aniSearch nennt nur die Reihe), Code Geass Akito 1–4 (geteilte TMDB-Kennung bzw. nur TMDB), Psycho-Pass Case 1–3, Sailor Moon Eternal 1/2, Rockman.EXE AXESS, Moonlight Mile, Rozen Maiden (Name gleich dem Originalnamen, aniSearch und Wikidata nennen ihn, `verworfen: gleich dem vorhandenen Namen`), Picture Dramas, Grisaia Stargazer, Nanatsu no Taizai Edinburgh, Pacific Rim The Black S2, Made in Abyss 1.
- **Klasse (nicht geändert):** Der TMDB-Filter „Name gleich Original/Englisch“ ist Absicht (TMDB fällt still zurück). Eine Lockerung bräuchte eine zweite Quelle je Titel, genau das leistet der Handwert; ein Bauweg „TMDB-Name = aniSearch-Ausgabe“ wäre der nächste Schritt, wenn weitere Blöcke dieselbe Form haben.

## Block 8: `folgenzahl-widerspruch` (17.11.2026)

- **Befund (29 Titel):** Drei Ursachen. (1) Die Anbieterzahl führt die Serie des Anbieters, nicht den AniList-Eintrag: Gantz Prime 26 = 13 + Staffel 2 (13), Concrete Revolutio 24 = 13 + 11, Wolf’s Rain ADN/Liste 30 = 26 + OVA 4, Air Gear 26 = 25 + Special, Clannad 25 = 23 + 2 OVA, Sankarea 13, Danganronpa 14, To Love Ru Darkness 2nd (Liste 14 = 12 + Special 2). (2) Nur gesichtete Sendetermine (`episodeCountNurGesichtet`, Super Wings 59 > 52, Yashahime 28 > 24) sind keine Gesamtzahl. (3) Rest ohne erklärende Summe.
- **Regel:** `pipeline/lib/folgenzahl-erklaerung.ts`, Ausnahmen `anbieter-franchise` (jede Zahl über `episodes` = Summe aller TV/ONA-Teile des Franchise oder von höchstens zwei OVA/Specials; Filme zählen nicht) und `nur-gesichtet`. Gemessen: 29 offen → 19 offen + 10 Ausnahme, kein anderer Zähler verändert; Tests in `check-maengel-regeln.ts` (Zeilen aus dem Bestand), Mutationsliste `tools/mutationen/folgenzahl-erklaerung.json` (6/6 rot).
- **Offen (19), kein Beleg in dieser Sitzung:** 508 Hamtaro (Liste 296 gegen 193), 1816 Sonic X (78 gegen 52), 2043 Cat’s Eye (73 gegen 36): die deutsche Fassung zählt vermutlich länger bzw. fasst Staffeln zusammen, nicht belegt. 15489 Zexal II (Prime 97 ohne passende Summe; geklärt 19.11.2026: Prime-Staffel 2 teilt sich mit Zexal, siehe quellen.md), 175914 Call of the Night 2 (Prime 13 gleicht der Folgenzahl von Staffel 1, ab 20.11.), 190327 Steel Ball Run (Netflix 11 ab Folge 2: der Termin gehört vermutlich zu 210482, Block 2a). Kurzformate mit längerer Teile-Liste: 98873, 99470, 109002, 114448, 132232, 132340, 135255, 146984, 148149, 151126 (Liste mit doppelter Nummer 13), 154147, 131586 (13 gegen 12), 188055 (27 gegen 26, Film als Zugabe). Je Titel braucht es eine zweite Quelle (aniSearch-API, Anime2You) vor einem Handbeleg.
- **Block B (23.11.2026):** 15489 Zexal II geschlossen: der Prime-Termin (`data/curated/streaming-nachtrag-2026.yaml`) zählte 97 = Prime-Staffel 2 (49) + 3 (48); 24 davon sind Zexal 50–73, bei Zexal II liegen 25 + 48 = 73 (Handbeleg `dub-confirmed.yaml`, Prime-Seiten B0GWMY6WCP/B0H298L2X9 geprüft). Erwartung nach Bestandsbau: 19 → 18 offen (ohne `data/cache/` lokal nicht gemessen). Nicht als Datenkorrektur belegbar (AniList-`episodes` hat keinen Handweg): **2043 Cat’s Eye** (AniList 36 = erste Serie; ANN und MAL führen 36 + 37 = 73, die Folgenliste mit 73 stimmt, die zweite Serie fehlt im Katalog), **114448 Saint Seiya Teil 2** (AniList 6; die Liste aus aniSearch 12698 zählt Netflix-Staffel 1 mit 12 Folgen = Teil 1 + 2, Teil 1 fehlt im Katalog; die Zuordnung `de` 1–6 zur Folgenliste 1–12 ist ungeprüft), **99470 Grisaia Phantom Trigger** (AniList 2 Filme, aniSearch-Liste 3; der dritte ist 120892 Stargazer, `ausFranchise` zählt Filme nicht mit). Lösung für alle drei: fehlende AniList-Teile in den Katalog bzw. Bau-Regel, die Filme als Zugabe zählt (Verhaltensänderung, eigener PR).

- **Block A, Nachtrag 22.11.2026 (Nr. 28, Issue 4420):** Steel Ball Run 190327 geschlossen: Der Wochentermin „2nd & 3rd STAGE“ (`data/curated/batch-2026.yaml`) hängt jetzt an 210482 (Phase 2-3, 11 Folgen; aniSearch 21986 führt genau diese Folgen, 190327 = 20466 nur Folge 1, `anisearch-ids-hand.yaml`); `firstEpisodeNumber` entfällt, `zeiten` zählt ab 1 (6 bis 11). Wirkung erst nach dem Bestandsbau (Patch-Note im Vorrat). **Offen mit Ursache, kein Handweg:** Hamtaro 508: AniList führt 193 Folgen, die Fortsetzung 145406 „Hamu Hamu Paradichu!“ (TV, 103 Folgen, AniList-Relation SEQUEL) steht nicht im Bestand; aniSearch 764 zählt beide zusammen (193 + 103 = 296, Folgenliste bis 2006; en.wikipedia „List of Hamtaro episodes“: 105 englisch synchronisiert + 191 nicht = 296). Die Liste ist also richtig, nur der AniList-Eintrag kürzer; lösen würde den Fall der Eintrag von 145406 im Bestand (dann greift `anbieter-franchise`) oder eine Regel-Ausnahme, kein Eintrag in `data/`. Overlord (Movies) 98873 und Penguindrum 132232: aniSearch führt je einen Eintrag für zwei Filme (12083: „The Undead King“ + „The Dark Hero“; 16120: Zenpen + Kouhen), die Liste zählt die Filme als „Folgen“. Bei Overlord ist 98874 per Handdatei an 12083 gebunden, steht aber nicht in `data/anisearch.json`, deshalb zählt `schreibeFolgenDateien` (`jeAsId`) kein Bündel und schreibt die Zwei-Filme-Liste an 98873; bei Penguindrum fehlt Teil 2 (Kouhen) im Bestand. Beides ist eine Bau-Entscheidung (`jeAsId` um die Handbindungen erweitern), keine Datenkorrektur.

## Block 9: `synchro-schwach` (17.11.2026)

- **Klasse geprüft, keine Ursache gefunden (81 offen):** `belegstaerke()` auf alle 81 Titel mit den Signalen aus `ladeBelegsignale()` gerechnet: bei allen bleibt es `low` (kein Anbieter-`dub`, keine Kartei, kein TV, kein Forum, kein deErstausgabe; JustWatch-Menge im Lauf ohne Cache leer, nicht geprüft). Die Handbelege mit `dub: true` (102349, 102350, 103631, 184591, 5000001, 5000003) sind Amazon-Kanal-Titel („Amazons Sprachangabe ist hier kein Beleg“) und zählen laut Regel nicht. Disc-Händler (6855 „Deutsche Tonspur“, 177132 „laut Anime2You“) sind Spur, nicht Beleg (Skill `synchro-belegen`). Eine Lockerung wäre eine Regeländerung, kein Fehler.
- **Einzelbelege: keine eingetragen.** `www.anime2you.de` war in dieser Sitzung vom Netz gesperrt (Proxy 403, `ENOTFOUND`), aniSearch-API und Synchronkartei ebenfalls nicht erreichbar gemacht; Nichtauskunft ist kein Befund. Daten unverändert.
- **Aussichtsreichste Kandidaten für den nächsten Lauf (mit Netz):** 213805 und 177132 (Anime2You-Artikel steht schon in den `sources`, Serie braucht Folgenbeleg), 6855 (Action Cult, Tonspur), 207254 Thunder 3, 190054 Special, 130003 Bocchi, 164212 Girls Band Cry (Netflix, Serie: je Folge belegen).

## Werkzeug für die Anime2You-Belegsuche (18.11.2026)

`node tools/anime2you-suche.mjs liste [--kanal aniverse]` (Kanal-Titel in `data/dub-confirmed.yaml` ohne zweite Quelle, am 18.11.2026 auf main: 451 Titel, mit `--kanal aniverse` 222), `suche <Titel> [--seiten N] [--filter Wort]` und `artikel <URL|ID>...` (Titelblöcke »…« mit Zeile „Sprache:“ und Sprachstellen). Ausgabe JSON, schreibt nie in `data/`; Bewertung und Eintragen bleiben Handarbeit. Abruf über die WordPress-Schnittstelle (`/wp-json/wp/v2/posts`), Regeln wie `scrape-anime2you.ts`: 1,5 s Pause, generischer User-Agent, bei 429/403 Pause und Wiederholung, danach Nichtauskunft (Exit 1, kein Befund). Ersetzt die Wegwerfskripte aus Block 10. robots.txt: [quellen.md](quellen.md), Abschnitt „Anime2You Belegsuche“.

**Staffelprüfung `pruefe` (18.11.2026):** `node tools/anime2you-suche.mjs pruefe <AniList-ID> --zitat "<Satz>"` hält die im Zitat genannte Staffel gegen jede Adresse des Titels (Notiz „laut Adresse Staffel N“, sonst AniList-Folgenzahl bei höchstens 30 Folgen): `passt`, `abweichung` (Exit 1) oder `unbekannt`. Nur `passt` darf das Zitat als `zweiteQuelle` tragen. Klassenprüfung aller 102 Staffelzitate (18.11.2026): 1 Titel falsch (115740, 2 Zeilen, Zitat entfernt), 1 Fehlalarm (Clannad: After Story 4181, Zitat „zweite Staffel“ passt zur Staffel-2-Adresse, die Notiz „Staffel 1“ der ältesten Zeile gehört zur Seitenadresse B0D956JD5Y). Die Regel `istSchwaechereSchwester` gilt seit 18.11.2026 nur für Seiten derselben Ausgabe (Kanal ≠ Prime-Abo). Aus der Cloud ist anime2you.de gesperrt (Proxy 403, 18.11.2026): die offenen Titel 481, 1469, 1614, 1840, 2569, 20698 brauchen einen Lauf mit Netz.

**Wächter `check-staffelzitat-bestand` (18.11.2026):** `pruefe` braucht kein Netz (liest nur `data/dub-confirmed.yaml` und `public/data/titles.json`); die Prüfung läuft über alle Anime2You-`zweiteQuelle`-Zeilen (`pipeline/lib/staffelzitat.ts`, in `check:bestand`, wenige ms) und stellt einen Titel mit „abweichung“ zurück. Das Clannad-Problem ist über die Logik gelöst: Nennt die Notiz eine andere „Seitenadresse“ als die gelesene „Amazon-Seite“, gehört „laut Adresse Staffel N“ der Seitenadresse, die Zeile gilt als „unbekannt“. Echter Fund beim ersten Lauf: Freezing 9367 (zwei Zeilen, Adresse B0CH9BW1PW laut Gegenzeile von 18001 Staffel 1, Zitat „zweite Staffel“, 18 statt 12 Folgen) steht in `STAFFELZITAT_BEKANNT` (ein Eintrag ohne Fund macht den Wächter rot, die Liste kann nur sinken), bis ein Daten-PR das Zitat zuordnet oder entfernt.

**Blindfleck des Wächters und Daten-Folgeauftrag (18.11.2026):** Von 434 Anime2You-Zeilen nennen 102 eine Staffel: 13 „passt“, 2 „abweichung“ (9367), 87 „unbekannt“ (38 Titel, die Staffel der Adresse steht nicht fest). „Unbekannt“ ist kein Verstoß, der Wächter sieht dort also nichts. Zwei dieser Zeilen sind vermutlich falsch und brauchen einen Daten-PR (Adresse, Titel und Zitat gegenlesen, dann Zitat entfernen oder zuordnen): The Familiar of Zero 1195 (Staffel-1-Titel, 13 Folgen, Zitat „vierte Staffel“ an B0B8RQ86ZZ) und The Familiar of Zero 2 1840 (Zitat „dritte Staffel“ an B0B8PXXV17, laut Seite Staffel 2; die Notiz „Staffel 3“ gehört zur Seitenadresse B0CC5GCCKZ, vor der Seitenadress-Regel galt die Zeile fälschlich als „passt“). Vorschlag, nicht gebaut: Regel „Titel ohne Folgekennzeichen plus Zitat ab Staffel 2“ als Warnung.

## Block 9b: `synchro-schwach`, mit Netz belegt (17.11.2026)

- **Ergebnis (Zählbasis `data/maengel.json`, Art `synchro-schwach`, offen; Bau-Vergleich Basis `a775cef00029`, Kandidat `e10bde37f6ac`):** 83 → 71 (gemessen 83 → 70 mit 101343, danach zurückgenommen, s. u.; nicht neu gebaut). Elf Titel stehen über `data/erstausgabe-von-hand.yaml` (Kino/Disc mit deutscher Sprachfassung laut Anime2You; `low` → `normal`, „Auf Deutsch seit …“): 177132 A New Dawn, 185212 und 198369 Detektiv Conan Film 28/29, 130622 Birth of Kitaro, 164212 Girls Band Cry, 100388 Banana Fish, 174188 Nukitashi, 175914 Call of the Night 2, 21032 und 100658 Sinbad-Filme, 19191 GITS Arise Border 2. Thunder 3 (207254): Am 17.11. kam auf main ein gemessener Netflix-Beleg aus dem Browser dazu (Tonspur Deutsch, Folgen 1–12); dieser PR ergänzt dort nur noch Anime2You als zweite Quelle in der `note`. Thunder 3 zählt deshalb nicht mehr zu diesem Block; die Patch Note nennt 11 Titel (18.11.2026).
- **Bewusst nicht eingetragen:** Disc oder Kinostart liegt noch in der Zukunft (Bocchi 130003 am 20.11., Strike Witches 2 6381 am 27.11., Isekai Onsen 171019 am 28.01.2027, Witch on the Holy Night 143103 im Januar 2027, Demon Slave 2 176276 im März 2027) — „Auf Deutsch seit“ wäre dort falsch; nach dem Erscheinen eintragen (Synchro ist durch Anime2You belegt). Ramparts of Ice 2 (213805): Staffel 1 deutsch belegt, Staffel 2 läuft im Simulcast, Folgenbeleg fehlt. Kubo, Takamine, Tsugumomo 2: Anime2You nennt nur Originalton mit Untertiteln bzw. keine Sprache. Ajin-Filme 21505/21681: keine Aussage zur Filmfassung gefunden. 101343 Made in Abyss: Journey’s Dawn: die zuerst genutzte Meldung (Awakening-Mystery-Trailer) nennt den Film nicht, keine Meldung zu genau diesem Film gefunden, Eintrag zurückgenommen.
- **Nicht abgerufen (Regel):** aniSearch-Seiten, Synchronkartei (untersagt automatisiertes Auslesen), Netflix- und Amazon-Seiten. Die Wikipedia-Abfrage wurde nach wenigen Treffern gedrosselt (429).

## Block 10: Prime-Kanal-Titel ohne zweite Quelle (18.11.2026)

- **Regel und Zählbasis:** Kanal-Regel 11.10.: Ein Prime-Kanal-Titel (Note „Kanal-Titel, Amazons Sprachangabe ist hier kein Beleg“) braucht `zweiteQuelle` mit tonführender Aussage (deutsche Synchro/Vertonung, nicht bloß „verfügbar“). Gezählt in `data/dub-confirmed.yaml`: Zeilen mit `dub: true` und dieser Note, je Titel (`anilistId`). Vorher (origin/main, 17.11.): 455 Titel, 1 mit `zweiteQuelle`, 454 ohne. Nachher: 59 mit, 396 ohne.
- **Methode:** Anime2You-Suche (`/?s=<titel>`) und Monatsartikel der Anbieter, nur Anime2You abgerufen (gedrosselt, 1,2 s), keine aniSearch-, Amazon-, Netflix-Serien- oder Synchronkartei-Seiten. Die Zeile nennt Quelle, Datum, die tonführende Aussage und die Adresse.
- **aniverse (52 Titel belegt, Quelle Anime2You-Monatsartikel „Neue Anime-Katalogtitel bei aniverse“):** Break of Dawn 146489, City Hunter: Angel Dust 147189, K: Return of Kings 20913, Die Ewigkeit, die du dir wünschst 147, Komada 164293, Kizuna no Allele Staffel 2 166523, Ame & Yuki 12355, Peter Grill 111965, The First Slam Dunk 128207, Blast of Tempest 14075, Tekkonkinkreet 2154, Insomniacs after School 143653, Iroduku 101316, Chibi Maruko-chan 951, Chaos Dragon 21055, Digimon Data Squad 859, Gleipnir 108241, Hellsing 270, Summer Wars 5681, Farm-Related Skills 145815, Our Last Crusade 112667, Ouran High School Host Club 853, Lonely Castle in the Mirror 145739, Phantom of the Idol 142095, Shikizakura 105119, Sekirei 4063, Tamako Love Story 20519, Tamako Market 16417, The King’s Avatar 108981, The Dreaming Boy Is a Realist 157397, The Colors Within 158166, Two Car 99672, Ragna Crimson 146493, Murder Princess 1696, Strike Witches: Operation Victory Arrow 20650, Goblin Slayer 2 129188, By the Grace of the Gods 115740, Blue Giant 140499, Digimon Adventure 02: The Beginning 137310, Blood-C: The Last Dark 10681, Erased 21234, Infinite Dendrogram 107420, Ippon Again! 136435, Wunderbare Pollyanna 2554, Das Mädchen, das durch die Zeit sprang 2236, Der Junge und das Biest 20981, Danganronpa 16592, Giant Beasts of Ars 155089, Saiyuki Reload: Zeroin 128400, Hände weg, Kotesashi-kun 187331, M.A.S.K. 5000003, Demon Slave 141821. Offen (7), im Vorlauf (17.11.) ausgelassen: 184591 (Amazon-Messung 13.10.: nur Japanisch, `dub` fehlt, kein Kanal-Ja), 1462, 14355, 156896, 457, 20521, 146210 (hier ohne eigene Gründe festgehalten; in den Monatsartikeln des Vorlaufs keine passende Aussage, nicht nachgeprüft). Weitere aniverse-Titel (Zählung nach erstem Anbieter der Note: 139 ohne) wurden in diesem Block nicht einzeln durchsucht.
- **Midnight Factory (2 neu belegt, 2 offen; vorher 2 belegt):** Akudama Drive 116566 (Anime2You 03.12.2021: ProSieben-MAXX-Premiere, deutsche Vertonung, Kölnsynchron), Boogiepop and Others 101283 (Anime2You 11.01.2021: Netflix mit deutscher Sprachausgabe, Kölnsynchron). Offen: Blood-C: Die Serie 10490 (Anime2You nennt „deutsche Synchronfassung“ nur für die Komplettbox-Ankündigung und den Film, die Serie lief nicht im TV; Disc-Ankündigung ist Spur, nicht Beleg), Memories 1462 (nichts gefunden).
- **CineMix+ (3 von 4):** Made in Abyss: Seelen der Finsternis 100643 (Anime2You 27.08.2020: Kino mit deutscher Synchronisation, EuroSync, Sprechercast), Made in Abyss: Gefährten der Dämmerung 101344 (Anime2You 26.10.2023: Arthouse CNMA, deutsche Sprachfassung), Mary und die Blume der Hexen 97981 (Anime2You 14.06.2021: Disney Channel, deutsche Synchronisation). Offen: Giovannis Insel 19115 (Anime2You nennt nur die Disc-Sprachausgabe, TV-Premiere ohne Sprachangabe).
- **ARD Plus (1 von 4):** Es war einmal … der Weltraum 11307 (Anime2You 02.11.2023: ZDFneo, alle Episoden, Reihe mit deutscher Vertonung). Offen: Es war einmal … Amerika 10004750, … Entdecker und Erfinder 10005293, … Die Entdeckung unserer Welt 10005217 (kein Anime2You-Artikel zu diesen Serien).
- **Kixi (0 von 11):** Tim & Struppi -1570 (ZDFneo zeigt alle Episoden, Anime2You 28.10.2024 ohne Sprachangabe: Spur, kein Beleg), Pororo 102365, Hanni und Nanni 2570, Tao Tao 102460, Freddy Frog 102397, Spycies 163696, Ab durch den Dschungel 10010552, Speckles 141166, Happy Fish 2 10013226, Prinz Ribbit 10011569, Fischen Impossible 10011556: Anime2You berichtet über diese Kinderfilme nicht (Suche ohne Treffer). Bleiben offen, nächster Weg wäre eine Publisher- oder Senderquelle.
- **Klasse:** 396 Kanal-Titel ohne zweite Quelle bleiben offen; die größten Gruppen sind Crunchyroll-Kanal (152, erben vom Anbieter-Ja, `kanalErbtVomAnbieter`), aniverse (139), Anime Digital (31), FVOD (20). Ein Weg über Anime2You ist nur dort tragfähig, wo Monatsartikel oder TV-/Sender-Meldungen die Sprache nennen.

## Block 11b: aniverse-Kanal-Titel ohne zweite Quelle (18.11.2026)

- **Regel, Methode, Zählbasis:** wie Block 10 (Kanal-Titel in `data/dub-confirmed.yaml`, je `anilistId` gezählt; `node tools/anime2you-suche.mjs liste --kanal aniverse`). Vorher (origin/main `e50fb9581`, 18.11.): 168 aniverse-Titel ohne `zweiteQuelle`, nachher 42. Alle Kanäle zusammen: 393 → 267 ohne, 62 → 188 mit. Belegt sind 126 Titel (75 %), eingetragen als 286 Zeilen (je Amazon-Adresse des Titels, wie `tools/kanal-nachmessung.mjs` zählt). **Staffelregel (Abnahme-Auflage A1):** Ein Zitat, das eine Staffel, einen Teil oder Film nennt, steht nur an Adressen, deren Staffel belegt ist (Notiz „laut Adresse Staffel N“ gleich Zitat-Staffel, oder AniList-Titel mit höchstens 30 Folgen, Adresse mit gleicher Folgenzahl ±2, keine abweichende Adress-Staffel, ASIN nur bei diesem Titel). Geprüft wurden alle 27 Titel mit Staffelzitat an mehreren Adressen (110 Zeilen). Von 330 Zeilen fielen 44 an 14 Titeln weg; 6 Titel sind dadurch wieder offen (481 Yu-Gi-Oh!, 1469 Monster Rancher, 1614 Super Kickers 2006, 1840 Familiar of Zero 2, 2569 Das Dschungelbuch, 20698 SNAFU TOO!); die anderen 8 behalten Zeilen an den belegten Adressen (2116 Captain Tsubasa, 482 Yu-Gi-Oh! GX, 2167 Clannad, 4181 Clannad After Story, 457 Mushi-Shi, 10790, 12979, 934). Kizuna no Allele 156896 trug das Zitat der zweiten Staffel statt der ersten, korrigiert. Zeilen von Block 10 bleiben unberührt (115740: Zitat „erste Staffel“ an einer Adresse mit Notiz „laut Adresse Staffel 2“, Befund für den Dirigenten).
- **Quellen (nur Anime2You, WordPress-Schnittstelle, gedrosselt):** 91 Artikel: die Monatsartikel „Neue Anime-Katalogtitel bei aniverse“ (Juli 2023 bis November 2026), die älteren „aniverse: … Anime-Neuzugänge“ (2020 bis Dezember 2022) und Einzelmeldungen (Overlord IV, Akane-banashi, Kill Blue). Ein Titel zählt, wenn ein Titelblock »…« gleich lautet (normalisiert) oder von Hand einem abweichend geschriebenen Block zugeordnet wurde, und der Artikel eine tonführende Aussage trägt: deutsche Vertonung/Synchronisation/Sprachfassung/Sprachausgabe, „auf Deutsch“ oder „Sprache: Deutsch“ (Artikel ab Aug. 2026), im Wortlaut als Satz in `zweiteQuelle`. Bei Mehrstaffel-Serien steht die genannte Staffel im Satz; der Eintrag gilt nur, wenn die Staffel zum Titel passt (Arifureta 100668/112323/154473 je eigene Staffel, Higurashi, SNAFU, Kuroko, Familiar of Zero, Overlord III/IV, Naruto-Filme einzeln).
- **Nur Kennzeichen „(Dub)“ (6 Titel, kein Satz zur Fassung im Artikel gefunden):** 934 Higurashi Staffel 1, 3010 Z wie Zorro, 3455 To Love-Ru: Trouble, 20521 Hamatora, 20741 Date A Live: Mayuri Judgement, 102976 KonoSuba: Legend of Crimson. Die Zeile nennt die Überschrift im Wortlaut mit dem Zusatz „(Dub = deutsche Vertonung)“; in denselben Artikeln steht bei Titeln mit Satz dasselbe Kennzeichen neben „mit deutscher Vertonung“, bei Untertitel-Titeln „(Sub)“.
- **Offen (42):**
  - Staffelzitat nicht auf die Adressen übertragbar (6 Titel, siehe oben). Yu-Gi-Oh! 481: Nur `B07FB4D9KM` („laut Adresse Staffel 4“) wäre mit dem Zitat zur vierten Staffel (Anime2You 26.06.2024) belegbar; der Eintrag ist trotzdem leer gelassen, weil er den Prime-Weg `B0C7GQSHYT` verliert (Ursache nach Code-Lesung, bestätigt durch zwei Bau-Vergleiche: mit Zitat an `B07FB4D9KM` Prime 2 → 1, ohne Zitat keine Änderung; Stellen: `pipeline/bau/09-3-0-prime-meldungen.ts:216`, `istSchwaechereSchwester` in `pipeline/lib/staerkste-seite.ts:32`: gleiches `checkedAt` 2026-09-25 und weniger geprüfte Folgen (25 gegen 40) gelten als „schwächere Schwester“; solange `B07FB4D9KM` als Kanal-Beleg ohne zweite Quelle aus der Belegliste fällt, greift die Regel nicht). Erledigt 18.11.2026: Die Regel gilt je Ausgabe (4187), `ersetztBeleg`/`vergleicheBelege` ebenso (Kanal/Abo-PR), der Eintrag für 481 steht an B07FB4D9KM.
  - Anime2You nennt Deutsch, die Amazon-Termine widersprechen: 166240 Demon Slayer Hashira Training Arc (Prime-Kanal Crunchyroll) und 145139 Swordsmith Village Arc (Kanal aniverse). Alle Prime-Termine beider Titel tragen eine Sprachkennzeichnung; `pipeline/check-kanal-ja-sprach-termin.ts` hält beide ausdrücklich ohne Kanal-Ja (erste Fassung dieses Blocks trug sie ein, `check:logic` wurde rot, Einträge zurückgenommen). Entscheidung wäre eine Termin-Nachmessung, nicht eine zweite Quelle.
  - Spur ohne Sprachangabe (Titel genannt, Sprache nicht): 169931 All-Guy’s Mixer (März 2026), 9989 AnoHana (April 2026, „wieder in sein Programm“), 21064 Trinity Seven OVA (März 2025), 140501 Demon Sword Master (Februar 2025).
  - Nur Originalton mit Untertiteln: 162989 Mask Danshi (Oktober 2023).
  - Artikel betrifft ein anderes Werk derselben Reihe, nicht den Titel: 13201 Monster Rancher (zweite Serie, nur die erste belegt), 20832 Overlord (Staffel 1: „stehen seit geraumer Zeit zur Verfügung“, keine Sprache), 98437 Overlord II (Staffel 3 und 4 belegt), 98873 Overlord (Movies) (Filme einzeln belegt), 5114 Fullmetal Alchemist: Brotherhood (Artikel nennt nur „Fullmetal Alchemist“).
  - Kein Artikel in den 91 gelesenen gefunden (24): 21676, 101166 DanMachi-Filme, 20540, 20552, 11061 (nur Phantom Rouge, im Mai 2026 entfernt), 100010, 99938 (nur Teil 2 bis 4), 20881, 20727, 139587, 21003, 139825, 21319, 21798, 102346, 102349 (K-Filme 1, 2, 5; Film 6 belegt), 20712, 5764, 185660, 15377, 21874, 1894, 6951, 5000001. Nächster Weg: Einzelsuche je Titel, dann Publisher-Quelle.
- **Bau-Vergleich** (Basis `a2d4034971c5` = origin/main, Kandidat `6b34b4571a1d`, `--katalog`; Skript `tools/bau-vergleich.mjs`): 78 Titel bekommen einen Prime-Deutsch-Haken (`streams[].dub`), 0 verlieren den Haken oder eine Plattform, 1 Titel kommt neu in `titles.json` (Hell Mode 185262). Wege je Titel (`streams`): 0 Titel ändern die Zahl ihrer Wege (frühere Fassung dieses Blocks: Yu-Gi-Oh! 481 Prime 2 → 1, behoben, Ursache oben unter „Offen“). Termine (`releases.json`, `platformUrl`): 5 wechseln die Adresse (motn-10490: `B0D2BVK2DS` → `B0GTXKW99L`, motn-20704: `B07WGZKKGK` → `B0DNGDQ8DB`, motn-21131: `B0G23DYY9D` → `B0C7JVLPDR`, motn-21221: `B0DV2ZZ8VT` → `B0D7FXLN88`, motn-21275: `B0C8TJXY22` → `B0C8TJFQ8J`), 3 Termine kommen neu (motn-144533, -146233, -146210). Mängel (`data/maengel.json`, offen): `sprachurteil-offen` 181 → 130 (51 behoben), neu 5 (Hell Mode 185262: `fsk`, `sprecher`, `termin-fehlt-laufend`; `sprecher` für 102350 und 184591), `prime-kanal` gibt es dort nicht als Art; gezählt wird wie oben in `dub-confirmed.yaml`. Meldungen (`news.json`): 9 neu, 7 weggefallen. Neu mit Bautag 18.11. (Prime, „Jetzt auch auf Deutsch“): Aesthetica of a Rogue Hero 13161, Samurai Girls 8277. Neu mit älterem Datum: No Game No Life 19815 und Z wie Zorro 3010 (Joyn 06.11.), I Parry Everything! 170695 (ADN 28.10.), Bibliophile Princess 144533 (Prime 19.10.), Attack on Titan 16498, Oshi no Ko 150672, Kuroko’s Basketball Staffel 1 11771 (Prime 28./29.09.). Weggefallen: Yu-Gi-Oh! 481 und Jujutsu Kaisen 113415 (Disney+ „angekündigt“ 28.09.), fünf Crunchyroll-Meldungen vom 26.09. (171110, 195600, 190569, 153288, 107693). Ursache: der Deckel von 400 Einträgen (`HOECHSTENS`, `pipeline/lib/news-obergrenze.ts`; vorher 410, nachher 411 Einträge, ältestes Datum gleich 27.06.): die neuen Einträge vom 28.09. an verdrängen die ältesten nicht ausgenommenen vom 26./28.09.; das Datum der älteren neuen kommt aus `news-historie.json` (`zuerst.anbieter:<titel>:<anbieter>`, z. B. 3010 Joyn 06.11.), weil die Titel jetzt als deutsch belegt gelten.

## Block 11, Rest: sechs aniverse-Titel nach der Staffelregel (18.11.2026, mit Netz)

- **Methode:** Anime2You-Suche und Monatsartikel (`tools/anime2you-suche.mjs suche|artikel`), jedes Zitat vor dem Eintragen mit `pruefe <AniList-ID> --zitat "<Satz>"` gehalten; eingetragen nur an Zeilen mit Urteil „passt“ und Kanal-Titel-Note (Zählbasis `data/dub-confirmed.yaml`, `platform: primevideo`).
- **Belegt (7 Zeilen, 3 Titel):** 1469 Monster Rancher (Adresse B0CVLG57S5 „laut Adresse Staffel 2“, Anime2You 26.06.2024, zweite Staffel auf Deutsch), 1840 Familiar of Zero (B0B8PXXV17, Staffel 3, Anime2You 29.05.2024), 2569 Das Dschungelbuch (4 Adressen, 26 Folgen je Adresse, Zitat nennt die 52-teilige Serie von 1989 ohne Staffel: Anime2You 30.03.2022).
- **Nachgetragen (18.11.2026, Kanal/Abo-PR):** 481 Yu-Gi-Oh!: Das Staffel-4-Zitat (Anime2You 26.06.2024) steht an B07FB4D9KM („laut Adresse Staffel 4“); `ersetztBeleg`/`vergleicheBelege` (`pipeline/lib/staerkste-seite.ts`) zählen Kanal- und Abo-Ausgabe seitdem getrennt, 481 behält beide Prime-Wege. **Nicht belegt:** 1614 Super Kickers 2006: Zitat „dritte Staffel“ (Anime2You 23.02.2022) passt nur zur Prime-Abo-Adresse B0DNC57YWT; die Kanal-Adressen haben keine Staffelangabe (`pruefe`: unbekannt). 20698 SNAFU TOO!: Anime2You nennt nur Staffel 1 (21.09.2022) und die dritte Staffel „Climax“; kein Artikel zur zweiten Staffel gefunden, die Adresse der Zeile trägt „Staffel 1“.
- **Bau-Vergleich** (`tools/bau-vergleich.mjs`, ohne `--katalog`): siehe PR-Beschreibung.

## Block 11: Warnung „Mängel neu“ vom Bestandsbau 18.11.2026 (06:59 UTC)

- **Ursache der Warnung:** Block 9b (#4156) setzte `deErstausgabe.synchro` für 19191 (GITS Arise Border 2) und 198369 (Detektiv Conan Film 29). Damit endet die Ausnahme `ohne-synchro` der Art `sprecher`, und 198369 zählt als `erstausgabe-ohne-weg` (165 → 166). Bei 5000003 (M.A.S.K.) standen `sprecher` und `termin-fehlt-laufend` erstmals im Register des 18.11. „neu“ steht nur im Bau, in dem der Mangel zuerst auftritt; der nächste Bau meldet dieselben Mängel nicht mehr, solange kein weiterer dazukommt (`pipeline/lib/maengel-register.ts`, `seit` aus der committeten Vorfassung).
- **Gemessen, kein Beleg gefunden; alle drei bleiben offen (Daten unverändert):**
  - **19191 `sprecher`:** Die deutsche Besetzung steht auf aniSearch 8303 (`data/anisearch-sprecher.json`, 34 Rollen, Abruf 12.10.2026), aber diese Kennung führt alle vier Border-Filme (17187, 19191, 19193, 19195). `sprecher-anisearch.ts` überspringt geteilte Kennungen („ihre Seite gehört der Reihe“); eine Aufteilung je Film belegt keine erlaubte Quelle (Synchronkartei untersagt, aniSearch nennt die Rollen nur für den Eintrag insgesamt). Die drei Geschwister tragen denselben offenen Mangel seit 16.11.
  - **198369 `sprecher`:** aniSearch 20864 (Abruf 12.10.2026) führt keine deutsche Besetzung (`de: []`); die Anime2You-Artikel 1030216 und 1020620 nennen keinen Sprecher. Ein neuer Abruf der Seite ist Sache des Sprecher-Sammlers (CI).
  - **198369 `erstausgabe-ohne-weg`:** Belegt ist der Kinostart 25.08.2026 (`data/curated/kino-2026.yaml`, deutsche und japanische Fassung, Anime2You 1030216), aber kein Disc- und kein Stream-Datum: Anime2You-Suche am 18.11.2026 („Gefallener Engel des Highways“, „Film 29 Blu-ray“, „Conan Film 29 Heimkino“, „Conan Film 29 Prime Video“) nennt nur Discs der Filme 1–28, Film 28 hat eine Disc-Meldung, Film 29 keine. `zaehleErstausgabeOhneWeg` zählt nur Disc-Termine als Weg; der vergangene Kino-Termin ist keiner. Ob ein vergangener Kinostart die Art schließen soll, ist eine Regeländerung (gleiche Klasse wie Eichhörnchen und Igel, Block 6). Wiedervorlage: sobald Anime2You eine Disc- oder Streaming-Meldung bringt (`node tools/anime2you-suche.mjs suche "Detektiv Conan Film 29"`).
  - **5000003 M.A.S.K. `sprecher`:** Eigentitel (`data/eigene-titel.yaml` nr 3, Prime-Kanal aniverse, TMDB tv/4961 nur fürs Plakat): kein AniList-Eintrag, kein aniSearch-Eintrag (`data/anisearch-slugs.json` führt kein „M.A.S.K.“, `anisearch-offen.json`: `ohne-mal`). Beide automatischen Sprecher-Quellen führen den Titel nicht, und `public/data/voices/` ist erzeugt, einen Handweg gibt es im Bau nicht. Synchronkartei untersagt. Nächster Schritt: Besetzung aus einer erlaubten Quelle (etwa Wikipedia de) braucht erst eine Handdatei samt Bauphase.
  - **5000003 `termin-fehlt-laufend`:** Eigentitel tragen kein `jpEnd`; die Serie (1985, 73 Folgen am 01.11. komplett bei aniverse) gilt deshalb als laufend ohne künftigen Termin. Lösung wäre ein optionales `jpEnd` in `eigene-titel.yaml` (Code in `pipeline/bau/eigene-titel.ts`, nicht Teil dieses Blocks). **Umgesetzt 22.11.2026:** `jpEnd` (JJJJ-MM-TT, mit `datenQuelle` Pflicht) im Eigentitel; M.A.S.K. = 1986-11-28 (Wikipedia-Infobox „Finale“, US-Erstausstrahlung). Die Serie endete 1986, also gibt es keinen künftigen Termin zu belegen; Wirkung auf `termin-fehlt-laufend` am nächsten Bestandsbau zu messen.

## Lösungskarte: Wege zu vollen Daten (21.11.2026)

Auftrag `maengel-wege-2111`, nur gemessen, nichts gebaut. Stand `main` 21.11.2026 (`data/maengel.json`, `stand` 2026-11-21). Gemessen an den committeten Sammlerdateien in `data/` (`tmdb-titles.json`, `justwatch-audio.json`, `anisearch.json`, `anisearch-eintraege.json`, `anisearch-sprecher.json`, `anisearch-folgen.json`, `tmdb-folgen.json`, `kitsu-folgen.json`, `tmdb-banner.json`, `cr-katalog-de.json`, `adn-catalog.json`, `wikidata-titel.json`) und an je einer Stichprobe bei AniList (3 Abfragen à ≤ 50 Kennungen) und de.wikipedia (13 Seiten). `data/cache/` (AniList-Rohdaten) lag in der Cloud-Sitzung nicht vor; AniList-Aussagen stammen deshalb aus der Live-Stichprobe. Messskripte im Scratchpad, nicht im Repo. Neue Quellen und verworfene: `quellen.md`, „Quellenprüfung für die Mängel-Lösungskarte“ (21.11.2026).

Titelklassen der offenen Mängel: AniList-Titel (Kennung < 5 Mio.), aniSearch-Zeilen (≥ 10 Mio., gebaut in `pipeline/bau/anisearch-titel.ts`), Eigentitel (5 Mio.).

**Wichtigster Befund:** Zwei Mängelarten liegen fast ganz an Daten, die schon im Repo stehen. `ergaenzeAnisearchTitel` baut aniSearch-Zeilen mit `genres: []` und ohne `runtimeMin`, obwohl `anisearch-eintraege.json` für sie `g` (Genre) und `min` (Laufzeit) trägt; und der Bau nimmt AniLists `duration` nicht als Laufzeit, obwohl `pipeline/lib/anilist.ts` sie holt (`runtimeMin` kommt nur aus `anisearch.json`). Zweiter Befund: AniList-Werte im Bestand sind teils veraltet (Wertung 22 von 50, Studio 9 von 40 heute bei AniList vorhanden, im Bestand leer) — das gehört zum Parallelauftrag `auto-arten-2111`.

### Je Mängelart

Spalte „gemessen“: offene Titel, für die der Weg heute einen Wert hätte. „Obergrenze“ heißt: Wert liegt vor, die Übernahme scheitert an einer bewussten Regel (geteilte Kennung, Staffelzählung), die erst zu prüfen ist.

**fsk (1.222 offen; 1.116 AniList, 104 aniSearch-Zeilen, 511 mit Synchro-Weg)**

| Weg | gemessen | Aufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| (a) JustWatch `altersangabe` | 13 (alle bei Titeln, deren TMDB-Kennung mehrere Titel teilen → `tmdbMehrdeutig`, zu Recht verworfen); 1.023 offene haben `ohneTreffer` | — | — | ausgeschöpft |
| (a) TMDB `fsk` | dieselben 13 (geteilte Kennung: Mehrteiler Sailor Moon Eternal, Psycho-Pass SS, Code Geass Akito) | S | niedrig | Handzeilen oder Regel „alle Teile einer TMDB-Sammelkennung tragen denselben Wert → übernehmen“; 13 |
| (a) ADN `age` | 10 (keine FSK-Stufe, nur Hinweis) | — | — | nein |
| (c) Ableitung aus dem Franchise, gleiches Format, nur Freigaben (nicht `fskQuelle`), nur wenn alle Geschwister denselben Wert haben | **359** (29 %); Gegenprobe Leave-one-out an 397 Titeln mit Freigabe: 94,0 % richtig, 12 zu niedrig, 12 zu hoch | S–M | mittel (3 % zu niedrig) | **ja, gekennzeichnet** als `fskQuelle: 'franchise'` („≈ ab 12, wie die anderen Teile“), Rang hinter Freigabe und JustWatch. Ohne Formatbedingung 548 Titel, aber nur 88,4 % richtig — verworfen |
| (b) FSK-Datenbank | Hochrechnung 08.10.: ~800 der damals 1.683 | M | Recht | nur mit schriftlicher Zustimmung der FSK (Impressum); Abruf am 08.10. von Daniel eingestellt. Anfrage an die FSK ist der einzige Weg zum großen Rest |
| (b) OFDb, schnittberichte.com, bluray-disc.de | nicht messbar (Hosts in der Cloud-Sitzung gesperrt) | ? | ? | Prüfauftrag von einer Sitzung mit Netz (robots, AGB, Disc-FSK je Titel) |

Rest nach (a)+(c): ~850, überwiegend Disc-/TV-Altbestand (1.022 der 1.222 haben `deErstausgabe`) — ohne FSK-Datenbank oder Disc-Datenbank nicht schließbar.

**sprecher (370 offen; 158 mit Synchro-Stream, 212 nur mit Erstausgabe)**

| Weg | gemessen | Aufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| (a) aniSearch-Sprecher | 36 mit deutscher Besetzung, alle an aniSearch-Kennungen, die mehrere Titel führen (Bündel, z. B. 6300, 8303) — zu Recht nicht zugeordnet; 332 mit leerer deutscher Liste | — | — | ausgeschöpft |
| (c) Bündel-Besetzung an alle Teile, gekennzeichnet | 36 | S | mittel (Besetzung je Teil kann abweichen) | nur als Hand-Entscheidung je Bündel |
| (b) de.wikipedia, Abschnitt „Synchronisation“ | Stichprobe 8 Synchro-Titel: 4 mit passender Seite und Sprechertabelle (Yū Yū Hakusho, Baki, Ron Kamonohashi, Ranma ½), 2 Fehltreffer der Suche, 2 ohne Seite; hochgerechnet ~80 der 158, unbekannt für die 212 Altfälle | M–L (Tabellenparser, Staffel-Zuordnung, Attribution CC BY-SA) | mittel | **ja, als neue Quelle mit Handzuordnung Seite→Titel** |
| (b) Deutsche Synchronkartei | — | — | Recht | nein (untersagt, 11.08.2026) |
| (b) synchrondatenbank.de | — | — | Recht | nein (frei nur über 30 Jahre) |

**banner (310 offen)**

| Weg | gemessen | Aufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| (a) `tmdb-banner.json` | 6 mit Bild, alle geteilte TMDB-Kennung | — | — | nein |
| (c) Banner eines anderen Franchise-Teils | **242** (78 %) | S | niedrig (Schmuckbild, Wirkung 1) | **ja**, nur Titel mit Franchise, Teil mit eigenem Banner gleichen Formats zuerst |
| Rest | 68 | — | — | Ausnahme „kein-banner-bekannt“ (22.11.2026): 29 mit `null` in `data/tmdb-banner.json` und ohne Banner im Franchise; 39 bleiben offen (38 nie bei TMDB gesucht, 1 mit TMDB-Bild ohne Übernahme) |

**laufzeit (307 offen; 146 AniList, 158 aniSearch-Zeilen, 3 Eigentitel)**

| Weg | gemessen | Aufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| (a) `anisearch-eintraege.json` `min` für aniSearch-Zeilen | **155** von 158; Gegenprobe: 17 von 17 gleich `runtimeMin` | S (eine Zeile in `ergaenzeAnisearchTitel`) | sehr niedrig | **ja, zuerst** |
| (a) AniList `duration` als Rückfall | **50 von 50** Stichprobe haben einen Wert → ~146; Gegenprobe an 50 Titeln mit aniSearch-Laufzeit: 44 auf ±2 min gleich, 6 bis 6 min kürzer | S | niedrig | **ja**, nur wo aniSearch nichts hat |
| (c) Franchise | Leave-one-out 48,5 % richtig | — | hoch | nein |

Erwartet: ~301 von 307.

**folgentitel (294 offen; 97 mit Synchro-Weg; nur deutsche Titel zählen, F57 vom 24.10.2026)**

| Weg | gemessen | Aufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| (a) aniSearch-Folgen `de` | volle Liste 23, teilweise 98 | M | mittel | Prüfauftrag: warum übernimmt die Stufe sie nicht (Bündel? Nummernversatz?) |
| (a) TMDB-Folgen (deutsche Namen ohne „Folge n“) | volle Liste ≤ 33 (Obergrenze, Staffelzuordnung nicht geprüft) | M | mittel | zusammen mit aniSearch: **bis 53 Titel** voll; gleicher Prüfauftrag |
| (a) Kitsu | 65 voll, aber englisch | — | — | nein (F57) |
| (b) de.wikipedia Episodenlisten (`fetch-wikipedia-folgen`, bisher wenige Titel) | Stichprobe 5 Synchro-Titel: 2–3 mit Episodenliste | M | niedrig | ja, Titelliste des vorhandenen Abrufs auf die 97 Synchro-Titel erweitern |
| (b) fernsehserien.de | — | — | Recht | nur mit Genehmigung (Anfrage seit 12.11. offen) |

**Rang 8, Ursachen gemessen und geschlossen (22.11.2026, Auftrag `folgentitel-tmdb-2211`, TMDB erreichbar, HTTP 200):** Nach Abzug der Platzhalter hatten 9 der 294 offenen Titel eine volle aniSearch-Liste und 26 eine TMDB-Liste mit mehr Titeln als die Datei (nicht 53); viele „volle" aniSearch-Listen bestehen aus Platzhaltern („Folge 1": 20875, 10570, 11328, 12586), die kein Titel sind. Geschlossen (294 → 283, Simulation mit den echten Bau-Funktionen über alle Titel):
- **Filter** (9 Titel: 1822, 2221, 2568, 2572, 4083, 11307, 126438, 126830, 189046): `erschieneneFolgen` schnitt die Liste bei der höchsten datierten Nummer ab, aniSearch datiert bei alten Serien oft nur die erste Folge (126438: 1 von 73). Jetzt gilt bei Ende vor heute die Folgenzahl als Grenze (`endeNummer`).
- **Nummern** (Kickers 3053, T・P Bon 169930): `luecke()` sah eine Liste ohne fehlende Titel, aber mit weniger Zeilen als Folgen (23 von 26, 12 von 24) als vollständig, und `mitCrTiteln` füllt nur vorhandene Zeilen. Neu: `verlaengereBisFolgenzahl`, nur wenn die schon benannten Folgen zu ≥ 80 % mit TMDB übereinstimmen. T・P Bon liegt bei TMDB in zwei Staffeln (12 + 12): Staffelsumme gilt nur mit drei benannten Folgen als Gegenprobe.
- **Staffelzuordnung** (10004750 Es war einmal … Amerika): einzige TMDB-Staffel, Name und Folgenzahl gleich, Beginnjahr 1991 gegen 1992: ±1 genügt bei einziger Staffel.
- **Bündel:** keiner der 294 hängt an einer geteilten aniSearch-Seite; Ursache entfällt.
- **Offen, nicht gewinnbar:** AniList zählt eine Folge mehr als aniSearch/TMDB (K-On! 13 vs 12, Spice and Wolf, Fate/Stay Night UBW, Tales of Zestiria, Highschool D×D Hero …; Folgenzahl-Frage, keine Titel); laufende Serien (Detective Is Already Dead S2, Iruma-kun S4: die Liste führt nur Erschienenes); TMDB-Titel gleich dem englischen (YooHoo, Burn the Witch, Pacific Rim: The Black); Kurzformate unter sechs Folgen (Oni 10020607, Strike Witches OVA); Reporter Blues (TMDB 52 gegen unsere 26); Pokémon/Yu-Gi-Oh! GX (1 bzw. 6 Titel unübersetzt).
- **Brauchte eine Sammleränderung:** Es war einmal … Die Entdeckung unserer Welt (10005217) und … Entdecker und Erfinder (10005293): TMDB-Treffer ist richtig (Gegenprobe: Originalname „Il était une fois… les Explorateurs" bzw. „les Découvreurs" gleich unserem Romaji), nur der deutsche TMDB-Name weicht ab und sperrt den Namensabgleich. Der Folgen-Abruf müsste `original_name` mitschreiben.

**Rang 10b gemessen (22.11.2026, Auftrag `folgentitel-wiki-2211`): de.wikipedia-Episodenlisten für die Synchro-Titel mit offenem `folgentitel` bringen praktisch nichts.** Zählbasis: 92 Titel mit `streams[].dub` und weniger benannten Folgen als `episodes` (Format ≠ MOVIE, noch nicht in `wikipedia-folgen.json`), je Titel die festen Seitennamen des Abrufs (`<Name>/Episodenliste`, `<Name> (Anime)/Episodenliste`, `<Name>`, `<Name> (Anime)` für `titleDe`/`titleEn`/`titleRomaji`) über `/wiki/<Seite>?action=raw`, 1 s Abstand:
- **Ein** Treffer mit voller deutscher Liste: 10004749 Es war einmal … der Mensch (Seite „Es war einmal … der Mensch“, 26 von 26 Folgen, ohne deutsche Erstausstrahlung). Zwei Titel (21665, 102498) blieben mit Netzfehler offen.
- Von Hand geprobte Seitennamen: „Miraculous – Geschichten von Ladybug und Cat Noir/Episodenliste“ (183 Folgen, Gesamtliste über alle Staffeln, unser 10011124 hat 26), „Mushoku Tensei/Episodenliste“ (48, S1+S2 in einer Liste, unser 146065 hat 13), „Kusuriya no Hitorigoto/Episodenliste“ (48 Zeilen, aber japanische Titel statt deutscher). Eine Gesamtliste an einen Staffeltitel zu hängen ist das Staffelstart-Problem (`firstEpisodeNumber`), kein Gewinn. Seiten ohne lesbare Liste (Parser findet 0): K-On!, Yu-Gi-Oh! GX/5D’s, Bleach, Pokémon, Pac-Man.
- **Selbst der eine Treffer senkt `folgentitel` nicht:** `data/wikipedia-folgen.json` liest der Bau nur für Nummer und `ead` (`deutscheFolgen`, `ohneWikiVersatz`, TV-Termine, Erstausgabe); der Titel `dt` fließt nicht in `folgen/<id>.json`. Wirkung würde erst eine neue Stufe in `folgentitel-stufen.ts` bringen (Wikipedia-`dt` als Quelle, Gegenprobe gegen die Folgenzahl).
- Folgerung: Rang 10b nicht als Titellisten-Erweiterung bauen. Lohnt nur als eigene Stufe mit Seitenzuordnung je Titel von Hand (`id → Seite`) und Prüfung „Liste deckt genau die Folgenzahl dieses Titels“; erwartet ≤ 1–3 Titel von 294.

**genre (173 offen; 158 aniSearch-Zeilen, 12 AniList, 3 Eigentitel)**

| Weg | gemessen | Aufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| (a) `anisearch-eintraege.json` `g` | **131** von 158 | S (Zuordnungstabelle von 21 deutschen aniSearch-Genres auf AniList-Genres, z. B. „Actionkomödie“ → Action + Comedy, „Unbestimmt“ → nichts) | niedrig | **ja** |
| (a) TMDB `genreIds` | 75 (überschneidet sich) | S | mittel (TMDB-Genres grob: „Animation“) | nur Rückfall |
| AniList | 0 von 12 haben heute ein Genre | — | — | Ausnahme |
| (c) Franchise | 16,3 % gleich | — | — | nein |

**Genre-Rest, TMDB-Rückfall (22.11.2026, Auftrag genre-rest-2211):** `bau/genre-aus-tmdb.ts` (Phase `11-wege-abschluss`) setzt für Titel ohne Genre aus AniList/aniSearch die Genres aus `genreIds` in `data/tmdb-titles.json` (Tabelle `TMDB_GENRE`, nur Animation-Treffer, mehrdeutige Zuordnungen nie) und kennzeichnet sie mit `genreQuelle: 'tmdb'` (Muster `fskQuelle`). Gemessen am committeten Datensatz: 51 offen → 41; 3 von 14 AniList/eigenen, 6 von 28 „g leer“, 1 von 5 „Ganbatte“, 0 von 4 „Unbestimmt“ (TMDB nennt dort nur Animation/Familie/Doku). Der Rest von 41 ist ohne Quelle nicht füllbar (Ausnahme, nicht raten). AniList-Gegenprobe 22.11.: 16570, 135255, 10282 haben dort `genres: []`.

**wertung (108 offen; 50 AniList, 55 aniSearch-Zeilen, 3 Eigentitel)**

| Weg | gemessen | Aufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| (a) AniList neu holen (`averageScore`) | 22 von 50 haben heute eine | S (Cache-Frische, Auftrag `auto-arten-2111`) | niedrig | ja |
| (a) AniList `meanScore` als Rückfall | 48 von 50 | S | mittel (weniger Stimmen; kennzeichnen) | ja, wenn eine Mindestzahl Stimmen gilt (Feld `stats.scoreDistribution`); **gebaut 22.11.2026** (Schwelle 10 Stimmen, `scoreQuelle: 'anilist'`, [quellen.md](quellen.md) „Bewertung“); wirkt, sobald der Zwischenspeicher `meanScore`/`stats` trägt (Rang 7b) |
| aniSearch-Zeilen | kein erlaubter Weg (Wertung nur auf der Seite) | — | — | Ausnahme „ohne-anilist“ (55) |

**studio (105 offen; 40 AniList, 62 aniSearch-Zeilen, 3 Eigentitel)**

| Weg | gemessen | Aufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| (a) AniList neu holen | 9 von 40 | S | niedrig | ja (`auto-arten-2111`); **gebaut 22.11.2026 (Rang 7b)**: `lib/anilist-mangel.ts`, `data:fetch` holt einen abgeschlossenen Titel ohne Wertung oder ohne Studio trotz Cache neu (Stempel `abgerufen`, frühestens alle 2 Tage, je Lauf höchstens 100 MAL-Weg / 10 Kennungs-Weg = rund 2 Blöcke + 10 Einzelabrufe stündlich, AniList erlaubt 90 je Minute; älteste zuerst, damit der Rest reihum drankommt) |
| (a) aniSearch `st` / `info.studios` | 0 (bei allen 62 leer) | — | — | — |
| (c) Franchise | 76,6 % gleich | — | mittel | nein |
| Rest | ~93 | — | — | Ausnahme „quelle-ohne-studio“ |

**handlung-de (73 offen; 54 ohne Weg, 16 mit Synchro)**

| Weg | gemessen | Aufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| (a) aniSearch | 0 (41 Einträge ohne `descriptionDe`) | — | — | — |
| (a) TMDB `overviewDe` | 4 (geteilte Kennung) | — | — | nein |
| (a) Crunchyroll-Katalog über die Weg-Adresse | 2 | S | niedrig | ja, Rückfall |
| Hand (`handlung-eigen.yaml`) | 16 Synchro-Titel | M | niedrig | ja |

**kein-weg (204) und erstausgabe-ohne-weg (174; alle 174 auch in kein-weg)**

| Weg | gemessen | Aufwand | Risiko | Empfehlung |
|---|---|---|---|---|
| (a) JustWatch, TMDB-Angebote, CR-, ADN-Katalog | JW-Stream 2, JW-Kauf 1, TMDB-Angebote 4, CR 0, ADN 1 | — | — | nichts zu holen |
| (c) Regel: historische Erstausgabe | 150 ohne Publisher, Erstausgabe 1950–2009: 87 | — | — | **Entschieden 21.11.2026 (F152): Ausnahme „historisch“ verworfen.** Die Mängel bleiben Mängel und zählen in die Summe; `node tools/maengel.mjs` weist sie getrennt aus (Erstausgabe ≤ 2020, ab 2021, ohne Jahr), `--top` stellt ≤ 2020 bei gleicher Wirkung hinter neuere (Rang 9) |
| Hand | 17 mit Streamer als Publisher (Netflix 12, Crunchyroll 3, Amazon 2) — wahrscheinlich ausgelaufen | S | niedrig | belegtes „nicht mehr verfügbar“ setzen. **Umgesetzt 22.11.2026 (Ausnahme `belegtes-nein`, bei `kein-weg` und `erstausgabe-ohne-weg`):** Ist der Verlag der Erstausgabe selbst der Anbieter und verneint ein Handbeleg `available: false` ihn dort (nach dem Erstausgabe-Tag), ist es kein offener Mangel. Belegt sind 2 von 16 gefundenen: Glitter Force Doki Doki (Netflix, Handbeleg 22.08.; JustWatch-Treffer ohne Angebot, MOTN ohne Dienst) und Kaguya-sama Ishigami (Crunchyroll-DE-Katalog 16.09.). Die übrigen 14 bleiben offen: JustWatch `ohneTreffer` und fehlender MOTN-Eintrag sind Nichtauskunft, Netflix-Serienseiten sind gesperrt |

**sprachurteil-offen (59; 52 Prime)**: (a) JustWatch-Tonspur `de` bei 33, aniSearch „Deutsch, synchronisiert“ bei 48, zusammen 54 — beides nur Hinweis; Weg: Prüfliste nach diesen Hinweisen sortieren, Handbelege (`synchro-belegen`). **synchro-schwach (66, alle Prime)**: Hinweise nur bei 10; Anime2You-Belegsuche. **titel-de (32)**: TMDB-`nameDe` bei 18, aber fast alle über geteilte Kennung falsch zugeordnet, Wikidata schon gefragt; Hand. **folgenzahl-widerspruch (19)**: Hand.

### Rangfolge (geschlossene Mängel je Aufwand)

| Rang | Maßnahme | Art | schließt (gemessen) | Aufwand |
|---|---|---|---|---|
| 1 | aniSearch-Zeilen: `min` → `runtimeMin` | laufzeit | 155 | S |
| 2 | AniList `duration` als Laufzeit-Rückfall | laufzeit | ~146 | S |
| 3 | Banner aus dem Franchise | banner | 242 | S |
| 4 | aniSearch-Zeilen: `g` → Genres (Zuordnungstabelle) | genre | 131 | S |
| 5 | FSK aus dem Franchise, gleiches Format, gekennzeichnet | fsk | 359 | S–M (umgesetzt 22.11.2026: `pipeline/bau/11-2-1-fsk-franchise.ts`, `fskQuelle: 'franchise'`, Anzeige „≈ FSK n, wie die anderen Teile“; Messung 357 Titel, Leave-one-out 94,0 %) |
| 6 | Ausnahmen mit Grund (aniSearch-Zeilen ohne Wertung/Studio, kein Banner) | wertung, studio, banner | 55 + ~93 + 68 | S (Regeln) |
| 7 | AniList-Frische + `meanScore`-Rückfall | wertung, studio | ~48 + 9 | S (mit `auto-arten-2111`) |
| 8 | Folgentitel: aniSearch-/TMDB-Stufe prüfen, warum volle Listen liegen bleiben | folgentitel | bis 53 | M |
| 9 | Erstausgabe ≤ 2020 getrennt zählen und nachrangig befüllen (Entscheidung F152, 21.11.2026; keine Ausnahme, die Mängel zählen weiter). Jahr = `deErstausgabe.von`; ohne Jahr gilt als nicht alt. Gemessen 22.11.2026: kein-weg 112 / 28 / 64 (≤ 2020 / ab 2021 / ohne Jahr), erstausgabe-ohne-weg 110 / 28 / 36 | kein-weg, erstausgabe | 0 (nur Reihenfolge) | erledigt (`tools/maengel.mjs`) |
| 10 | de.wikipedia: Sprecher und Episodenlisten | sprecher, folgentitel | ~80 + ~40 (Hochrechnung aus 8 bzw. 5 Proben) | M–L |
| 11 | Handarbeit (Sprachurteil, Handlung, Titel, Folgenzahl, Synchro-schwach) | 5 Arten | 59 + 16 + 32 + 19 + 66 | M je Block |
| 12 | Anfrage an die FSK (schriftliche Zustimmung) | fsk | ~800 (Hochrechnung 08.10.) | Mail, Ausgang offen |

Ziel 25.11. „volle Daten“: Mit Rang 1–7 sinken die Wirkung-1-Arten (banner, laufzeit, genre, wertung, studio) fast auf null; FSK bleibt mit ~850 der große Rest und ist ohne Rang 12 nicht schließbar. Sprecher bleibt ohne Rang 10 bei ~330.

## Neue Art `bild-fremdsprachig` (21.11.2026, Auftrag bild-sprache-2111)

Anlass: Daniel sah auf vielen Covern japanische Schrift. Ursache: `lib/tmdb-plakat.ts` wählte japanisch vor „ohne Sprache“ (der Test erzwang es), obwohl `datensatz.md` seit 27.10.2026 die umgekehrte Folge beschrieb; das Banner (`lib/tmdb-banner.ts`) nahm japanisch sogar vor englisch und deutsch. Neue Folge: Plakat de → en → ohne Sprache → ja; Banner ohne Sprache → de → en → ja.

**Warum das Register es nicht sah:** `cover` und `banner` zählen nur das *Fehlen* eines Bildes. Ein vorhandenes, aber unlesbares Bild war für jede Wache „erledigt“. Lehre: ein Feld, das Besucher lesen müssen, braucht neben „fehlt“ auch „unbrauchbar“.

**Regel** (`pipeline/lib/bild-sprache.ts`, `fremdeBilder`; Gruppe `schwach`, Wirkung 2, `wer` `auto:tmdb-poster`): ein Titel zählt, wenn sein Cover das gewählte TMDB-Plakat mit `l: "ja"` ist (`data/tmdb-poster.json`) oder Cover bzw. Banner von AniList kommen (Key Visual). Ausnahme `keine-lesbare-fassung`, wenn *jedes* dieser Bilder nachweislich ohne Alternative ist: japanisches Plakat mit Beleg `nurJa: true` (setzt `plakatEintrag` in `lib/tmdb-plakat-suche.ts`, wenn `waehlePlakat` japanisch nahm, weil kein deutsches, englisches oder textloses Hochformat da war; ältere Einträge haben ihn nicht und bleiben offen bis zum Neuabruf — kein Stichtag, Prüfer-Befund PR 4510), TMDB-Eintrag `null` (kein Bild in ja/ohne/de/en) oder geteilter Film (`ohneGeteilteFilme`, das Bild gehört keinem Titel). Die Sprache eines TMDB-Banners speichert `tmdb-banner.json` nicht; gezählt wird beim Banner nur die Herkunft AniList.

**Gemessen 21.11.2026** (`public/data/titles.json`, 2.926 Titel; `data/tmdb-poster.json`, `data/tmdb-banner.json` am Stand f6ab4407): 544 Titel offen, 305 Ausnahme (geteilte Filme nur nach der Film-Regel, die Bau-Menge (`GETEILTE_FILME_DATEI` im Cache) lag nicht vor; im Bau bis zu 3 weniger offen). Darin: 335 Cover mit japanischem TMDB-Plakat (alle aus der alten Wahl, also offen), 491 AniList-Cover (470 TMDB `null`, 15 geteilte Filme, 3 mit TMDB-Eintrag, den der Bau verwirft – vermutlich gesperrte Kurzform-Treffer, 3 nie gesucht), 395 AniList-Banner (27 TMDB `null`, 356 ohne TMDB-Zuordnung, 12 mit Eintrag). Deutsch oder englisch hätte keines der 335 (die alte Folge nahm beide vor ja); ob ein textloses existiert, sagt erst ein neuer Abruf (`tmdb-poster.json` speichert nur das gewählte Bild).

**Abbau:** `daten-auf-abruf.yml` mit `lauf=data:tmdb-poster` und `alle=true` erneuert alle 2.243 Zuordnungen (je ein `/images`-Abruf für Plakat und Banner, ≈ 4.500 Abrufe, ≈ 10 min) und damit 98 der 335 japanischen Cover. Die übrigen 237 stammen aus der Namenssuche (`plakatSuche`, ohne gespeicherte TMDB-Kennung) und werden erst neu gewählt, wenn ihr Eintrag nach 150 Tagen fällt (Abrufe 07.–26.10.2026, also März 2027); schneller nur mit einem Neusuchlauf für Einträge mit `l: "ja"` (≤ 5 Abrufe je Titel).

## Banner aus der Reihe (Rang 3, 22.11.2026)

`pipeline/bau/banner-franchise.ts` (läuft nach `setzeProduktFelder` in `11-wege-abschluss.ts`): Ein Titel ohne Banner übernimmt das eigene Banner eines anderen Teils derselben `franchiseId` — gleiches Format zuerst, dann nächstes `jpYear`, dann kleinere Kennung; Wer allein in der Reihe steht oder keinen Spender findet, bleibt leer; der Reihenkopf zählt als Mitglied. `bannerVon` läuft an der Ausgabegrenze wie `franchiseId` auf die eigene Kennung (`lib/ausgabe-kennung.ts`). Gekennzeichnet mit `bannerVon` (Kennung des Spenders, Feld in `titles.json`, nur bei Übernahme). Der Mangel `banner` zählt übernommene Bilder als erfüllt (Schmuckbild, Wirkung 1; Lösungskarte „ja“); `bild-fremdsprachig` zählt ein übernommenes AniList-Banner nicht doppelt. Probe am Stand 21.11.2026: 310 → 68 offen (242 übernommen, 105 davon mit Formatwechsel). Wächter: `pipeline/check-banner-franchise.ts`.
Patch Notes: Entwurf im Vorrat (`data/patchnotes/vorrat/banner-aus-der-reihe.yaml`), frei nach dem Bestandsbau.

## Mängel-Stillstand 22.11.2026 (Auftrag maengel-stillstand-2211)

Bezug 19.11., gemessen mit `stillstandMessen` an `data/maengel.json` (Stichprobe je Art aus den offenen Zeilen, Titel in `public/data/titles.json`):
- **folgenzahl 0→1 (M.A.S.K., 5000003):** Eigentitel (`data/eigene-titel.yaml`) bekam am 21.11. Studio/Jahr/Laufzeit mit `datenQuelle`, aber nie eine Folgenzahl (`folgen: 73` ist nur der Katalogumfang der Ankündigung, kein `episodes`). Geschlossen: neues Feld `episodes` (mit `datenQuelle` Pflicht), M.A.S.K. = 75 (Wikipedia-Infobox „Episoden = 75“, TMDB ebenso). Nebenwirkung: `folgentitel` kann um 1 steigen (keine Folgenliste für 5000003), `folgenzahl-widerspruch` nicht (73 < 75).
- **studio 105→104 (auto:anilist):** Schwelle ist `max(1, 1 %)` = 2 Mängel in drei Tage; der Abbau von 1 reicht nicht. Die offenen sind AniList-Einträge ohne Studio (Tamala 2010, Cencoroll, Techno Police 21C u. a., meist koreanische/japanische Filme und alte OVA), das aniSearch-Archiv liefert für sie nichts (`ergaenzeStudiosAusArchiv`). Weder AniList-Lauf noch Code schließen sie; es gibt keinen Handweg für AniList-Titel (nur Eigentitel). Vorschlag: Art auf `hand:` oder Ausnahme „quelle-ohne-studio“ (siehe Lösungskarte Rang 6).
- **handlung-de 72→73 (auto:anisearch):** Die offenen Titel (Pokémon Ranger, Moero Arthur, Hajime Ningen Gon, …) haben bei aniSearch keinen deutschen Text; ein Sammlerlauf holt nichts. Einziger Weg: `data/handlung-eigen.yaml` (Hand, zwei Quellfamilien) für Titel mit Synchro — Vorschlag: Art auf `hand:synchro-belegen` umstellen.
  - **Nachtrag 22.11.2026 (`stillstand-handlung-de-2211`):** Besitzer in `maengel-regeln.ts` jetzt `hand:handlung-eigen` (Test in `check-maengel-regeln.ts`); der Weg ist `data/handlung-eigen.yaml`, abgearbeitet in Bauer-Aufträgen mit Websuche (Queue, nicht Daniel). Die Stillstand-Warnung gilt nur für `auto:`-Arten und entfällt dafür; offen bleiben die übrigen Titel samt Restliste im PR #4596.
  - **Lehre (Prüfer-Review PR #4596, 22.11.2026):** Eine zweite Quellfamilie zählt nur, wenn die verlinkte Seite die Handlungsangaben selbst trägt (Name der Reihe reicht nicht), und eine Übersetzung der AniList-Beschreibung (Verlags-/Netflix-Klappentext) ist keine eigene Fassung; der 5-Wort-Abstand findet das nicht, weil er Sprachen nicht vergleicht. Aus der Cloud-Sitzung sind nur de.wikipedia.org und AniList per Node lesbar (en.wikipedia 403, übrige Hosts nicht auflösbar), `tools/handlung-ueberschneidung.mjs` scheitert dort am robots-Abruf; `WebSearch` liefert nur Zusammenfassungen, keinen Seitentext. Von 12 Entwürfen blieben 5 (de-Wikipedia trägt den Inhalt); Sailor Moon Eternal 1/2 als `reihe`. Die übrigen Titel brauchen Seitentext einer zweiten Quelle (lokaler Bauer mit freiem Netz oder Handrecherche).
- **weg-ohne-adresse 3→5 (auto:anbieterkalender):** Streams aus sicheren Terminen ohne Titelseite (`11-7`): Prime/Aniverse bei 27, 60, 1638; Prime ohne Kanal bei 142329 (zwei Prime-Adressen, mehrdeutig); RTL+ bei 170083 (Dragon Ball Daima, nicht in `rtlplus-katalog.json`, plus.rtl.de aus der Cloud nicht erreichbar). Adresse nur mit Beleg: Workflow für den RTL+-Katalog (`fetch-rtlplus-katalog`) bzw. Prime-Sammler mit Netz.

## Handweg Studio und Besitzer 22.11.2026 (Auftrag stillstand-studio-weg-2211)

- **Studio:** `data/studio-von-hand.yaml` (Kennung, 1–3 Studios in Bestandsschreibweise, https-Quellen; `lib/studio-von-hand.ts`, in `baueMeta` vor dem aniSearch-Archiv, ersetzt nie ein AniList-Studio; Test `check-studio-von-hand.ts`, Kennungen gegen `titles.json`). Untergrenze geprüft: `eigene-titel.yaml` gilt nur für Eigentitel, kein Override-Weg für AniList-Titel. Die Datei ist handgepflegt, gehört also nicht in `tools/quellen-liste.sh`. Gesetzt: 9 Titel (104 → 95 offen erwartet, nach dem Bestandsbau zu messen).
- **Ausnahme `quelle-ohne-studio` (Rang 6b, 22.11.2026):** Kennung ab `ANISEARCH_ID_BASIS` (10 Mio.) heißt: die Zeile entstand aus einem `anisearch-eintraege.json`-Eintrag (`studios: e.st ?? []`), ein leeres Studio ist dort also ein leeres `st` (und das Archiv `ergaenzeStudiosAusArchiv` fand auch nichts). AniList-Titel (< 5 Mio.) und Eigentitel bleiben offen. Gemessen an `public/data/titles.json` (2.926 Titel): 95 ohne Studio = 61 Ausnahme + 34 offen; alle 61 haben einen Eintrag mit leerem `st`.
- **Ohne Beleg (Suche 22.11.2026):** Tamala 2010 (Wikipedia widersprüchlich: Studio 4°C im Text, Kinétique im Infokasten), Leafie/Madang-Eul Naon Amtalg („Leafie A Hen into the Wild studio“, kein Studio gefunden), Enen no Shouboutai Mini Anime (LiveChart „Studio TBA“), Veldora Nikki 2 und Diablo Nikki (Eight Bit nur für Teil 1 belegt). Rest (~90, meist koreanische/chinesische Filme und aniSearch-Katalogtitel): Suchbegriff „<Titel> studio“ bei Wikipedia/MAL.
- **weg-ohne-adresse (5, unverändert):** keine Adresse eingetragen. Trinity Blood und Chrono Crusade zeigt die Suche nur auf primevideo.com-Seiten (Crunchyroll-Kanal, kein Beleg für Aniverse oder Deutsch), Peter Pan ohne Treffer, Demon Slayer 142329 hat zwei Prime-Adressen (Crunchyroll B0CH5FJ3RK, Aniverse B0G1BF9WCR), Dragon Ball Daima RTL+: keine `plus.rtl.de`-Adresse auffindbar (Abruf gesperrt; Handweg `data/rtlplus-adressen.yaml`).
- **Besitzer:** `studio` → `hand:studio-von-hand` (`REGELN`; die Stillstand-Warnung zählt nur `auto:`, der Stand der Rest-Studios steht deshalb in `data/maengel.json`; die 95 Rest-Titel arbeitet ein Bauer-Folgeauftrag „studio-rest“ ab, den der Dirigent in `stand.md` einträgt — `stand.md` liegt nicht im Repo, der Eintrag ist Sache des Dirigenten). `weg-ohne-adresse` bleibt `auto:anbieterkalender`: Ein Besitzername ohne Abarbeitungsweg hätte die Warnung nur verschwiegen (Prüfer-Auflage 3, 22.11.2026); die Warnung steht weiter, bis ein Auftrag die fünf Titel mit Beleg schließt.

## Neue Art `tv-sichtung-ohne-folge` (22.11.2026, Auftrag tv-folge-aus-quelle-2211)

- **Regel:** Ein Titel zählt offen, wenn eine seiner Sichtungen im Programmbestand (`data/tv-programm.json`) einen Folgentitel, aber keine Folgennummer trägt (`titelMitSichtungOhneFolge` in `pipeline/lib/maengel-tv-folge.ts`, Test `pipeline/check-maengel-tv-folge.ts`, Fall „Ein Lied im Nebel“, Pokémon Horizonte, 13.11.2026). Ohne Nummer keine Staffel; kein stiller Rest.
- **Gezählt wird über alle Sichtungen, nicht über das Bau-Fenster:** `sendungenAnhaengen` hängt dem Termin nur Sendungen ab gestern an (`08-news-tv.ts`); die Art hing zuerst an `Release.sendungen` und stand deshalb heute auf 0, und bei `auto:bau` ohne eigenen Bau-Weg hätte die Zahl mit dem Fenster geschwankt und wäre als Stillstand gemeldet worden. Jetzt hängt die Messung dieselben Folgenlisten (`folgenListen`) mit `gestern = 0000-00-00` an Kopien der TV-Termine; die Zahl hängt nur noch an Programmbestand, Folgenlisten und Terminen. Gemessen 22.11.2026 am echten Bestand: 242 Sichtungen ohne Nummer an 10 Titeln (895 Sichtungen, 875 mit TV-Termin); `maengel.json` bei lokalem Lauf: 10 offen. Die frühere Zahl „895 Sichtungen / 16 Titel“ war die ganze Historie gegen `wikipedia-folgen.json` allein gemessen, nicht gegen `folgenListen()`.
- **Die 10 Titel (Kennung, Sichtungen ohne Nummer):** Dororo 101347 (17), Eyeshield 21 15 (39), Yuna & Stitch 5027 (24), One Piece 21 (42), Super Wings 10012621 (100), Dragon Ball 223 (7), Yashahime 118399 (5), Pokémon Reisen 112153 (4), Pokémon Horizonte 158871 (2), Blade 6920 (2).
- **Ursachen (WebSearch):** Dragonball „Yamchu gegen Jacky Chun“: Schreibweise (Liste „Yamchu gegen Jackie Chun“, Folge 22). Super Wings „Kunterbunte Alpakas“: fehlt in der Wikipedia-Liste (moviepilot: Staffel 4, Folge 1). One Piece „Fish-Man Island Saga: Der Neuanfang - …“: Präfix und Satzzeichen, Liste „Der Neuanfang! Die Wiedervereinigung der Strohhüte!“. **Dororo und Eyeshield 21 haben im Bau eine Liste (TMDB, 24 bzw. 70 Folgen) und treffen trotzdem nicht:** Dororo: die Sendung nennt „Das Kapitel vom Dämonenschwert“ (so auch Joyn, Folge 1x04), die TMDB-Liste „Das Dämonenschwert“ (so Serienjunkies) — zwei deutsche Titelfassungen derselben Folge, kein Schreibfehler. Eyeshield 21: die Sendetitel („Halbzeit für die Bats“, „Die fehlende Flamme“) stehen in keiner gefundenen deutschen Liste (prisma.de hat nur Folgen 20/21 „Die Geheimwaffe der Sphinx“/„Fliegt, Devil Bats!“, moviepilot nur englische Titel), die TMDB-Titel („Lass uns American Football spielen!“) sind eine andere Fassung. Suchbegriffe: `Eyeshield 21 Episodenguide deutsch "Halbzeit für die Bats" "Die fehlende Flamme"`, `Dororo 2019 Episodenguide deutsch "Das Kapitel vom Dämonenschwert" "Das Dämonenschwert" Folge 4`. Beide Titel bleiben offen, bis eine Liste mit der Fassung des Senders vorliegt.
- **Staffel/Folge im Programm:** `plus.rtl.de/tv-programm` hat kein Staffel- oder Folgenfeld (gemessen 22.11.2026, `quellen.md`); „Folge N“ steht nur als Ersatz, wo ein Folgentitel fehlt. Eine Nummer entsteht nur über die Folgenliste.
- **Beleg der Prüfer-Runde 2 (22.11.2026):** Die Phase läuft im Prozesstest `check-maengel-bau-lauf.ts` mit einer Kulisse (`data/tv-programm.json`, Titel 18 mit TV-Termin und Sichtung ohne Treffer); erwartet `tv-sichtung-ohne-folge:18:offen`. Rot (Exit 1) mit: `tvOhneFolge: new Set()`, Programm `[]` statt der Sendungen, Fenster `'2026-11-21'` statt `'0000-00-00'`. Basisbeleg: ohne die Zeile in `REGELN` sind `check-maengel-tv-folge.ts` (2 ✖) und `check-maengel-bau-lauf.ts` (3 ✖) rot.

## Messungen schreiben in `data/` (22.11.2026, Lehre 216)

`npx tsx pipeline/check-qualitaet.ts` hängt eine Tageszeile an `data/qualitaet-verlauf.json`. Im Hauptordner gestartet, blockierte die Änderung danach `git pull --ff-only`. Messskripte, die nach `data/` schreiben, laufen deshalb nur in einem Worktree.

## Übersetzungsprobe und Hand-Stillstand 22.11.2026 (Lehre 219)

- **Übersetzungsprobe** (`tools/handlung-fakten/uebersetzung.ts`, aufgerufen von `handlung-ueberschneidung.mjs`): Eine Fassung, die den Klappentext übersetzt, teilt keine 5-Wort-Folge. Gemessen wird die längste gemeinsame Folge von 4-Zeichen-Stämmen (Namen, Zahlen, Verwandtes) als Anteil, nur bei Längenverhältnis 0,75–1,33. 24 eigene Texte gegen AniList: im Längenfenster höchstens 0,121; wörtliche Übersetzung von 101343: 0,175; Schwelle 0,145. **Dünn belegt (ein Übersetzungsfall)**; die Probe fängt nur nahe Übersetzungen, ersetzt keine Durchsicht. Netz: AniList hat Rate Limit (429 nach ~20 Abrufen, 2,5 s Pause einhalten).
- **Hand-Arten im Stillstand:** `stillstandMessenHand` meldet `hand:`-Arten ohne Abbau oder gestiegen mit Abstand 7 Tage (`STILLSTAND_TAGE_HAND`); die Kurzzeile trennt auto und hand, wenn beide stehen. Das gilt zugleich für `handlung-de` und `studio`, deren Besitzerwechsel zu `hand:` die Warnung vorher stumm schaltete (Einträge oben): sie melden jetzt nach 7 Tagen ohne Abbau.

## Wertung: Rest 108 erklärt und geschlossen (22.11.2026, Auftrag wertung-rest-2211)

Messung am selben Tag an den 108 Titeln ohne `score` (AniList-GraphQL, 25 je Anfrage; kein TMDB-Schlüssel in der Umgebung, TMDB-Stimmen nicht gemessen):

| Gruppe | Titel | Quelle | Ergebnis |
|---|---|---|---|
| AniList-Kennung (< 5 Mio.) | 50 | AniList ≥ 10 Stimmen | 48 mit Zahl (Schwelle 1/3/5/10 gleich, ≥ 20: 40), 2 ohne `averageScore`/`meanScore` |
| nur aniSearch (≥ 10 Mio.) | 55 | aniSearch-Seite 0–4 Stimmen (22 mal 0, 33 mal 1–4), kein AniList-Eintrag, keine `malId` | keine Quelle mit genug Stimmen |
| Eigentitel/Cartoon (5 Mio.) | 3 | TMDB ohne ≥ 10 Stimmen (`cartoons.ts`), keine aniSearch-ID | keine Quelle mit genug Stimmen |

Ursache des Stillstands: `fetch.ts` holte abgeschlossene Zwischenspeicher-Einträge nie neu, auch nicht ohne `stats`/`meanScore` (vor 22.11.2026); der Rückfall aus #4574 hatte nichts zu lesen. Fix: `eintragNochOffen` (`lib/anilist.ts`) holt Einträge ohne `stats` einmal neu (wie bei `countryOfOrigin`, 09.10.2026). Die 58 Titel ohne Quelle sind in der Regel `wertung` die Ausnahme `keine-quelle-mit-stimmen` (Kennung ≥ `EIGENE_ID_BASIS`). Erwartung nach dem nächsten Bestandsbau: wertung offen 108 → 2 (+ 58 Ausnahme). Beobachten: nächster Bestandsbau, dann nach einem Tag.

## wertung: die letzten 2 offenen sind Ankündigungen (23.11.2026)

Live gemessen (GraphQL, 23.11.2026): Fool Night (213457) und 2.5-jigen no Ririsa 2nd Season (185515) sind `NOT_YET_RELEASED`, `averageScore` und `meanScore` sind `null` (Fool Night hat 182 Stimmen in `scoreDistribution`, AniList veröffentlicht trotzdem keinen Wert). Kein Codefehler: `anilistWertungAus` braucht eine Zahl und rechnet nichts aus. Neue Ausnahme `noch-ohne-start` (`wertungNochOhneStart`, `pipeline/lib/maengel-regeln.ts`): kein Nicht-Disc-Termin begonnen, Jahr dieses Jahres oder leer, Ende nicht vorbei; sie endet mit dem Start von selbst, dann greift der Rückfall. Erwartung nach dem nächsten Bestandsbau: wertung offen 2 → 0 (+ 2 Ausnahme).

## Genre: Rest 41 erklärt (23.11.2026, Auftrag „Vorrat genre AniList“)

Gemessen an `public/data/titles.json` (41 ohne Genre): **30** aniSearch-Zeilen (Kennung ≥ 10 Mio., kein AniList-Eintrag; `g` leer 22, „Unbestimmt“ 4, „Ganbatte“ 4, TMDB-Rückfall ohne Treffer), **9** AniList-Titel (Filme, Musikvideos, Specials; AniList-GraphQL am 23.11. für alle 9 mit `genres: []`), **2** Eigentitel (5 Mio.; Handweg offen). Kein Titel verliert Genres an einer Bau-Stelle. Behoben: Ausnahme `quelle-ohne-genre` für Kennung ≥ `ANISEARCH_ID_BASIS` (wie `quelle-ohne-studio`): offen 41 → 11 (9 AniList + 2 Eigentitel), 30 Ausnahme. Die 9 bleiben offen, bis AniList Genres führt (Lauf holt neu); die 2 Eigentitel sind von Hand füllbar.

## folgentitel: warum TMDB keine deutschen Titel liefert (23.11.2026, Auftrag „Vorrat folgentitel TMDB“)

Stichprobe 20 von 284 offenen Titeln (Zufall, Startwert 4420), je Titel TMDB live abgefragt (`/tv/{id}?language=de-DE`, `/season/{n}` deutsch und englisch). Die Hochrechnung steht neben der **Volleinordnung aller 284** aus den committeten Dateien (`tmdb-titles.json`, `tmdb-folgen.json`, `tmdbFolgentitel`); beide stimmen im Rahmen der Stichprobe überein.

| Ursache | Stichprobe | alle 284 (gezählt) | Stelle / Befund |
|---|---|---|---|
| keine TMDB-Kennung | 8 | 110 (davon 54 OVA/Special/Film-Format, die der Bau ohnehin nicht nutzt) | `tmdb-titles.json` ohne Eintrag; Live-Suche liefert bei 6 von 8 nichts, bei Black Butler und Beyblade Burst Surge nur die Hauptserie (kein Treffer für den Titel selbst) |
| Kennung da, **nie abgerufen** | 6 | 93 (64 Serienformat ab 6 Folgen, 29 Format/Länge ausgeschlossen) | `fetch-tmdb-folgen.ts` rief nur Titel mit Anbieter oder Dub-Lücke ab (`waehleAbrufe`); Titel ohne beides nie. Simulation von 63 der 64 gegen TMDB live (5000003 ohne Folgendatei, nicht gerechnet): 3 Titel schließen den Mangel (Arjuna 812, Ghost in the Shell Arise 21056, Shaolin Wuzang 102501), Captain Future 2561 gewinnt 2 Folgen; die übrigen 59 haben bei TMDB nur „Folge N“, englische oder japanische Titel |
| TMDB ohne de-Titel (nur „Folge N“ oder gleich englisch) | 4 (Larva Island ×2, Pac-Man, Saiki K.) | 47 | live bestätigt: 0 deutsche Titel in 26 / 52 / 48 Folgen; nicht behebbar |
| echte Titel, Bauweg verwirft | 2 (Pokémon 527, Tales of Zestiria 21221) | 16 | Pokémon: 276 Folgen gegen 25 TMDB-Staffeln, keine Summe stimmt; Zestiria: AniList 13 Folgen gegen TMDB 12 + 13 (Folgenzahl-Frage); Einzelfälle, kein gemeinsamer Fehler |
| Stufe liefert, Liste trotzdem nicht voll | 0 | 17 | AniList zählt eine Folge mehr als TMDB u. Ä. (siehe Rang 8) |
| Abruf 404 | 0 | 1 | `tmdb-folgen-404.json` |

**Behoben:** Ursache „nie abgerufen“. `abrufLuecke` (`pipeline/lib/tmdb-folgen-luecke.ts`) wählt neben der Dub-Lücke jeden offenen Folgentitel (`unbenannteFolgen`), nur für Serienformat ab sechs Folgen (`fetch-tmdb-folgen.ts`, Aufruf von `waehleAbrufe`). Erwarteter Gewinn: 3 von 284 (1 %), wirksam erst nach dem nächsten TMDB-Lauf; einmalig etwa 64 × 7 Abrufe, danach hat jeder Titel einen Eintrag und fällt aus der Wahl.

**Nicht gewinnbar mit Code:** 110 ohne Kennung (Zuordnung wäre Raten; eine Kennung nur per Hand mit Beleg), 47 ohne deutsche Übersetzung bei TMDB.

## Stillstand-Auftrag 23.11.2026 (termin-geschaetzt-ohne-weg, weg-ohne-adresse)

- **termin-geschaetzt-ohne-weg (4):** Handbelege in `data/dub-confirmed.yaml` aus den Anime2You-Steckbriefen: 169969 Netflix (1066144, 01.11.: „12 (komplett) Sprache: Deutsch, Japanisch (UT) Stream: Netflix“; Netflix-Kennung 82662122 über die Websuche, englischer Titel aus demselben Artikel), 5000001 Joyn (Einzelseite joyn.de/filme/z-wie-zorro-der-film), 5000002 Joyn (nur die Mediathek aniverse, Einzelseite nicht gefunden). Beide Joyn-Belege und Netflix: Anbieter-Seite aus der Cloud nicht abrufbar (`joyn.de` nicht aufgelöst, netflix.com und amazon.de kein Abruf), Abruf lokal offen.
- **Rest:** Prime bei 5000001 (Weg vorhanden), 5000002 und 196144 (Snowball Earth, Anime2You 1060717: „Stream: Prime Video, Crunchyroll“, 13 komplett deutsch): keine amazon.de-Adresse auffindbar (Suche „Snowball Earth Prime Video Crunchyroll amazon.de“, „Zorros Geheimnis Prime Video aniverse“); der Termin selbst trägt (Quelle nennt Prime ausdrücklich), bleibt als geschätzt gekennzeichnet.
- **weg-ohne-adresse (5):** Klasse ist Absicht, kein Fehler im Sammler: `11-7-wege-aus-terminen.ts` baut bei sicherem Termin ohne Titelseite `url: ''` (Weg ohne Adresse). Adressen gibt es nur mit Beleg; Suche 23.11.2026 für Trinity Blood („Trinity Blood Aniverse Amazon Channel Prime Video“: nur Crunchyroll-Kanal-Seiten) und Dragon Ball Daima RTL+ („Dragon Ball Daima RTL+ plus.rtl.de“: nur Presse, keine plus.rtl.de-Seite) ohne Treffer; Chrono Crusade, Peter Pan und Demon Slayer (zwei Prime-Adressen, Kanal offen) unverändert. Lokal: `fetch-rtlplus-katalog` und Prime-Sammler mit Netz.

## weg-ohne-adresse, Suche 23.11.2026 (5 Titel, keine Adresse belegbar)

- **Herkunft:** `pipeline/bau/11-7-wege-aus-terminen.ts` baut bei sicherem Termin ohne Titelseite bewusst `url: ''`; kein Sammlerfehler. Ablage einer Hand-Adresse: Prime → `data/verweise-von-hand.yaml` (`anilistId`, `platform`, `url`, `beleg`, `belegtAm`, `kanal`; legt einen Weg an). RTL+ → `data/rtlplus-adressen.yaml` (`<anilistId>: <slug>-p_<id>`, ersetzt eine vorhandene Adresse). Offen: ob ein Eintrag in `verweise-von-hand.yaml` den vorhandenen Weg mit `url: ''` ersetzt oder daneben einen zweiten anlegt (`adressGleich('', url)` ist falsch); vor dem ersten Prime-Eintrag am Bau-Ergebnis messen.
- **Trinity Blood 27** (Suche „Trinity Blood Prime Video amazon.de gp/video/detail Aniverse“): primevideo.com-Seite `0NPXH3TJRZIPIXGZAUBU99ZZ0Y`, Crunchyroll-Kanal, 24 Folgen; weder amazon.de noch Aniverse noch Deutsch im Treffer → nicht eingetragen.
- **Chrono Crusade 60** („Chrono Crusade Prime Video amazon.de Aniverse Channel“): primevideo.com-Seite `0HCTGHLZ5TH9QFRAY4ERK3H00K`, Crunchyroll-Kanal, kein Aniverse-Bezug → nicht eingetragen.
- **Peter Pan 1638** („Peter Pan Anime Prime Video amazon.de Aniverse“): nur Realserie „New Adventures of Peter Pan“ und „Anime e Sangue“, kein Treffer zu diesem Titel → nicht eingetragen.
- **Demon Slayer 142329:** Suche nicht neu nötig, zwei Prime-Adressen (Crunchyroll B0CH5FJ3RK, Aniverse B0G1BF9WCR), Kanal des Termins offen → mehrdeutig, nicht eingetragen.
  - **Geklärt 23.11.2026 (Edge-Messung):** Beide Seiten sind dieselbe Amazon-„Staffel 2“ mit 18 Folgen (Folge 1 „Flammensäule Rengoku Kyōjurō“ = Mugen-Zug-TV 7 + Entertainment District 11), Wiedergabesprachen Deutsch/日本語, „In Prime enthalten“, kein Kanal. 18 passt zu keinem der beiden Titel (Folgenzahl), die Sprachangabe gilt der Seite, nicht den Folgen 8–18: kein Handbeleg, `sprache: offen` bleibt. Adresse für 142329 kommt aus Anime2You 1059642 (`B0D65Q2GCW`, wie bei Mugen Train `B0HLPQXSLK`). Geschwister aus demselben Artikel, nur notiert: Swordsmith Village 145139 `B0BZLT7MLJ`, Hashira Training 166240 `B0CZCWQTP3`, beide noch ohne Adresse und ohne Beleg.
  - **Handbeleg-Dubletten (23.11.2026):** Gleiche Kennung + Adresse mehrfach in `dub-confirmed.yaml` ist der Normalfall (`ladeHandbelege` verschmilzt, die jüngste Zeile gewinnt; 792 Gruppen, 603 davon Amazon). Gemessen an 1840: der alte Eintrag (13 Folgen, „laut Adresse Staffel 3“) war wirkungslos, `ladeHandbelege` vorher/nachher gleich. Echte Widersprüche in der Notiz („laut Adresse Staffel N“ verschieden) gab es in 3 Gruppen (4181, 11307, 163024), abweichende „alle N Folgen“ in 43 (meist Neumessungen, 0 = Ladefehler) — keine eigene Prüfung gebaut, `check-handbeleg-fast-doppel-bestand.ts` deckt nur Fälle ab, die sich allein im Datum unterscheiden.
- **Dragon Ball Daima 170083** („Dragon Ball Daima plus.rtl.de“): nur Presse (serienjunkies, tvmovie: RTL+ ab Ende September 2026), keine plus.rtl.de-Seite → nicht eingetragen.
- **Netz:** `primevideo.com` und `www.primevideo.com` lösen in der Cloud nicht auf (WebFetch ENOTFOUND), die Kanalseiten konnten nicht gelesen werden; die Domains müssten in den Netzwerkeinstellungen der Sitzung freigegeben sein. Die Mängelzahl bleibt 5.
