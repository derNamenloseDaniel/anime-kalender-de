# Plan: Pokémon Horizonte als eigene Einträge je Staffel (22.11.2026)

Auftrag `horizonte-staffeln-plan-2211` (Dirigent). Nur Plan, nichts gebaut. Alle Zahlen gemessen am Stand `0d12d41e` (main, 22.11.2026) mit Wegwerfskripten gegen `public/data/*` und `data/*`; Zeilenzahlen sind Schätzungen und so gekennzeichnet.

**Daniel, 20.11.2026 20:48:** „… wir fassen aber alle zusammen, user erwarten aufteilung nach staffel, es ist teil von pokemon in unserem bestand. wir sollten es von pokemon trennen und als eigene serie führen, und aufteilen in einzelne staffeln, statt alles in 1“. **22.11.2026 15:00:** „horizonte ist immer noch nicht aufgetrennt nach staffeln“.

**Ziel:** vier eigene Titel (Staffel 1 Folgen 1–45, 2: 46–89, 3: 90–136, 4: ab 137 offen; Quelle `data/curated/horizonte-staffeln.yaml`), jeder eigenständig in Woche, Datenbank, Suche, Reihe, mit eigener Titelseite, eigener Folgenliste (Folge 1..n der Staffel), eigenen Plattform-Kacheln und eigenen Terminen. Staffelreiter innerhalb eines Titels zählen nicht (PR 4403, von Daniel als „nicht aufgetrennt“ gemeldet).

## 0. Befund: wie Horizonte heute gebaut ist (gemessen)

| Stelle | Stand heute |
|---|---|
| `titles.json` | ein Titel, `id` 158871, `franchiseId` 527 (Pokémon), `eigenesWerk: true`, `anisearchId` 17947, `episodes` fehlt |
| `releases.json` | 3 Releases: `pokemon-horizonte-s4-rtlplus` (batch, `firstEpisodeNumber` 137, 1 Folge), `auto-158871-tv-super-rtl` und `auto-158871-tv-toggo-plus` (weekly, `episodeCount` 58, `episodeCountAssumed`, `zeiten` für Folge 1–58) |
| `events.json` | 117 Termine: 58 + 58 TV, 1 RTL+ |
| `streams` | Netflix `dubRanges` 2–44 (nur Staffel 1), RTL+ `dubRanges` 1–136 (durchlaufend); TOGGO als `watchLinks[].toggo`, Blöcke mit eigenem Feld `staffel` (S1 11 Blöcke, S2 44, S3 46, S4 1); kein Prime-Weg |
| `folgen/158871.json` | `f` 122 Zeilen (aniSearch, durchlaufend 1–122), `de` `[[1,137]]`, `s` `[[1,1,45],[2,46,89],[3,90,136],[4,137]]`; `zaehlung.json` `[137,137,1]` |
| `franchises.json` | Mitglied von Reihe 527 mit `eigenesWerk`; Hauptserie trägt `staffelQuelle` 1, `staffelBis` 5 |

**Die TV-Termine überschreiten schon die Staffelgrenze.** Termine je Ziel-Staffel (Grenze 45/46): Super RTL 45 in Staffel 1 und 13 in Staffel 2 (46 am 07.11.2026, 58 am 21.11.2026), TOGGO plus ebenso, RTL+ 1 in Staffel 4. Ein Release gehört also nicht einer Staffel; es muss geschnitten werden. Das Schnittmaß liefert die Folgennummer des Termins.

**Aufteilung der Folgenliste `f` (aniSearch, Stand 01.09.2026):** Staffel 1 45, Staffel 2 44, Staffel 3 33 (aniSearch endet bei 122), Staffel 4 0.

**Wo es das Muster „Titel aus fremdem Eintrag“ schon gibt:**

- `eigenesWerk` (`pipeline/bau/cartoon-reihen.ts:48,76–83`, `reihenteil-markierung.ts:13–32`) ist nur eine Marke an einem Reihenmitglied, keine eigene Kennung.
- Eigene Titel (`data/eigene-titel.yaml`, `shared/eigene-titel.ts`: `EIGENE_ID_BASIS` 5.000.000 + `nr`, `bau/eigene-titel.ts`) haben **keinen** AniList-Eintrag und tragen Stammdaten, Termine und Cover von Hand; ihre Kennung hängt nicht an einem Elterntitel. aniSearch-Zeilen (ab 10.000.000 + aniSearch-ID, `docs/wissen/datensatz.md` „Teilung“ ab Zeile 1103) sind Titel einer **eigenen aniSearch-Seite**; die Teilung (`pipeline/bau/mal-teilung.ts`, `pipeline/lib/mal-teilung.ts`) lässt dort den AniList-Sammeltitel weichen. Horizonte hat bei aniSearch nur **eine** Seite (17947), also gibt es keine Seiten, die „gewinnen“ könnten.
- Geteilte Anbieterseiten gibt es: `Title.streams[].sharedWith` und `teilBereich` (`shared/types.ts:221–232`; `pipeline/bau/09-7-teilseiten.ts`, `pipeline/lib/teilseiten.ts`) lassen eine Plattformserie mehrere unserer Einträge bedienen, jeder mit seinem Folgenbereich in den Nummern des Anbieters (344 Adressen für 655 Einträge laut Kommentar an `sharedWith`). Das ist die Stelle, auf die der Plan aufbaut.
- `ak`-Umleitung (`zuAk` in `data/kennungen.json`, `pipeline/bau/eigene-titel-umhaengen.ts:34–61`, `ak-umleitung.json`) kennt **nur 1:1** (alt → ein Nachfolger). Bei Teilungen ohne eindeutigen Nachfolger bleibt die alte Kennung ohne `zuAk` (Durarara!!/Kimagure Orange Road, `datensatz.md` Zeile 1118).

