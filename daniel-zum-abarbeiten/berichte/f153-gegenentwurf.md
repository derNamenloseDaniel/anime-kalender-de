# F153 Gegenentwurf: Serien in Staffeleinträge aufteilen (Plan, 23.11.2026)

Auftrag: nur Plan, kein Umbau. Gelesen: `CLAUDE.md`, `ARCHITEKTUR.md`, `public/data/{titles-core,releases,events,franchises,synonyme}.json`, `data/tmdb-folgen.json`, `data/curated/{horizonte,pokemon}-staffeln.yaml`, `shared/ics.ts`. Ein vorhandener Staffelplan wurde nicht gelesen. Alle Zahlen sind am Stand `main` vom 23.11.2026 gemessen (`titles-core.json`: 727 Titel, davon 550 TV, 81 TV mit ≥ 26 Folgen, 56 mit ≥ 40).

Ziel (Daniel, 22.11.2026): Serien dort aufteilen, wo es Sinn macht; eigene beste Aufteilung statt AniList/aniSearch; Relationen bleiben (von Horizonte zu Pokémon springen); je Staffel die Folgenzahl der Staffel statt 100+; offiziellen Staffelbezeichnern folgen; besser als andere Seiten.

## 0. Ist-Stand (gemessen), der den Entwurf prägt

1. **Es gibt schon zwei halbe Mechanismen.** Horizonte ist als drei eigene Titel gebaut (`7000001/2/3`, `staffelTitel: {sammel, nr, ab}`, 45/44/47 Folgen, Staffel 4 offen ab Folge 137). Pokémon-Hauptserie bekommt nur eine **Beschriftung** (`s: [[nr, von, bis]]` in `folgen/<id>.json`, `staffelSpanne()`), die Einträge selbst bleiben die AniList-Sammeltitel (527 = 276 Folgen).
2. **Drei verschiedene „Staffel“-Zählungen für dieselbe Serie.** Naruto Shippuden (500 Folgen): TMDB zählt 20 Staffeln (32/21/18/17/24/31/8/24/21/25/21/33/20/25/28/13/11/21/20/87). Disney+ Deutschland liefert bisher vier „Staffeln“ mit 53/59/52/52 Folgen (`releases.json`). Kumuliert: Disney+ 53, 112, 164, 216; TMDB 32, 53, 71, 88, 112, 143, 151, 175, 196, 221. Nur die ersten beiden Disney+-Grenzen (53, 112) fallen auf TMDB-Grenzen, die dritte und vierte (164, 216) liegen mitten in TMDB-Staffeln. Keine Zählung ist „die richtige“ an sich.
3. **TMDB trägt nur selten allein.** Von 81 TV-Titeln mit ≥ 26 Folgen: 32 ohne TMDB-Folgenliste, 26 mit **einer** TMDB-Staffel (z. B. Yu-Gi-Oh! 224, Dragon Ball 153, Eyeshield 21 mit 145 Folgen), 18 mit Summe ≠ Folgenzahl des Titels (TMDB mischt Titel oder Specials: Bleach 366 gegen 416, Pokémon 276 gegen 1235, Inuyasha 167 gegen 193, Black Clover 170 gegen 196), **nur 5 sauber** (Naruto, Naruto Shippuden, D.Gray-man, M.A.S.K., Hunter x Hunter 2011). Eine Aufteilung „aus TMDB“ erreicht damit höchstens ~6 % der langen Serien.
4. **Die Horizonte-Aufteilung zeigt schon Folgefehler.** Der TV-Termin (Super RTL und TOGGO plus) liegt als **je ein Release pro Staffeleintrag** vor (`auto-7000001/2/3-tv-…`, 6 Releases statt 2), jedes mit `episodeCount: 136` und derselben `observed`-Karte. Die Ereignisse (`events.json`) sind richtig der Staffel zugeordnet (Folge 38 → 7000003, Folge 1 → 7000001), die Release-Hülle ist aber dreifach und zählt dreimal 136 für Staffeln mit 45/44/47 Folgen.
5. **Kennungen**: Titel-`id` = AniList-ID, `ak` entsteht erst beim Seitenbau (`tools/vite-kennungen.ts`), `franchises.json` bildet die Reihe (Pokémon: 66 Mitglieder), Plattform-Serienkennung = Franchise.

## 1. Untergrenze (einfachster Weg)

