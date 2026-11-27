# F153: Staffel-Plan für alle Serien

Stand 23.11.2026. Nur Plan, nichts umgebaut. Auftrag: Daniels Entscheidung F153 A („erst Horizonte, danach alle Serien, wo es Sinn macht, aufteilen; eigene beste Aufteilung; Relationen bleiben; offizielle Staffelbezeichner“).
Alle Zahlen stammen aus `public/data/titles.json` (2929 Titel, davon 1428 TV), `data/tmdb-folgen.json`, `data/anbieter-staffeln.json` (Netflix-Staffelliste je Serienkennung) und den `dubRanges` der Wege. Das Messskript lag im Scratchpad und ist nicht eingecheckt (Wegwerfskript); die Regel unten lässt sich als `pipeline/`-Bericht nachbauen (Schritt 1 der Empfehlung).

## Vorgabe Daniel 23.11.2026 19:39 (geht allem unten vor, ersetzt die Schwelle in 4.1)

„f153 darf keine generischen regeln einführen, jeder anime muss seperiert betrachtet und eingeschätzt werden, wir sammeln wissen aller quellen damit wir alle aktuell genutzten einteilungen kennen, entscheiden uns für eine der quellen die am meisten sinn macht, oder wählen eine eigene einteilung. wir müssen staffelteilung logisch und nützlich machen, jede sinnvolle teilung sollte gemacht werden. gleichzeitig sollen verbindungen erhalten bleiben … favorit horizonte (egal ob favorit staffel 1,2,3,4) zB über staffel 5, sobald sie erscheint“

Daraus folgt:
- **Keine Schwelle entscheidet.** „≥ 60 Folgen“, „≥ 10 je Staffel“ und Ähnliches dienen höchstens als Suchhilfe für die Reihenfolge, nie als Grund, eine Serie zu teilen oder nicht zu teilen. Auch eine Serie unter 60 Folgen wird geteilt, wenn die Teilung logisch und nützlich ist.
- **Je Anime eine eigene Einschätzung:** Alle Einteilungen der Quellen werden gesammelt (deutsche Plattformen, Disc, TV-Sender, Wikipedia, TOGGO, TMDB, AniList, aniSearch, MAL). Dann wählen wir die sinnvollste davon oder eine eigene, mit Begründung je Serie.
- **Gruppen-Favorit:** Ein Favorit auf irgendeine Staffel einer Gruppe (z. B. Horizonte Staffel 1–4) gilt für die ganze Gruppe und meldet künftige Staffeln (Staffel 5), sobald sie erscheinen. Gruppe heißt hier die Serie (Horizonte), nicht das ganze Franchise (Pokémon). Das gilt bei „Abschnitt“ wie bei „Titel“ (F157).
- **Verbindungen bleiben:** Der Sprung zur Hauptserie und zu Nachbarserien bleibt erhalten.

## Kurzfassung

- **Nur 61 TV-Titel haben mehr als 60 Folgen** (34 über 100, 9 über 200). Das ist die ganze Menge „wo es Sinn macht“. Unter 60 Folgen gibt es keinen Kandidaten: Von 90 Titeln mit ≥ 3 TMDB-Staffeln trägt TMDB bei 89 die ganze Reihe (Summe > 1,2 × Folgen des AniList-Eintrags), AniList teilt dort schon selbst; 1 Rest habe ich nicht einzeln angesehen.
- **Von den 61 hat nur rund ein Fünftel brauchbare Grenzen in den vorhandenen Daten** (12: TMDB-Staffeln summieren sich exakt zur Folgenzahl und/oder die Plattform-Staffeln tun es). Von diesen 12 widersprechen sich 3 (Naruto, Yū Yū Hakusho, Naruto Shippuden). Rein automatisch wäre also jede vierte Teilung falsch oder unentschieden.
- **Empfehlung: Mischform C.** Ein Werkzeug schlägt Grenzen vor und stuft sie nach Beleglage ein; übernommen wird nur als Hand-YAML im Horizonte-Format mit den vorhandenen Wächtern. Keine automatische Teilung.
- **Gegenrichtung (AniList teilt, Deutschland nicht): nicht zusammenlegen.** Zusammenlegen vernichtet live Kennungen; stattdessen Anzeige als Staffelgruppe (siehe 4.4, dort die einzige offene Frage).

## 1. Bestand

### 1.1 Klassen der 61 TV-Titel über 60 Folgen

Gemessen, jeder Titel in genau einer Klasse (12 + 6 + 16 + 27 = 61):