**Kein bestehender Titel ist aus einem fremden Eintrag mit eigenen Stammdaten abgeleitet** (Suche `eigenesWerk`, `EIGENE_ID_BASIS`, `10019539`/`10012621`: Treffer sind Marke, Handtitel ohne AniList oder aniSearch-Zeilen). Das Bauteil „abgeleiteter Titel“ ist neu; Vorlage für Datei, Kennungsraum und Wächter ist `eigene-titel`.

## 1. Untergrenze (einfachster denkbarer Weg)

Eine Phase **nach** `schliesseWegeAb`/`stelleZurueck` und **vor** `baueMeta` in `pipeline/bau/phasenfolge.ts` (Zeile 106, dort steht der Kommentar „Alles, was Verweise ändert, muss vor `baueMeta` stehen“) liest `horizonte-staffeln.yaml` und macht aus dem fertig gebauten Titel 158871 vier Titel:

1. **Staffel 4 bleibt der Titel 158871** (id, `ak` 14839, Slug, alle Handdaten unverändert).
2. Staffel 1–3 sind Kopien mit neuer Kennung (siehe 3c), neuem Namen („Pokémon Horizonte – Staffel N“), eigenen Streams, Releases, Terminen und Folgenliste.
3. Alles Spätere (Meta, Auslieferung, Teilen-Seiten, ICS, Kennungen, `folgen/*.json`) sieht vier normale Titel.

Warum spät: Alle Handdaten (`dub-confirmed.yaml`, `verweise-von-hand.yaml`, `watch-links.yaml`, `urteile.json` mit 45 Schlüsseln `158871|netflix|N`), alle Sammler (TOGGO, Wikipedia, aniSearch, TV-Sichtungen) und die Zuordnung `bewerteTreffer` laufen unverändert gegen **eine** Kennung. Ohne die Phase blieben nur die Abbildung auf der Oberfläche, und genau die hat Daniel verworfen.

Was die Untergrenze **nicht** spart: Wächter umschreiben (Abschnitt 3f), Meldungs-Stille (neue Titel lösen sonst „neu“-Meldungen aus), Adress- und Abo-Fragen (3a, 3b).

## 2. Ansätze im Vergleich

Messgrundlage: Dateien, die `158871` nennen (`git grep -l 158871`): 28 unter `data/`, 9 unter `pipeline/`, 5 unter `docs/`, 1 unter `web/`, `worker/` und `shared/` zusammen; dazu `public/data` (Ausgabe).

| | **A: späte Ableitung im Bau (Empfehlung)** | **B: Handdaten je Staffel** | **C: frühe Ableitung (nach Titelbau)** | **D: nur Oberfläche (Ist, PR 4403)** |
|---|---|---|---|---|
| Idee | Eine Phase nach Phase 11 schneidet Titel, Releases, Termine, Streams, Folgenliste (Abschnitt 1) | Je Staffel ein Eintrag in den Handdateien (`eigene-titel.yaml`-Muster) mit eigener Kennung, Sammler pro Kennung | Die drei Zusatztitel entstehen direkt nach `02-titel`, alle Phasen laufen je Titel | ein Titel, Reiter je Staffel |
| Betroffene Dateien (geschätzt) | neu `pipeline/bau/staffel-titel.ts` (+ `staffel-titel-streams.ts`), `phasenfolge.ts` +3, `folgen-dateien.ts` ~+25, `horizonte-staffeln.yaml` +Kennungsfeld, `pokemon-staffeln.ts` ~+15, Wächter neu/umgeschrieben | ≥ 12 Handdateien je Staffel, TOGGO-/TV-/Wikipedia-Sammler lernen neue Kennungen, `dub-confirmed`/`urteile` geschnitten | Zuordnung, JW, TMDB, CR-Abgleich laufen 4-mal, Plattformserie müsste je Staffel eindeutig zugeordnet werden | bereits gebaut |
| Zeilenaufwand (geschätzt) | Phase 150–220, Umbau Folgenliste 25, Daten 20, Wächter 300–400 | Daten 300+, Sammler 150+, Wächter 200 | 400+, hohes Risiko | 0 |
| Plattformserie = Franchise | bleibt: Wege werden nach dem Bau über `sharedWith`/`teilBereich` je Staffel eingegrenzt | muss je Staffel von Hand belegt werden | genau der Fall, den PR 4403 verworfen hat (Serienkennung zeigt auf mehrere Titel, `bewerteTreffer` müsste eine Staffel wählen) | nicht berührt |
| Handdaten, Sammler | unverändert (Kennung 158871) | vervierfacht | vervierfacht | unverändert |
| Wartung bei Staffel 5 | eine Zeile in der Yaml | vier Dateien | Yaml und Zuordnung | Yaml |
| Daniels Anforderung (eigene Titel) | erfüllt | erfüllt | erfüllt | **nicht erfüllt** |
| Hauptrisiko | Termin-Kennungen (UID), Meldungen, Sortierung der Reihe | Pflegeaufwand, Drift zwischen den Kopien | Fehlzuordnung der Plattformserie | Daniel nimmt es nicht ab |