**„Beschriftung statt Eintrag“:** eine Datei `data/staffeln.yaml` je Serie mit `{von, bis, nr, name?, quelle}`; keine neuen Titel, keine neuen Kennungen. Die Detailansicht gruppiert die Folgenliste nach Staffel und zeigt „Staffel 3 · 52 Folgen“; Reihenkarte und Plattformzeilen zeigen die Spanne („Staffel 14–16“). Das ist der heutige Pokémon-Weg, auf alle Serien verallgemeinert. Kosten: ein Leser, ein Wächter.

Was sie **nicht** erfüllt: Die Kalenderkachel, die Suche, der Statusfilter und die Synchro-Angabe bleiben auf Sammeltitelebene (276 Folgen, „Pokémon“ ein Treffer, `dubRanges` weiter im Titel). Das Ziel „nicht mehr 100+ Folgen bei Horizonte“ ist nur zur Hälfte erreicht (Detail ja, Titel nein). Sie ist trotzdem der **Rückfallweg**, wenn eine Serie nur Grenzen, aber keine Staffelnamen hat.

## 2. Datenmodell: drei Ebenen statt zwei

Bei Pokémon gibt es nicht nur Serie und Staffel, sondern dazwischen die **Saga** („Schwarz & Weiß“ = deutsche Staffeln 14–16, die Disc heißt „Staffel 14 bis 16“). Das Modell braucht deshalb:

| Ebene | Beispiel | Trägt |
|---|---|---|
| **Werk** (Serie) | Pokémon · Naruto Shippuden · Horizonte | Titelstamm, Cover, Genre, Studio, Relationen, Folgenliste, Gesamtzahl, Abo/Favorit |
| **Saga** (optional) | Schwarz & Weiß · Advanced Generation | Beschriftung, Disc-Boxen; keine eigenen Termine |
| **Staffel** | Staffel 14 · Horizonte Staffel 3 „Gute Aussichten“ | `von/bis` (Folgennummern des Werks), Folgenzahl, Name, Termine, Synchro-Bereich, Status |

Feldskizze je Staffel (Quelle der Wahrheit `data/staffeln.yaml`, nur Handbeleg-Ebene; der Bau materialisiert):

```
werk: 527            # bestehende Franchise-Kennung
staffeln:
  - nr: 14
    ak: 8000014      # eigene, nie wiederverwendete Kennung (Tabelle nur anhängen)
    von: 143 · bis: 190     # Folgennummern im Werk, lückenlos
    saga: "Schwarz & Weiß"
    name: null | "…"        # nur mit nameQuelle
    nameQuelle: url+gelesen am
    grenzeQuelle: [{art: handbeleg|plattform|disc|tmdb|wikipedia, url, gelesen}]
    grenzeArt: belegt | abgeleitet | offen    # offen: Ende nicht belegt (laufend)
    zaehlung: durchlaufend | je-staffel       # wie die Quelle die Folge nummeriert
```

Zwei Regeln sind tragend: (a) **Folgen werden immer in der durchlaufenden Werk-Nummer geführt** (so passen `dubRanges`, `observed`, `firstEpisodeNumber`, aniSearch und Plattformen zusammen; „Folge in der Staffel“ ist Anzeige). (b) **Eine Plattform- oder Senderzählung wird nicht verworfen, sondern als Zuordnung mitgeführt** (`plattformStaffel: {disneyplus: 3 → Folgen 113–164}`), damit der Disney+-Termin „Staffel 3“ auf den richtigen Bereich fällt, auch wenn unsere Primärzählung anders schneidet.

## 3. Quelle der Staffelgrenzen und Namen

Reihenfolge je Serie (die erste vorhandene deutsche Quelle gewinnt, Widerspruch wird gemeldet, nicht still entschieden):

1. **Deutsche offizielle Sendeeinheit**: Sender-/Streamer-Staffelseite (TOGGO, RTL+, Disney+, Netflix-Staffelwähler, ADN/Crunchyroll-Staffel), Disc-Box („Staffel 14 bis 16“). Sie bestimmt Name und Grenze, weil Synchro und Kalender deutsch sind.
2. **Handbeleg** (`data/staffeln.yaml` mit Quelle) für alles, was 1. nicht liefert, etwa Wikipedia „Folge in der Staffel“-Spalte.
3. **TMDB-Staffeln** nur als **Vorschlag** (Hinweis für den Bau, nie als Beleg), mit Summenprobe gegen die Folgenzahl.
4. **Heuristik** (Sendepause, Cour-Wechsel in aniSearch): erzeugt keine Staffel, nur einen Hinweis für den Nächsten, der nachlesen soll.