| Klasse | Titel | Bedeutung |
|---|---|---|
| K1 Grenzen aus Daten belegbar | 12 | TMDB-Staffeln und/oder Plattform-Staffeln summieren sich exakt zur Folgenzahl; 3 davon widersprechen sich (Naruto, Yū Yū Hakusho, Naruto Shippuden). Darunter Pokémon 527 (erledigt) und der eigene Titel M.A.S.K. 5000003 |
| K2 mehrere TMDB-Staffeln, Summe passt nicht | 6 | Bleach (366/50), Boruto (Plattform 21 Staffeln, Summe 281 ≠ 293), InuYasha, Chibi Maruko-chan, Inazuma Eleven, Pokémon Reisen (erledigt) |
| K3 TMDB kennt nur 1 Staffel | 16 | Yu-Gi-Oh! (224), GX, 5D’s, Arc-V, Dragon Ball, Dragon Ball Super, Eyeshield 21 …; keine Grenze in den Daten, teils wirklich eine Staffel |
| K4 keine TMDB-Daten | 27 | Dragon Ball Z (291), Yo-Kai Watch (214), Hamtaro (193), die übrigen Pokémon-Serien (in `pokemon-staffeln.yaml`, erledigt), Ranma 1/2 |

Schon erledigt und in den Zahlen enthalten: die Pokémon-Familie (12 Einträge in `data/curated/pokemon-staffeln.yaml`, Staffelliste ohne neue Kennungen) und Horizonte (158871, vier Staffeltitel live). Die Titelzahl je Klasse ist die Zählung des Messskripts; welche der Pokémon-Titel in welche Klasse fallen, habe ich nicht einzeln ausgewertet.


### 1.2 Top 30 (Titel mit Synchro, nach Folgen)

Spalten: AniList-ID, Folgen, TMDB-Staffeln (Folgen je Staffel), Plattform-Staffeln (Netflix), Klasse.

| ID | Titel | Folgen | TMDB | Plattform | Klasse |
|---|---|---|---|---|---|
| 1735 | Naruto Shippuden | 500 | 20: 32/21/18/17/24/31/8/24/… /20/87 | 21: wie TMDB, dann 66/21 | K1, Quellen verschieden |
| 269 | Bleach | 366 | 2: 366/50 | – | K2 |
| 97938 | Boruto | 293 | 1: 293 | 21 Staffeln (Summe 281 ≠ 293) | K2 |
| 813 | Dragon Ball Z | 291 | – | – | K4 |
| 527 | Pokémon | 276 | 25 | – | K1, erledigt |
| 481 | Yu-Gi-Oh! | 224 | 1 | – | K3 |
| 20 | Naruto | 220 | 4: 52/52/54/62 | 9: 26/26/28/26/29/25/26/26/8 | K1, Quellen verschieden |
| 19157 | Yo-Kai Watch | 214 | – | – | K4 |
| 918 | Gintama | 201 | 11 (S1–S4 = 49/50/51/51 = 201) | – | K1, nur TMDB, 0 deutsche Folgentitel ab S2 |
| 508 | Hamtaro | 193 | – | – | K4 |
| 1564, 1565 | Pokémon AG, D&P | 192, 191 | – | – | erledigt (yaml) |
| 482 | Yu-Gi-Oh! GX | 180 | 1 | – | K3 |
| 6702 | Fairy Tail | 175 | 8 (S1–S4 = 48/48/54/25 = 175) | – | K1, nur TMDB |
| 97940 | Black Clover | 170 | 2: 170/26 | 4: 51/51/52/16 | K1, nur Plattform |
| 249 | InuYasha | 167 | 2: 167/26 | – | K2 |
| 3972 | Yu-Gi-Oh! 5D’s | 154 | 1 | – | K3 |
| 223 | Dragon Ball | 153 | 1 | – | K3 |
| 11061 | Hunter × Hunter | 148 | 3: 62/74/12 | – | K1, nur TMDB |
| 20552 | Yu-Gi-Oh! Arc-V | 148 | 1 | – | K3 |
| 97634 | Pokémon Sonne & Mond | 146 | – | – | erledigt (yaml) |
| 15 | Eyeshield 21 | 145 | 1 | Netflix 1 Staffel (36) | K3 |
| 149939 | Ranma 1/2 (Staffel 2+) | 143 | – | – | K4 |
| 951 | Chibi Maruko-chan | 142 | 4: 142/1557/51/59 | – | K2 |
| 112153 | Pokémon Reisen | 136 | 25 | – | erledigt (yaml) |
| 21175 | Dragon Ball Super | 131 | 1 | – | K3 |
| 2116 | Captain Tsubasa | 128 | 5: 26/26/26/26/24 | – | K1, nur TMDB |
| 5231 | Inazuma Eleven | 127 | 4: 127/47/51/43 | – | K2 |
| 3436, 6262 | Gesucht, entdeckt, erfunden; Ausflug ins Märchenland | 127 | – | – | K4 |