**Schnellweg-Messung für A** (Skripte `m.mjs` … `m5.mjs` im Scratchpad, Funktionen und Dateien direkt auf `public/data`, 22.11.2026): Alles, was die Phase braucht, steht im gebauten Titel schon staffelgenau da. Die TOGGO-Blöcke tragen `staffel`; die TV-Termine tragen die durchlaufende Folgennummer; die Streams tragen `dubRanges`; die Handdatei trägt die Grenzen. Das Ergebnis eines trockenen Schnitts:

| Staffel | Folgen (eigene Zählung) | Folgenliste `f` | TV-Termine (je Sender) | RTL+ | Netflix `dubRanges` | TOGGO-Blöcke |
|---|---|---|---|---|---|---|
| 1 | 1–45 | 45 | 45 | 1–45 (aus 1–136) | 2–44 | 11 |
| 2 | 1–44 (durchlaufend 46–89) | 44 | 13 (Folge 46–58) | 1–44 (46–89) | — | 44 |
| 3 | 1–47 (durchlaufend 90–136) | 33 | 0 | 1–47 (90–136) | — | 46 |
| 4 | ab 1 (durchlaufend 137) | 0 | 0 | 1 (137) | — | 1 (ab 27.11.2026) |

Die Summen stimmen mit den Ist-Werten überein (Termine 58 + 58 + 1 = 117, TOGGO 11 + 44 + 46 + 1 = 102 Blöcke). Wegen Rundung der Messung: die Blockzahlen je Staffel sind **Blöcke**, nicht Folgen (TOGGO schaltet in Paketen frei).

**Offen im Schnellweg:** Die TV-Folgenummern kommen aus der Sichtung (`data/tv-programm.json`, `sendungen`); der Schnitt bei 45/46 nimmt an, dass die Nummern **durchlaufend** sind (am 07.11.2026 steht „46“ bei Super RTL). `staffel-folge-termine.ts:11` lässt TV-Termine bei der Staffel-Anzeige bewusst aus („tv.de eigene Nummern, niemand hat gegen die Grenzen geprüft“). Bevor die Phase Termine nach Nummer schneidet, muss Schritt 1 diese Annahme an den echten Sichtungen belegen (Gegenprobe: Folgentitel der Sichtung gegen Wikipedia-Titel an den Grenzen 45/46, 89/90).

## 3. Antworten auf die Fragen

### a) Adresse /t/14839, Teilen-Seiten, JSON-LD

- **/t/14839 bleibt gültig und zeigt Staffel 4** (Kennung gehört weiter dem Titel 158871, siehe c). Keine Weiterleitung nötig; `schreibeUmleitungen` (`pipeline/build-share-pages.ts:200–213`) kennt ohnehin nur 1:1 (`zuAk`) und wäre für 1:4 ungeeignet. Das heutige Zeigen der Gesamtserie (Entscheidung PR 4563: „/t/14839 zeigt den ganzen Titel“) entfällt; Staffel 1–3 haben je eigene Adressen.
- **Teilen-Seiten** entstehen je Titel aus `titles-core.json` (`build-share-pages.ts:144–184`: `akVon(t.id)`), brauchen also nur Zeilen in `data/kennungen.json`. Fehlt eine, bricht der Seitenbau ab (`ausgabe-kennung.ts`), das fängt Fehler früh. Release-Seiten `/r/<slug>/`: die Slugs `pokemon-horizonte-s4-rtlplus` und der Slug, den ein Termin heute trägt, bleiben gültig (Regel: Abschnitt b).
- **`describe`/`head` für Staffelzählung (PR 4563)** vereinfacht sich: Der Titel *ist* die Staffel, `grenzen.get(t.id)` (`build-share-pages.ts:171,181,183`) liefert dort nichts mehr für Horizonte, und der Kopf „Staffel 4 Folge 1“ kommt aus der Titelzählung statt aus `staffelFolge`.
- **JSON-LD:** `titel-seite.ts:76–80` und `termin-seite.ts:257–276` schreiben `TVSeries` mit `numberOfEpisodes = t.episodes`. Vorschlag (Verhaltensänderung, eigener Schritt): `TVSeason` mit `seasonNumber` und `partOfSeries` { Pokémon Horizonte }, `numberOfEpisodes` 45/44/47, bei Staffel 4 ohne Zahl (offen). Ob Google `TVSeason` für den Fall besser auswertet, ist hier nicht geprüft (keine fremden Seiten abgerufen); ohne Beleg bleibt `TVSeries` mit eigenem Namen („… – Staffel N“) die sichere Form.
- **Sitemap** (`build-share-pages.ts:374–411`): drei neue Adressen, keine Änderung der Logik.