Nicht belegt = nicht geteilt (`grenzeArt: offen`, Rest als eine Strecke „Folgen 217–500“). Staffelnamen nur wörtlich gelesen, sonst „<Werk> – Staffel n“ (Horizonte ist der Beleg, dass diese Regel schon gilt: Staffel 1/2 haben keinen belegten Namen, Staffel 3 „Gute Aussichten“ schon).

**Folgenzahl je Staffel ist Ergebnis, nicht Ziel.** „~35 pro Staffel“ trifft die Wirklichkeit nicht: Pokémon-Staffeln haben 34 bis 82 Folgen (Staffel 1: 82), Naruto Shippuden nach TMDB 8 bis 87. Gefolgt wird dem **offiziellen** Schnitt, nie einem Zielwert; für Serien ohne offiziellen Schnitt gilt Abschnitt 6.

## 4. Kennungen, URLs, Abos

* **Werk-Kennung bleibt**, was heute die Franchise-/Sammelkennung ist (`527`, `1735`, `158871`). Sie ist Adresse der **Serienseite** (`/t/<slug>/`), zeigt die Staffeln und leitet nicht auf Staffel 1 um.
* **Staffeln bekommen eigene `ak`** (Tabelle `data/kennungen.json`, nur anhängen, nie neu vergeben; entspricht dem Konzept „eigene Kennungen“). Adresse `/t/<werk-slug>/<staffel-slug>/`; der Staffel-Slug trägt `nr`, nicht den Namen, damit ein später belegter Name keine Adresse ändert.
* **Grenze verschiebt sich** (Folge 89 → 90): `ak` bleibt, nur `von/bis` ändern sich. **Zusammenlegung** (zwei Staffeln werden eine): alte `ak` bekommt `status: zusammengelegt` + `zuAk` (Adresse leitet weiter).
* **Favoriten und Newsletter-Abo hängen am Werk**, nicht an der Staffel. Sonst wird ein Abo auf „Pokémon“ (527) still zu „nur Staffel 1“ und Staffel 26 meldet sich nie. Staffel-Abo ist eine spätere, ausdrückliche Option.
* Die Schlüssel-Dateien (`folgen/<id>.json`, `synopses/`, `voices/`, `disc/`) bleiben am Werk; nur Termine/Ereignisse tragen zusätzlich `staffelAk`. Das hält die Dateizahl (6.499 von Schwelle 15.000) und die Ladelast stabil.

## 5. Kalender, ICS, Suche, Relationen

**Kalender.** Ereignis = Release × Tag (`id = releaseSlug@datum`). Neu: Ereignis trägt `staffelAk`, die Kachel zeigt „Horizonte · Staffel 3 · Folge 38“. Das Release bleibt **ein** Release je Plattform/Sender (nicht je Staffel kopieren, siehe 0.4); Batch-Releases der Streamer (Disney+ liefert Staffelpakete) sind von Natur aus je Staffel ein Release. Kachel und Zählung ändern sich nur, wenn eine Quelle die Staffel nennt; sonst `staffelAk` leer und die Kachel zeigt das Werk wie heute.

**ICS.** UID bleibt `${ev.id}@anime-kalender-de` (`shared/ics.ts`): die Aufteilung ändert **nie** eine UID, sonst entstehen in abonnierten Kalendern Doppelte. Nur `SUMMARY`/`DESCRIPTION` ändern sich (Staffel, „Folge 38, in Staffel 1“), mit `SEQUENCE`-Hochzählung, damit Clients den Text aktualisieren. Abo-Feed bleibt am Werk („Pokémon Horizonte folgen“ liefert alle Staffeln, auch künftige); ein Feed je Staffel nur auf Wunsch.

**Suche.** Der Index kennt Werkname **und** Staffelname; Treffer werden **je Werk gruppiert** („Pokémon · 29 Staffeln“, aufklappbar), sonst liefert „Pokémon“ 29 Zeilen statt einer. Ein Treffer auf „Gute Aussichten“ springt direkt zur Staffel. Synonyme bleiben am Werk (`synonyme.json` ist schon so geschnitten).