Weitere K1-Fälle: Yū Yū Hakusho 392 (112; TMDB 25/41/28/18, Netflix 26/40/28/18), D.Gray-man 1482 (103; 51/52), Cardcaptor Sakura 232 (70; 35/11/24).

### 1.3 Gegenrichtung: AniList teilt, Deutschland nicht (oder weniger fein)

- **Netflix:** 55 Serien tragen ≥ 2 AniList-Teile und haben Staffeldaten; bei **21** gibt es mehr AniList-Teile als Netflix-Staffeln. Beispiele: Mushoku Tensei (4 Teile 11+12+13+12 gegen 2 Netflix-Staffeln 23/25), Tiger & Bunny (25+13+12 gegen 25/25), Kengan Ashura, Dr. Stone, Beastars, Haikyu!! (die Teile enthalten 1-Folgen-Specials, die die Zählung verfälschen, hier nicht herausgerechnet).
- **TMDB:** 85 Serien tragen ≥ 2 AniList-Teile; bei **24** hat TMDB weniger Staffeln als AniList Teile, z. B. Bungo Stray Dogs 12+12, 86 Eighty-Six 11+12, Komi 12+12, Vanitas 12+12 (je 1 TMDB-Staffel).
- **Gleiche Plattformadresse:** 220 Plattformadressen mit Synchro hängen an ≥ 2 AniList-Titeln (Netflix 66, Crunchyroll 114). Das ist die gewollte „Plattform-Serienkennung = Franchise“-Regel, kein Fehler.

Beide Quellen führen Cour-Teile gern unter einer Staffel; die deutsche Veröffentlichung folgt dem aber nicht immer (Netflix teilt bei Mushoku Tensei 23/25, also je zwei Cours).

## 2. Ansätze

**Untergrenze (einfachster denkbarer Weg):** nichts am Datensatz ändern, nur im Panel die vorhandenen Plattform-Staffeln als Liste zeigen. Verfehlt Daniels Ziel (Folgen je Staffel, eigene Einträge), taugt nur als Vergleichswert. **Eine Stufe darüber** liegt die Pokémon-Mechanik (Staffelliste in der Detaildatei, `staffelQuelle`/`staffelBis`, keine neuen Kennungen, `pipeline/lib/pokemon-staffeln.ts`): „Staffel 1–5“ als Spanne, aber der Eintrag bleibt 276 Folgen lang und der Kalender sieht keine Staffeln. Das erfüllt „nicht mehr 100+ Folgen bei einem Eintrag“ nicht und ist deshalb keine Kandidatin für Daniels Ziel.

| | A Hand-YAML je Serie (Horizonte-Mechanik) | B automatisch aus TMDB / Plattform | C Mischform (empfohlen) |
|---|---|---|---|
| Grenzen und Namen | Hand, mit gelesener Quelle je Grenze (Wikipedia-Episodenliste, TOGGO, Plattform) | TMDB-Staffeln oder Netflix-`anbieter-staffeln.json`, Name „<Titel> – Staffel N“ | Werkzeug schlägt vor und stuft nach Beleglage; Übernahme als Hand-YAML mit Beleg im Kopf |
| Aufwand | je Serie Recherche + YAML + Gegenprobe; Horizonte brauchte PR 4603 und danach einen Nachzug der Namen | einmal bauen, dann nichts | Werkzeug einmal, danach je Serie nur Prüfen der gelben Fälle |
| Fehlerrisiko | niedrig je Serie, aber 61 Handarbeiten | **hoch:** 3 von 12 Fällen widersprechen sich (3.1–3.3), TMDB teilt Black Clover gar nicht, Gintama hat 0 deutsche Titel ab S2 | niedrig: grün nur bei gleicher Aussage zweier Quellen und passender Summe, alles andere per Hand |
| Kennungen/URLs | neue Kennungen 7.000.xxx je Staffel, Basis behält AniList-ID | wie A | wie A |
| Kalender/ICS | Termine behalten `ev.id`, also ICS-UID `<ev.id>@anime-kalender-de` stabil (`pipeline/bau/staffel-titel.ts`, Riegel „vorher = nachher“) | wie A | wie A |
| Suche/Relationen | Suche über die neuen Titel; Franchise bleibt (`franchiseId`), Sprung Horizonte → Pokémon besteht | wie A | wie A |
| Wächter | `check-horizonte-staffeln*.ts` verallgemeinern | brauchen Wächter, die den Widerspruch erkennen (Summe allein fängt ihn nicht, s. 3.2) | Wächter A + „Vorschlag und Yaml gleich“ |