### b) Kalender-Abos, ICS, Newsletter, Push

- **Favoriten, Push, Newsletter-Abos** hängen an der `ak` des Titels (`worker/src/push.ts:166` `favoriten.has(e.titleId)`, `worker/src/favoriten-lesen.ts`, Browser `web/src/lib/ak-umleitung.ts`). Bleibt 14839 bei Staffel 4, gehen **laufende** Abos weiter dort hin, wo neue Folgen erscheinen (RTL+ ab 20.11., TOGGO ab 27.11., Super RTL/TOGGO plus ab 28.11.). Es geht nichts verloren; wer Staffel 1–3 verfolgt hat (zum Beispiel wegen der TV-Wiederholung, die jetzt in Staffel 2 läuft), bekommt für 2 und 3 nichts mehr.
- **Vorschlag, in der Bauliste Schritt 7 und mit Daniel-Entscheidung markiert:** Fan-out einmalig: `ak-umleitung.json` bekommt für 14839 die drei neuen Kennungen dazu (Format heute `[alt, neu]`; Erweiterung auf `[alt, neu, …]` in `web/src/lib/ak-umleiten.ts` und `worker/src/favoriten-kennung.ts`, geschätzt 40 Zeilen). Wer Horizonte als Favorit hat, bekommt dann alle vier Staffeln. Empfehlung: ja, weil „Favorit“ die Serie meint; Gegenargument: Pushes für Wiederholungen der Staffeln 1–3.
- **ICS-Feeds** (`pipeline/bau/14-ics.ts:48–70`, `shared/ics.ts:134`): `UID:${ev.id}@anime-kalender-de`, `ev.id = releaseSlug@datum`. Die Feeds zeigen nur sieben Tage zurück (`ABO_RUECKBLICK_TAGE`), also betrifft eine geänderte UID vor allem die Staffel-2-Termine 15.–21.11.2026 bei Super RTL und TOGGO plus (bis zu 7 Termine je Sender im Fenster). **Regel:** `ev.id` bleibt unverändert, auch wenn der Termin den Titel wechselt; `titleId` und `releaseSlug` zeigen auf die Staffel. Prüfen im Schritt 1, ob irgendwo ein Release aus der `ev.id` zurückgerechnet wird (Invariante DD-21, `pipeline/lib/invarianten.ts:115`); falls ja, behält der **laufende** Release-Teil den Slug und der Rest bekommt `-sN`.
- **Meldungen und Newsletter-Texte** (`pipeline/lib/meldungen.ts:90` `ALTE_AUTO_KENNUNG` als Vorbild): Neue Titel mit „alten“ Terminen dürfen keine „neu im Kalender“-Meldung auslösen. Die Historien (`data/news-historie.json` 1 Treffer, `data/synchro-historie.json` 1, `data/quellen-historie.json` 2 für 158871) bekommen in Schritt 5 Zeilen für die neuen Kennungen **vor** dem ersten Bestandsbau; Beleg: `news.json` im Bau-Vergleich unverändert bis auf die gewollten Zeilen.
- **Die Abo-Feeds `feeds/*.ics`** sind global (Alle, je Plattform, je Genre), keine je Titel; es gibt kein Titel-Abo, das ins Leere läuft. Das Favoriten-Abo (`worker/src/favoriten-feed.ts`) folgt den Favoriten (siehe oben).

### c) Kennungen, Schema, „ein Anime gehört genau einer Kennung“

- **Schema (`docs/wissen/datensatz.md`, `shared/types.ts:262`):** `data/kennungen.json` trägt `[ak, Hauptkennung, aniSearch, zuAk?]`; die Hauptkennung ist in der Pipeline und in `public/data` die AniList-ID, an der Ausgabe wird sie in `ak` übersetzt (`pipeline/ausgabe-uebersetzen.ts`, `lib/ausgabe-kennung.ts`). Schlüssel 158871 ↔ `ak` 14839 ↔ aniSearch 17947 bleibt für Staffel 4.
- **Neue Hauptkennungen** für Staffel 1–3: ein neuer Raum „Staffel-Titel“ `STAFFEL_ID_BASIS = 6.000.000 + nr` (`nr` laufend in der Yaml, nie wiederverwendet), analog `EIGENE_ID_BASIS` 5.000.000 (`shared/eigene-titel.ts`). Begründung: 6–9 Mio. sind frei (`datensatz.md`: Testkennungen liegen bei 9.000.0xx), 10 Mio. ist aniSearch. `tools/kennungen-erzeugen.mjs` vergibt die `ak` in der Reihenfolge der Kennungen (nach Hauptkennung aufsteigend), die Zeilen bekommen die dritte Stelle 17947 (dieselbe aniSearch-Seite).
- **`horizonte-staffeln.yaml` bekommt `basis: 4`** (die Staffel, die Kennung 158871 behält) und je weiterer Staffel `kennung:`. Wird später Staffel 5 angelegt, bleibt 158871 bei Staffel 4; ohne dieses Feld würde die Phase die offene (letzte) Staffel zur Basis machen, und Staffel 4 verlöre ihre Adresse.
- **„Ein Anime gehört genau einer Kennung“** (Plattform-Serienkennung = Franchise, Zuordnung über Folgenzahl) gilt für die **Zuordnung der Quellen**: Die Phase läuft nach ihr, also trifft keine Quelle die abgeleiteten Titel. Danach bedient dieselbe Plattformserie (RTL+ `p_10142`, Netflix `81696980`, TOGGO `vse292`) vier Titel, jeder mit seinem Bereich über `sharedWith` und `teilBereich`, wie es der Bestand für 655 Einträge schon tut. Zwei Wächter müssen das Wort „abgeleitet“ lernen: `check:logic` verlangt für gleiche aniSearch-Kennung bei mehreren Titeln eine Begründung (`pipeline/lib/anisearch-kennung-mehrfach.ts`, 42 gewollte Fälle), und die MAL-Dubletten-Prüfung (`pipeline/lib/mal-dubletten.ts`, `MAL_AUSNAHMEN`). Beide dürfen die drei Kennungen nicht stillschweigend durchlassen, sondern nur über die Yaml (Kennung vorhanden → erlaubt).