**Filter und Status.** Status (läuft/erschienen/angekündigt) und Synchro-Angabe werden **je Staffel** berechnet (`shared/logic.ts`): Staffel 1–3 erschienen, Staffel 4 läuft. Das ist der größte inhaltliche Gewinn gegenüber anderen Seiten, weil „Synchro ist nicht Untertitel“ so je Staffel stimmt (z. B. Naruto Shippuden: Synchro bei Disney+ nur Folge 1–59, bei Netflix nur 480–500: heute nur als `dubRanges` am 500-Folgen-Titel).

**Relationen.** Zwei Ebenen: (1) **Werk-Graph** = heutige Reihe/Franchise (Fortsetzung, Spin-off, Film), der Sprung Horizonte → Pokémon läuft über das Werk und bleibt erhalten, auch wenn Horizonte vier Staffeln hat; (2) **Staffelkette** (Vorgänger/Nachfolger) wird aus `nr` abgeleitet, nicht gepflegt. Sagas sind nur Beschriftung, kein Graphknoten.

## 6. Prüfungen (neue Wächter, in `check:logic`)

1. **Lückenlos und ohne Überlappung**: Staffeln eines Werks decken `1…letzte belegte Folge` genau einmal ab; Summe der Staffelfolgen = Folgenzahl des Werks (oder letzte Staffel `offen`).
2. **Jede Grenze und jeder Name hat Quelle** (`grenzeQuelle`, `nameQuelle`); kein erfundener Staffelname.
3. **Release-Konsistenz**: `episodeCount` eines Releases ≤ Folgenbereich der zugeordneten Staffel; ein Release erscheint nie als Kopie je Staffel (der Befund 0.4 wäre sofort rot).
4. **UID-Stabilität**: Vorher/Nachher-Vergleich aller ICS-UIDs und aller `events[].id` muss bis auf `staffelAk` identisch sein (`tools/bau-vergleich.mjs`).
5. **Kennungs-Tabelle**: nie wiederverwendet, jede alte Adresse löst auf (Weiterleitung oder Werkseite).
6. **Zählungs-Konflikt** (Plattform ≠ Primär): wird gelistet, nicht stillgelegt; Gegenprobe wie bei Naruto Shippuden (53/112 passen, 164/216 nicht).
7. **Reihenkarte**: Summe der gezeigten Staffeln = Summe der Werkfolgen (verhindert die Doppelzählung 13 gegen 25 aus `pokemon-staffeln.md`).
8. Umbau und Verhaltensänderung getrennt; der Umbau nur mit Vorher/Nachher auf denselben Eingaben (Regel `CLAUDE.md`).

## 7. Alternativen im Vergleich

**A. Staffel = vollwertiger Titel (Ausbau des Horizonte-Wegs).** Jede Staffel ist ein eigener Eintrag in `titles-core` mit eigenem Cover, Genre, Studio.
+ Alle bestehenden Leser (Kalender, Filter, Favoriten, Suche) funktionieren sofort, weil sie Titel kennen. − Metadaten doppelt (Pokémon: 29 Kopien von Genre/Studio/Cover → `titles-core` wächst, Ladelast; ARCHITEKTUR 2b warnt genau davor); Releases verdreifachen sich wie bei Horizonte; Reihe, Sagas und Werkseite müssen aus Titeln rückgebaut werden; Favoriten und Abos zersplittern.

**B. Staffel = Abschnitt am Werk (Modell dieses Dokuments, ohne eigene Titel).** Werk hat `staffeln[]`; Ereignisse und Releases tragen `staffelAk`; Kachel und Panel rechnen zur Laufzeit je Staffel.
+ Metadaten einmal, kein Release-Duplikat, Abo/Favorit am Werk natürlich, `titles-core` wächst um ~nichts (nur Staffelspanne je Werk). − Alle Stellen, die „Titel“ voraussetzen (Filter, Statusberechnung, Suche, ~140 Stellen `.id`), müssen die zweite Ebene verstehen; Status/Synchro je Staffel ist neue Logik in `shared/logic.ts`.

**C. Hybrid (Empfehlung): B als Quelle der Wahrheit, bei Bedarf Materialisierung dünn.** Die Pflege passiert nur in `data/staffeln.yaml`; der Bau erzeugt aus Werk + Staffel für Kalender/Suche **dünne Staffelzeilen** (`ak`, `werk`, `nr`, `von/bis`, Name, Status, Synchro), die Titelfelder per `werk` erben und nirgends kopiert werden. Altleser sehen weiter das Werk; neue Leser (Kachel, Suche, Statusfilter) lesen die Staffelzeile.
+ Behält A's Kompatibilität (Karte je Staffel) und B's Datenmenge. − Zwei Darstellungen desselben Sachverhalts (Quelle und Ableitung) → braucht den Wächter 6.4 (Vorher/Nachher) als festen Teil des Baus.