Wirkung auf live Kennungen, die der Plan nicht ändert: Die Basis-Staffel behält die AniList-Kennung (Horizonte: Staffel 4, die laufende). Bei abgeschlossenen Serien empfehle ich Staffel 1 als Basis, weil dort die bestehenden Links, Kalender-Abos und Handbelege (`dub-confirmed.yaml`, `dubRanges`) am häufigsten hängen. Das ist eine Annahme, die der erste Probelauf per `tools/bau-vergleich.mjs` belegen muss.

## 3. Durchrechnung an echten Kandidaten

Alle Zahlen aus den eingecheckten Cache-Dateien, Stichproben von Hand gegen die Folgenlisten. Die Quellseiten selbst waren aus dem Cloud-Lauf nicht abrufbar (Hosts gesperrt); die Gegenprobe gegen die Originalseiten steht also aus.

### 3.1 Naruto Shippuden (1735, 500 Folgen)

TMDB: 20 Staffeln. Netflix: 21 Staffeln. Staffel 1–19 sind in beiden gleich (32/21/18/17/24/31/8/24/21/25/21/33/20/25/28/13/11/21/20). TMDB-Staffel 20 hat 87 Folgen, Netflix 66 + 21 = 87. Die letzten 21 (Folge 480–500) sind genau der Bereich, den Netflix mit Synchro führt (`dubRanges` 480–500). → Die feinere Teilung (21 Staffeln) gehört hierher, weil dort die Synchrogrenze liegt. **B über TMDB allein ergäbe 20 Staffeln mit einer 87er-Staffel (falsch), B über Netflix allein stimmt.** A und C ergeben 21 Staffeln; Namen („Staffel N“) belegt keine Quelle, Namenssuche nötig. Folgenzahl 500 = Summe, geprüft.

### 3.2 Yū Yū Hakusho (392, 112 Folgen)

TMDB 25/41/28/18, Netflix 26/40/28/18, beide summieren 112. Netflix beginnt Staffel 2 bei Folge 27, TMDB bei Folge 26 (S2E1 „Toguro Returns“ = Gesamtfolge 26, gelesen in `data/tmdb-folgen.json`). TMDB hat für diese Serie nur „Folge N“ statt deutscher Titel, Netflix führt Synchro nur für Folge 1. **Der Wächter „Summe = Folgenzahl“ fängt diesen Fehler nicht; er braucht den Vergleich der Grenzen.** → Hand: aniSearch-Folgenliste oder Disc-Aufteilung lesen. Wirkung bei Fehlentscheid: Folge 26 läge in der falschen Staffel, mit ihr Termin und dubRange.

### 3.3 Black Clover (97940, 170 Folgen, plus AniList 195604 „Staffel 2“)

TMDB: Staffel 1 = alle 170 Folgen (keine Teilung), Staffel 2 = 26 Folgen, nur 8 mit deutschem Titel (neue Staffel, Start 03.10.2026). Netflix: 51/51/52/16 (Summe 170). Disney+ und Pluto TV führen Synchro für Folge 1–51, das ist genau Netflix-Staffel 1. Netflix-Synchro 1–155, Staffel 3 endet laut Netflix bei 154: **Folge 155 liegt zwischen den Quellen, offen** (TMDB-Folge 154 „Auf ein Morgen!“, 155 „Die Auserwählten“, 24.11.2020). **B über TMDB teilt nicht, B über Netflix teilt richtig.** Die Netflix-`dubRanges` 1–155 würden mit `bereicheDerStaffel` in Staffel 3 (1–154 → 103–154) und Staffel 4 (155) geschnitten. Die Relation zu 195604 bleibt, deren AniList-Bezeichnung „Staffel 2“ kollidiert mit der Zählung 1–4 der Plattform und ist gegen die deutsche Plattformbezeichnung zu prüfen.