### d) Plattform-Wege je Folgenbereich

Die Phase wandelt je Staffel [von, bis] (durchlaufend) in die Staffelzählung um und schneidet:

- **RTL+** `dubRanges` 1–136 (+137): je Staffel auf [von, bis] geschnitten, in Staffelnummern verschoben (Staffel 2: 46–89 → 1–44); `teilBereich` {von, bis} in Anbieter-Nummern (durchlaufend, `shared/types.ts:221–232`), `sharedWith` 4. Der Termin `pokemon-horizonte-s4-rtlplus` bleibt `firstEpisodeNumber` 137 in der Quelle (`streaming-nachtrag-2026.yaml`: RTL+ zählt durchlaufend) und wird in der Staffel zu Folge 1.
- **TOGGO** (`data/toggo.json`, `watchLinks[].toggo`): Blöcke tragen `staffel` und eigene Nummern je Staffel; die Phase verteilt sie nach `staffel` (Staffel 1: 11, 2: 44, 3: 46, 4: 1), der Link bleibt der Serienlink. `shared/kostenlos.ts` (`toggoFolgen`, Schlüssel `Staffel × 1.000.000 + Folge` nur bei mehreren Staffeln) sieht je Titel eine Staffel und fällt auf die einfache Nummer zurück; Wächter `check-horizonte-kachel.ts` deckt das heute mit 34 Fällen ab (Abschnitt f).
- **Netflix** „Staffel 1 Fg. 2–44“: nur Staffel 1 (`dubRanges` 2–44). Staffel 2–4 bekommen **keinen** Netflix-Weg (Netflix führt dort nichts); die Phase schneidet auf Schnittmenge und lässt leere Wege weg.
- **Super RTL / TOGGO plus (TV):** die Releases werden nach Folgennummer geschnitten (Staffel 1: 1–45, Staffel 2: 46–…); `episodeCount`, `episodeCountAssumed` und `zeiten` (Schlüssel = durchlaufende Nummer) werden je Teil neu gebildet; die Fortschreibung für die Zukunft läuft weiter über den Basistitel (TV-Sichtung ist an 158871 gebunden) und wird ebenfalls in der Phase aufgeteilt.
- **Prime:** im Bestand nicht vorhanden (kein Prime-Stream, keine Prime-Seite); nichts zu schneiden. Der Wächter hält fest, dass keine Staffel einen Prime-Weg ohne Beleg bekommt.
- **Eine Ausnahme von „kein Weg ohne Beleg“:** Ein Weg, dessen Bereich eine Staffel nicht trifft, entfällt (nicht „unbekannt“). Ein Weg mit Beleg für Folgen außerhalb jeder Staffel (zum Beispiel > 137 bei RTL+) erzeugt Fehler, nicht Stille (`stille-ausfaelle-verhindern`: jeder Verwerfungspfad zählt und meldet).

### e) Folgenzählung

- **Termin `pokemon-horizonte-s4-rtlplus`** (`firstEpisodeNumber` 137, `episodeCount` 1): in der Phase auf `firstEpisodeNumber` 1 umgerechnet (Staffel 4, `von` 137), `staffelFolge` ist dann überflüssig. Heute: `pipeline/bau/staffel-folge-termine.ts:11–21` (`schreibeStaffelFolgen`, TV ausgenommen) mit `shared/staffel-folge.ts`.
- **Stellen, die heute durchlaufend zählen** und danach je Titel zählen müssen:
  - `pipeline/bau/folgen-dateien.ts` (Folgenliste `f`/`de`/`s`, `zaehleFolgen`, `offeneStaffeln`, `mitStapelFolgen`; Abschnitt „Pokémon Horizonte“ in `datensatz.md:1343 ff.`);
  - `pipeline/lib/pokemon-staffeln.ts` (`ladeStaffelGrenzen`, `staffelListen`, `staffelEnden`, `letzteFolgen`);
  - `shared/logic.ts` (`stapelFolgen`, `deFolgenZahlText`, `offeneStaffelText`) und `shared/kostenlos.ts`;
  - `web/src/components/detail/folgen-staffeln.ts` (Reiter; bleibt für Pokémon 527 und die sieben anderen Mehrstaffel-Titel, entfällt für Horizonte, weil `s` dort leer ist);
  - `pipeline/lib/tv-termine.ts` (Sichtungszählung, `sichtungsZahl`) und `pipeline/lib/sichtungsfenster.ts`;
  - `build-share-pages.ts:171` (`staffelListen`).