**Quelle der Grenzen im Vergleich:**

| Weg | Vorteil | Nachteil |
|---|---|---|
| TMDB-zuerst | automatisch, deutsche Folgentitel | trägt nur 5 von 81 sauber (Abschnitt 0.3); zählt Naruto Shippuden 20, Disney+ 4 |
| Plattform-zuerst (Sender/Streamer) | deutsch, offiziell, passt zu Terminen | nur für Laufendes und Veröffentlichtes; Disney+ gibt nur das bisher Gelieferte (216 von 500) |
| Handbeleg-zuerst | belegt, Wächter vorhanden | Handarbeit, wächst langsam |
| Heuristik (Cour/Pause) | deckt „ohne Quelle“ | ist keine Beleg-Staffel, darf nur Hinweis sein |

Empfehlung: **C + „Quelle in Reihenfolge Plattform/Disc → Handbeleg → TMDB als Vorschlag“**, ausgerollt in Wellen (zuerst die 5 sauberen TMDB-Fälle plus Pokémon und Horizonte, dann Plattform-Fälle).

## 8. Durchgerechnet an echten Serien (`titles-core.json`)

**Pokémon (527 und 11 weitere Sammeltitel der Hauptserie).** Heute 276 + 192 + 191 + 84 + 24 + 14 + 20 + 93 + 47 + 146 + 136 + 11 = 1.234 Folgen in 12 Sammeltiteln, 13 „Staffeln“ in der Reihenkarte. Aufteilung: 25 deutsche Staffeln (TMDB 60572, Summe 1.235) + 4 Horizonte = **29 Staffelzeilen** unter dem Werk. Summenprobe an den Grenzen: 527 = 82+36+41+52+65 = 276 ✓, Sonne & Mond 97634 = 43+49+54 = 146 ✓, XY 19291 = 48+45 = 93 ✓, Reisen + Abenteuer = 136+11 = 147 = 48+42+57 ✓. Offen: Advanced Generation (192 gegen 191, aniSearch zählt „Deoxys“ doppelt), Staffel 19 (47 von 49). Folgen je Staffel 34…82, nicht ~35; Namen (Indigo-Liga …) fehlen im Repo, also „Pokémon – Staffel n“ plus Saga „Schwarz & Weiß“ dort, wo die Disc sie nennt. Modell A hätte 29 neue Titel (Cover/Genre ×29), Modell C 29 dünne Zeilen.

**Naruto Shippuden (1735, 500 Folgen).** TMDB: 20 Staffeln, aber 8, 11, 13 und 87 Folgen (Staffel 20 = 87 ist ein Sammelbecken). Disney+ DE: 4 Pakete, 216 von 500. Quelle 1 liefert nur Folge 1–216; 53 und 112 decken sich mit TMDB, 164 und 216 nicht. Vorschlag: `belegt` für 1–53, 54–112 (beide Quellen einig), 113–164, 165–216 (nur Disney+, `plattformStaffel`), Rest 217–500 `offen` — nicht aus TMDB nachzeichnen, solange die deutsche Grenze fehlt. Ergebnis: vier Staffelzeilen ≈ 53/59/52/52 Folgen statt einer mit 500, die Synchro-Bereiche (Disney+ 1–59, Netflix 480–500) hängen an den passenden Zeilen. Naruto (20, 220 Folgen): TMDB 52/52/54/62, Disney+ „Staffel 4“ = 57 → **Widerspruch** (57 gegen 62), muss in der Konfliktliste stehen, nicht entschieden werden.

**Bleach (269, 366 Folgen).** TMDB: Staffel 1 = 366 (keine Teilung), Staffel 2 = 50 (Tausendjähriger Blutkrieg, bei uns ein eigener Titel; Summe 416 gegen 366). Disney+: ein Paket „366 Folgen“. Keine Quelle teilt; eine Teilung hier wäre erfunden. Ergebnis: **bleibt ein Eintrag mit 366 Folgen**, Gruppierung der Folgenliste nur als Blockanzeige („Folge 1–50“), Hinweis im Wächterbericht „lange Serie ohne belegte Staffel“. Das ist der Fall, an dem „alle Serien aufteilen“ scheitert und auf **„wo es Sinn macht“** zurückfällt.