### 3.4 Fairy Tail (6702, 175 Folgen; Gegenbeispiel für B)

TMDB 48/48/54/25 = 175 und 51/39/12 = 102 für AniList 20626, 51 für die letzte Staffel: TMDB deckt sowohl die AniList-Einträge als auch die Teilung darin, alle Folgentitel deutsch. Hier genügt TMDB, die Grenzen sind aus einer Quelle abgeleitet und als solche zu kennzeichnen. Namen der deutschen Staffeln stehen nirgends.

## 4. Empfehlung

**Mischform C, Reihenfolge nach messbarer Regel.**

### 4.1 Schwelle „wo es Sinn macht“ (messbar)

Ein TV-Titel wird geteilt, wenn alle drei Bedingungen gelten:

1. mit Synchro und ≥ 60 Folgen **oder** (Plattform führt ≥ 3 Staffeln und der Titel hat ≥ 36 Folgen);
2. mindestens eine Quelle liefert Staffelgrenzen, die sich exakt zur Folgenzahl summieren (Plattform oder TMDB), oder eine Wikipedia-/TOGGO-Liste belegt sie;
3. jede Staffel hat ≥ 10 Folgen (kürzere gehören an die Nachbarstaffel, außer die Quelle führt sie als eigene Staffel).

Titel unter 60 Folgen bleiben, wie sie sind (Messung: kein Kandidat). Staffeln, deren Grenze nur aus TMDB stammt, tragen den Hinweis „abgeleitet“ wie bei Pokémon.

### 4.2 Reihenfolge

1. **Werkzeug und Wächter** (einmal): Bericht `staffel-kandidaten` (`pipeline/`), der die Regel aus 4.1 auf `titles.json` anwendet und je Titel TMDB, Plattform, Synchro-Ränder und Beleglage nennt; Wächter „Yaml = Vorschlag“ und „Grenze liegt nicht gegen eine zweite Quelle“ (deckt 3.2).
2. **Welle 1, Quellen stimmen überein:** Naruto Shippuden (21 Staffeln, Synchrogrenze belegt), Black Clover (4 Staffeln + Relation), Fairy Tail (3 Titel), Captain Tsubasa, Hunter × Hunter, Gintama (deutsche Namen fehlen noch; Synchro prüfen, ob sie überhaupt deutsch ist).
3. **Welle 2, Quellen widersprechen sich oder fehlen:** Naruto (4 gegen 9), Yū Yū Hakusho, Bleach, Boruto, InuYasha, Inazuma Eleven, Chibi Maruko-chan: Handrecherche nach Skill `synchro-belegen` / Plattformseiten, dann Yaml.
4. **Welle 3, nur eine Zahl:** K3 und K4 (Yu-Gi-Oh!, Dragon Ball, Dragon Ball Z …). Eine einzelne TMDB-Staffel ist keine Aussage „eine Staffel“; erst teilen, wenn eine deutsche Staffelliste (Disc, TV-Programm, Wikipedia) gelesen ist.
5. **Gegenrichtung:** nach Welle 1 als eigene Entscheidung.

Je Welle ein PR, Probelauf mit `tools/bau-vergleich.mjs`, vorher/nachher gleiche Termine und Folgen (Riegel „vorher = nachher“ gibt es schon).

### 4.3 Namen („wir folgen offiziellen Staffelbezeichnern“)

Plattformen und TMDB nennen fast nie Namen (Netflix „St. N“, TMDB „Staffel N“). Ohne gelesenen Beleg bleibt „<Titel> – Staffel N“, wie bei Horizonte Staffel 1/2/4. Namen kommen nur aus gelesenen Seiten (TV-Guide, Plattform, Disc-Titel).

### 4.4 Offene Fragen (Antwort kann „nein“ lauten)

- **Gegenrichtung:** Sollen zwei AniList-Teile derselben deutschen Staffel (Mushoku Tensei, Bungo Stray Dogs …) als Staffelgruppe verbunden werden („Staffel 1, Teil 1/2“) statt zusammengelegt zu werden? Empfehlung: ja, nur Anzeige, keine Zusammenlegung (live Kennungen bleiben). Ein „nein“ wäre vertretbar, weil der Nutzen klein ist.
- **Basis-Staffel abgeschlossener Serien:** Staffel 1 (Empfehlung). Wer lieber die neueste will, muss das Abo- und Linkverhalten gegen Horizonte (Staffel 4 = Basis) vergleichen.