- **Folgenliste je Titel:** `f` wird nach Bereich geschnitten und auf 1..n umnummeriert (Staffel 1: 45, 2: 44, 3: 33, 4: 0), `de` je Staffel `[[1,n]]`, `zaehlung.json` je Titel `[n, n, offen?]` (Staffel 4: `[1,1,1]`, offen bleibt). Der Kopf „Staffel 1–3: 136 Folgen · Staffel 4: 1 Folge“ (PR 4563) entfällt, weil jede Seite ihre eigene Zahl sagt.

### f) Wächter, die die Ein-Titel-Form festhalten

Der Bau darf nicht so gebogen werden, dass alte Wächter grün bleiben: Wo ein Wächter „ein Titel, vier Staffelreiter“ prüft, wird er **umgeschrieben**, nicht ausgenommen.

| Wächter | Hält fest | Entscheidung |
|---|---|---|
| `pipeline/check-horizonte-staffeln.ts` (122 Zeilen) | `s` [[1,1,45],…], Kopfzählung 137, `staffelQuelle`/`staffelBis` an 158871 | **umschreiben** zu `check-staffel-titel.ts`: vier Titel, je Folgen, je Kopf, je Kennung |
| `pipeline/check-horizonte-staffeln-bestand.ts` (50) und `-lauf.ts` (69) | Detaildatei 158871 trägt 4 Staffeln; „Staffel offen“ in `zaehlung[id][2]` | **umschreiben**: gegen Wikipedia/TOGGO je Staffel, Warnung bei neuer Staffel bleibt (dann Yaml-Zeile) |
| `pipeline/check-horizonte-kachel.ts` (109) | Kopf „Staffel 1–3 … Staffel 4 …“, TOGGO 136/137, og-Texte | **umschreiben**: Kopf je Titel, TOGGO je Staffel, og-Text ohne `staffelFolge` |
| `tools/mutationen/horizonte-staffeln.json` | 61 Mutanten gegen die alte Form | neu aufsetzen, Ziel: jede Zeile rot gegen die Basis |
| `pipeline/check-staffel-anzeige.ts:32,102–104` | Horizonte-Fall in `schreibeStaffelFolgen` | Fall anpassen (Termin ist Folge 1 des Titels) |
| `pipeline/check-pokemon-staffeln.ts:71–77` | Horizonte und ONA sind `eigenesWerk`, nicht in der Hauptserie | bleibt, erweitert um die drei Kennungen (zählen nicht zu „von 25“) |
| `pipeline/check-folgenzahl-offen.ts:42` | `offeneStaffeln` = genau 158871 | bleibt grün, weil Staffel 4 die Kennung behält; Aussage prüfen |
| `check-folgenzahl-sichtung.ts:39`, `check-folgen-wiki-versatz.ts:2`, `check-logic.ts:5080–5085,5160,5245` | Zuordnung/Sichtung/Wikipedia an 158871 vor dem Schnitt | unverändert (Phase läuft danach); Gegenprobe im Bau-Vergleich |
| `check-folgen-staffeln.ts`, `check-panel-eigenes-werk.ts` (alle 55 Handlisten-Kennungen) | Reiter-Komponente, Panelkopf | prüfen, dass Reiter für 527 bleiben und Horizonte keine zeigt; Liste um die drei Kennungen erweitern |
| `check:logic` Mehrfach-aniSearch/MAL (Abschnitt c) | gleiche Kennung bei mehreren Titeln nur mit Eintrag | um „abgeleitet über Yaml“ erweitern |

Neue Wächter: `check-staffel-titel.ts` (Bau auf echten Daten: vier Titel, Summen stimmen mit der Basis, jeder Termin genau einmal, `ev.id` unverändert, kein Weg ohne Bereich), `check-staffel-titel-bestand.ts` (gegen `public/data`).

### g) Reihe und Reihenübersicht

- Alle vier Titel stehen in Reihe 527 (`reihen-von-hand.yaml:99` führt 158871 bereits; die drei Kennungen kommen dort und in `data/spinoff-von-hand.yaml:131` dazu), jeweils `eigenesWerk` (zählen nicht in „Hauptserie von 25“, `check-pokemon-staffeln.ts:76`). Der Reihenkopf „Pokémon“ trägt `staffelBis` 5 nur für die Hauptserie; Horizonte trägt `staffelBis` künftig gar nicht mehr (`pipeline/bau/13-4-zusatzdateien.ts:190,280`, `shared/titles.ts:144,187`).
- **Benennung:** Titelnamen „Pokémon Horizonte – Staffel N“ (eigener Name, keine Beschriftung durch `staffelMarken`, `shared/titles.ts` „Nummern gibt es nur, wo sie etwas unterscheiden“).
- **Sortierung ist ein echtes Risiko:** `ausstrahlungsZeit` (`shared/titles.ts`) sortiert nach `jpStart`/`jpYear`; die vier Titel erben dasselbe Jahr 2023. Bei Gleichstand entscheidet sonst die Kennung, und Staffel 4 (158871) stünde vor Staffel 1 (6.000.xxx). Lösung: Tie-Break über `staffelQuelle`/Staffelnummer, Wächter dafür in Schritt 6.
- **„F148“** kommt in `docs/wissen/*.md`, `CLAUDE.md` und `ARCHITEKTUR.md` nicht vor (Suche am 22.11.2026, 0 Treffer); gemeint ist vermutlich die Staffelzählung der Reihenübersicht (`staffelMarken`, `shared/staffel-zaehlung.ts`). Der Bauer prüft den Fall dort anhand der Reihe 527 (Schritt 6), ohne die Annahme als belegt zu behandeln.