**Horizonte (158871 → 7000001–3, Staffel 4).** 45/44/47 und offene Staffel 4 ab Folge 137; Grenzen bei Wikipedia, TOGGO und aniSearch einig. Modell C: eine Werkzeile, vier Staffelzeilen (die Staffel-4-Zeile mit `grenzeArt: offen`), **zwei** TV-Releases (je Sender einer) statt sechs, `episodeCount` ≤ Staffelbereich. Das ist zugleich die erste Rechnung des Wächters 6.3.

**Eyeshield 21 (15, 145 Folgen).** TMDB: eine Staffel; Netflix dubbt nur Folge 1–36. Keine Teilung; Synchro-Lücke bleibt `dubRanges` (Folgenbereich), nicht Staffel. Zeigt, dass **Synchro-Bereich ≠ Staffelgrenze** ist und das Modell beides getrennt führen muss.

## 9. Risiken, die ein naheliegender Entwurf übersieht

1. **„TMDB aufteilen“ klingt fertig, trägt 5 von 81** (und zählt falsch dort, wo es Titel mischt: Bleach 416, Pokémon 1235). Eine automatische Teilung würde falsche Grenzen als belegt ausgeben.
2. **Release-Duplikat je Staffel** (heute bei Horizonte sichtbar): Zählung × Staffelzahl, Dopplungen im Kalender und im Newsletter.
3. **Staffelnamen erfinden** (Folge: „Staffel 3 – …“-Form, Pokémon-Sagas). Offizielle Namen gibt es für viele Staffeln nicht; Platzhalter dürfen nie wie Belege aussehen.
4. **Plattform- und Datenbank-Zählung widersprechen sich** (Disney+ „Staffel 4“ = 57 gegen TMDB 62; 164/216 mitten in TMDB-Staffeln): ohne Zuordnungsfeld landet der Disney+-Termin auf der falschen Staffel.
5. **Laufende Serien**: Staffelende nicht belegt; ein „bis“ zu erraten verschiebt später alle Folgenbereiche. `offen` ist ein Zustand, kein Mangel.
6. **UIDs und Adressen**: UID-Wechsel dupliziert abonnierte Kalendereinträge; Adresswechsel bricht geteilte Links und Teilen-Seiten; Abo auf Werk ohne Absicht in „nur Staffel 1“ verwandelt.
7. **Suche explodiert** (Pokémon 29 Treffer), Reihenkarte zählt doppelt (13 gegen 25), Statusfilter zeigt „läuft“ für ein Werk mit nur einer laufenden Staffel.
8. **Zählung durchlaufend gegen je Staffel**: Sender nennen mal „Folge 38“, mal „Staffel 1 Folge 38“; wer nur eine speichert, ordnet News-Meldungen (Aussage zum Tag, nie umschreiben) falsch zu.
9. **Ladelast**: Modell A kopiert Metadaten ins Start-Bundle (ARCHITEKTUR 2b: 554 KB → 2,7 MB durch neue Release-Sorte). Eine Prüffrage vor dem Umbau: Bytes von `titles-core` und Start-Budget vorher/nachher.
10. **Synchro-Status je Staffel wird strenger sichtbar**: Wo heute „Synchro ja“ am Werk steht, zeigt die Aufteilung Staffeln ohne Beleg. Das ist gewollt, aber ein sichtbarer Rückgang, der erklärt werden muss.
11. **Quellen-Unabhängigkeit** ist erst erreicht, wenn die Grenzen im Repo stehen (Handbeleg/Plattform) und kein Bau-Lauf sie bei jedem Lauf neu aus AniList/aniSearch ableitet.

## 10. Reihenfolge, die Umbau und Verhaltensänderung trennt

1. Wächter und Quelle zuerst (`data/staffeln.yaml` + Leser, Zählungs-Konflikte listen), noch ohne Anzeige.
2. Release-Zuordnung: Horizonte-Releases auf eins je Sender (Verhalten ändert sich, eigener Commit, Messung vorher/nachher).
3. Staffelzeilen im Bau, Ereignisse mit `staffelAk` (Umbau; ICS-UIDs und Ereignisse bleiben identisch).
4. Anzeige (Kachel, Panel, Suche, Statusfilter), Welle für Welle: Pokémon, Naruto Shippuden, die fünf sauberen TMDB-Fälle, dann Plattform-Fälle.
5. Mehrstufige Beobachtung nach jeder Welle (erster Fall, nach ~5 Fällen, nach einem Tag, nach einer Woche).