### h) Weitere Titel derselben Form (nur Zählung)

- **Titel mit Staffelgrenzen in der Yaml, ein AniList-Eintrag, mehrere deutsche Staffeln:** 9 (`folgen/*.json` mit `s` > 1 Eintrag, 22.11.2026): Pokémon 527 (5 Staffeln), Advanced Generation 1564 (4), Diamant & Perl 1565 (4), Sonne & Mond 97634 (3), Reisen 112153 (3), Schwarz & Weiß 9107 (2), Schwarz & Weiß Staffel 2 14093 (2), XY 19291 (2) und Horizonte 158871 (4). `data/curated/pokemon-staffeln.yaml` hat 8 Titel mit mehr als einer Staffel (5/4/4/2/2/2/3/3) und weitere 4 mit einer.
- **TOGGO führt mehrere Staffeln, aber keine Staffelgrenzen in der Yaml:** 7 weitere Titel: Naruto 20, Naruto Shippuden 1735, Boruto 97938, Sylvanian Families 187052, Beyblade X 165159, Beyblade Burst QuadStrike 166062, Super Wings 10012621 (PR 4563 hat die TOGGO-Zählung für fünf davon korrigiert).
- Die Umkehrung (eine Plattformserie, mehrere AniList-Einträge) ist der Normalfall `sharedWith` (655 Einträge).

## 4. Empfehlung

**Ansatz A, Horizonte zuerst, nichts anderes mitverändern.** Staffel 4 behält 158871/14839 (alle Handdaten, Sammler, Favoriten und die gemeldete Adresse bleiben), Staffel 1–3 entstehen als abgeleitete Titel in der neuen Phase. Die Pokémon-Hauptserie bleibt vorerst ein Titel (Daniel hat nur Horizonte genannt); die 8 Titel aus Abschnitt h sind ein Folgeauftrag, **nur wenn** Daniel dasselbe will. Gewählt, weil es die einzige Variante ist, die die Handdaten nicht vervielfacht und die Plattformserie nicht zur Staffel verbiegt, und weil die Phase an einer Stelle steht, an der nach ihr nur noch Auslieferung kommt.

Offen, mit Empfehlung (Daniel entscheidet nicht jetzt, der Bauer arbeitet mit der Empfehlung):

1. **Favoriten-Fan-out** für 14839 auf alle vier Staffeln: ja (Schritt 7).
2. **JSON-LD `TVSeason`:** erst nach einer gelesenen Quelle (Schritt 8); bis dahin `TVSeries` mit Staffelnamen.
3. **Staffelnamen** („Pokémon Horizonte – Staffel N“): bleibt so, bis eine Quelle deutsche Staffelnamen trägt (Yaml-Kommentar vom 20.11.2026).

## 5. Bauliste (Umbau und Verhaltensänderung getrennt)

Jeder Schritt ist ein eigener PR. „Fertig erst mit Mutationstabelle aus `node tools/diff-mutanten.mjs` und Beleg ‚rot an der Basis‘ im PR“ (Lehre 211, `delegieren-und-parallelisieren/SKILL.md:57`) gilt für **jeden** Schritt, der einen Wächter baut. Bau-Vergleich: `tools/bau-vergleich.mjs` (Basis gegen Zweig).

| # | Art | Schritt | Fertig, wenn | Wächter und Mutationsbeleg |
|---|---|---|---|---|
| 1 | Messung, kein Code | Annahmen belegen: (a) TV-Nummern durchlaufend (Sichtungstitel gegen Wikipedia an 45/46, 89/90), (b) `ev.id` wird nirgends zu einem Release zurückgerechnet, (c) Reihenfolge `ausstrahlungsZeit`/Tie-Break | Messwerte im PR; bei (a) oder (b) „nein“ ändert sich Schritt 3 | kein Wächter; Skripte im PR-Text |
| 2 | **Umbau** (keine Verhaltensänderung) | `horizonte-staffeln.yaml` um `basis` und `kennung`; Leser (`pokemon-staffeln.ts`) liefert sie; `shared/staffel-titel.ts` mit `STAFFEL_ID_BASIS` und `istStaffelTitel`; Platz in `tools/kennungen-erzeugen.mjs` und Prüfung der Kennungsräume | Bau-Vergleich: **alle** `public/data`-Dateien byte-gleich zur Basis | `check-staffel-titel-daten.ts` (Yaml-Form, Kennungen eindeutig, nie wiederverwendet); `diff-mutanten` am Leser, alle rot, Basis-Beleg |
| 3 | Verhaltensänderung | Phase `staffel-titel.ts` in `phasenfolge.ts` (nach `stelleZurueck`, vor `baueMeta`): Titel, Streams (`teilBereich`/`sharedWith`), TOGGO-Blöcke, Releases und Termine schneiden, `ev.id` bleibt; Folgenliste in `folgen-dateien.ts` je Titel | Bau-Vergleich: nur Horizonte-Dateien und die drei neuen Titel ändern sich; Summen stimmen (117 Termine, 102 TOGGO-Blöcke, 122 Folgenzeilen); `ev.id` alle gleich | `check-staffel-titel.ts` (Bau auf echten Daten) und Bestandswächter; Mutationen: Grenze 45/46 verschieben, `ev.id` ändern, Streams nicht schneiden, Basis behält nicht die Kennung → je rot |
| 4 | Verhaltensänderung | Kennungen und Seiten: `data/kennungen.json` ergänzen, `ak`-Zeilen mit aniSearch 17947, Teilen-Seiten für die drei Adressen, Sitemap, `/t/14839` bleibt | `check-teilseiten.ts` grün (braucht gebautes `dist/data`, läuft in der Kette); Seite für alle vier Adressen, kein Dublett | Wächter: keine zwei Titel mit gleicher `ak`; Mutation: fehlende Zeile → Seitenbau bricht ab |
| 5 | Verhaltensänderung | Meldungs-Stille: Historien (`news-historie.json`, `synchro-historie.json`, `quellen-historie.json`) für die drei Kennungen; `meldungen.ts` | `news.json`, `neu-mit-synchro.json` im Bau-Vergleich ohne neue „neu“-Zeilen | Wächter: neue Staffel-Kennungen erzeugen keine Meldung; Mutation: Historie weglassen → rot |
| 6 | Verhaltensänderung | Reihe und Anzeige: `reihen-von-hand.yaml`, `spinoff-von-hand.yaml`, Tie-Break in `ausstrahlungsZeit`, `staffelBis` weg, Panelkopf, Namen | Panelbilder (`check:panel`, beide Themen, Reihe 527 mit vier Staffeln in Reihenfolge 1–4), Wochenansicht | Wächter für Reihenfolge (Mutation: Tie-Break entfernen → Staffel 4 steht vorn, rot) |
| 7 | Verhaltensänderung | Favoriten-Fan-out (`ak-umleitung.json` mit mehreren Zielen, `web/src/lib/ak-umleiten.ts`, `worker/src/favoriten-kennung.ts`) | Test: gemerkte 14839 wird zu 14839 + 3 neuen; zweiter Lauf ändert nichts | Wächter in `check:logic`; Mutation: Fan-out nur 1 Ziel → rot |
| 8 | Wächter umschreiben (Abschnitt f) | alte Horizonte-Wächter durch `check-staffel-titel*.ts` ersetzen, Mutationsliste neu, `check-logic-liste.txt` angepasst | alle alten Fälle haben ein Gegenstück oder eine Begründung, warum sie entfallen; `check:logic` grün | Mutationstabelle `diff-mutanten`: rot an der Basis (alter Bau) und an jeder Mutation |
| 9 | Verhaltensänderung (optional) | JSON-LD `TVSeason` nach gelesener Quelle | Probelauf Strukturdaten gültig | Wächter auf Felder; Mutation: Typ zurück → rot |

Schritt 2 und 3 liegen bewusst in getrennten PRs, weil Schritt 2 nichts ändern darf (Bau-Vergleich byte-gleich) und Schritt 3 alles. Nach dem Deploy von Schritt 3 und 4: live messen, ob /t/14839 und die drei neuen Adressen antworten, Reihe 527 vier Horizonte-Titel zeigt und `feeds/all.ics` keine doppelte UID trägt (CLAUDE.md: fertig = nach Deploy live gemessen). Beobachtung nach Einführung: erster Bau, nach fünf Bauläufen, nach einem Tag, nach einer Woche (Rhythmus aus `20-arbeitsweise.md`); Prüftermin „Staffel 5“ steht in Yaml und Bestandswächter (Warnung bei neuer Staffel in Wikipedia/TOGGO).

## 6. Quellen dieses Plans

PR 4403 („Pokémon Horizonte: eigene Staffeln 1–4 statt eines Eintrags“, Ansatz „Eigene Titel je Staffel“ verworfen mit Begründung Plattform-Serienkennung = Franchise) und PR 4563 („Folgen je Staffel zählen“, Entscheidung „/t/14839 zeigt den ganzen Titel“) sind per REST gelesen; beide Entscheidungen werden mit Ansatz A **teilweise überholt**: die Franchise-Zuordnung bleibt eine Zuordnung der Quellen (vor der Phase), und /t/14839 zeigt nicht mehr den ganzen Titel. Mess-Skripte (nicht im Repo): `m.mjs`, `m2.mjs`, `m3.mjs`, `m4.mjs`, `m5.mjs` im Scratchpad, gefahren am 22.11.2026 gegen `public/data` Stand `0d12d41e`.
