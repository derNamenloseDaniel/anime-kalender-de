# Gegenentwurf: Horizonte je Staffel ein Eintrag (22.11.2026)

Auftrag Dirigent `horizonte-staffeln-gegenentwurf-2211`. Nur Entwurf, nichts gebaut. Gelesen: `CLAUDE.md`, `ARCHITEKTUR.md`,
`data/curated/horizonte-staffeln.yaml`, `shared/eigene-titel.ts`, `pipeline/bau/{eigene-titel*,mal-teilung,phasenfolge,folgen-dateien}.ts`,
`pipeline/lib/{pokemon-staffeln,ausgabe-kennung}.ts`, `web/src/lib/ak-umleitung.ts`, `worker/src/favoriten-lesen.ts`, `docs/wissen/datensatz.md`.
Gemessen an `public/data/*` und `data/kennungen.json` (Stand des Zweigs `origin/main`, 22.11.2026). Keine fremde Seite abgerufen.

## Ausgangslage (gemessen)

- **Ein Titel**: AniList 158871, `ak` 14839 (`data/kennungen.json`: `[14839,158871,17947]`), `eigenesWerk`, Reihe 527, `staffelQuelle` 1, `staffelBis` 4.
- **Staffelgrenzen** stehen nur in der Detaildatei `folgen/158871.json` (`s: [[1,1,45],[2,46,89],[3,90,136],[4,137]]`, 122 Folgentitel,
  `de: [[1,137]]`) und in `folgen/zaehlung.json` (`[137,137,1]`). Im Panel sind das Reiter je Staffel; in Liste, Kalender, Suche, ICS ist es ein Name.
- **Termine**: 3 Releases, 117 Ereignisse. TV Super RTL und TOGGO plus (je `firstEpisodeDate` 16.09.2026, 58 Folgen, `episodeCountAssumed`, je 58 Ereignisse
  mit `episode` 1–58) und RTL+ `pokemon-horizonte-s4-rtlplus` (Folge 137, 20.11.2026). Nach Staffeln gezählt: S1 2 × 45, S2 2 × 13, S3 0, S4 1.
  Kein Ereignis ab 22.11.2026; letzter Tag 21.11.2026. Die TV-Fortschreibung endet bei 58 (angenommene Zahl), nicht bei einer Staffelgrenze.
- **Wege**: Netflix `dubRanges` 2–44, RTL+ 1–136, TOGGO-Liste `watchLinks[].toggo[]` schon **mit `staffel`, `von`, `bis`** (Staffelzählung der Quelle, je Staffel von 1).
- **Folgt aus der Regel „Plattform-Serienkennung = Franchise, keine Staffel“** (CLAUDE.md): Der Netflix-/RTL+-Weg gehört der Serie, nicht einer Staffel; ein
  Staffel-Eintrag braucht deshalb einen Folgenausschnitt je Weg (`teilBereich`), den es für Cartoons gibt (`cartoon-wege.ts`), nicht für Anime-Titel.
- Berührt 158871: `titles.json`, `titles-core.json`, `releases.json`, `events.json`, `franchises.json`, `folgen/158871.json`, `folgen/zaehlung.json`,
  `disc/23.json`, `synopses/23.json`, `news.json`, `synonyme.json`, `sprecher/*.json` (17 Dateien nennen die Kennung), 5 `feeds/*.ics`
  (`all.ics`: 12 Horizonte-UIDs `auto-158871-…`, 1 `pokemon-horizonte-…`).

## 1. Einfachster denkbarer Weg (erfüllt das Ziel nicht)

Eine Staffelangabe am **Ereignis** statt neuer Titel: `ReleaseEvent.staffel` aus `firstEpisodeNumber` + Grenzen der YAML, Name in Kachel, ICS-Titel und
Newsletter „Pokémon Horizonte (Staffel 2)“. Etwa 40 Zeilen, ein Feld, keine neue Kennung, keine Umleitung, Abos unberührt.
**Warum nicht empfohlen:** Der Kalender bekäme Staffelnamen, die Datenbank-Liste, die Suche, die Reihe und die Detailseite blieben ein Eintrag; „getrennte
Einträge wie bei anderen Serien“ ist damit nicht erreicht. Wer nur den Kalender meint, nimmt diesen Weg.

**Ebenfalls verworfen: vier Zeilen in `data/eigene-titel.yaml`.** Der Mechanismus ist für Titel ohne AniList-Eintrag gebaut (Kennung 5 Mio. + nr, „Herkunft unbekannt“,
keine erratenen Wege, Termin nur aus Meldung oder Zeile, Cover nur über TMDB-Kennung). Die Staffeln hätten kein Genre, kein Studio, keine Folgenliste, keinen Ton-
beleg, und der Sammeltitel 158871 stünde zusätzlich da. Die vorhandene Auflösung `zuId` geht in die Gegenrichtung (eigener Titel → Katalogtitel).

## 2. Empfohlener Weg: neue Bau-Phase „Staffel-Titel“ am Ende der Wege

**Idee:** Der Bau zerlegt einen AniList-Sammeltitel, dessen Grenzen in `horizonte-staffeln.yaml` stehen, **nach** dem Wegabschluss in je einen Titel je Staffel.
Wie `entferneSammeltitel` (`bau/mal-teilung.ts`: „die Seiten sind das Werk, der Sammeltitel entfällt“), nur mit Staffeln statt aniSearch-Seiten (aniSearch führt
17947 nur als eine Seite; die Teilung greift hier nicht). Alles, was bis dahin richtig gebaut wird (Namensabgleich, Tonbelege, Wege, Termine), bleibt unter 158871 —
Zerlegung **vor** Phase 09 würde vier gleichnamige Titel um dieselben Belege konkurrieren lassen (`bewerteTreffer`, „ein Anime gehört genau einer Kennung“).

**Kennungen.**
- Interne Kennung je Staffel `STAFFEL_ID_BASIS + nr`, Vorschlag `STAFFEL_ID_BASIS = 7_000_000`, `id = BASIS + anilistId × 10 + nr` (Horizonte: 7.588.711–7.588.714).
  Der Bereich 6–10 Mio. ist frei, aber Prüfungen führen dort Testkennungen (9.000.0xx): 7 Mio. kollidiert nicht (`eigene-titel.ts`, Kommentar). Eigene Konstante und
  Prädikat `istStaffelTitel(id)` in `shared/` (ohne Node/DOM), damit `ohneEigene`-artige Filter („Erstmals mit deutscher Synchro“) sie ausnehmen können.
- Öffentliche `ak` aus `tools/kennungen-erzeugen.mjs` (liest `titles.json`; neue Zeilen `[ak, id, 0]`, nächste frei 26460 ff.). `al` bleibt **158871**
  (Quellenverweis auf AniList; `ausgabe-kennung.ts` setzt `al: id`, dort ist ein Feld `alVon` nötig, sonst zeigt der AniList-Link ins Leere).
- **Die alte `ak` 14839:** Entscheidung nötig (Abschnitt „Adressen und Abos“); Empfehlung: Umleitung auf die laufende Staffel.

**Was die Phase aus dem Sammeltitel macht** (neue Datei `pipeline/bau/staffel-titel.ts`, eine Funktion je Schritt, Daten als Parameter):
1. `titel`: Kopie je Staffel; `titleDe` „Pokémon Horizonte – Staffel n“ (Staffelnamen fehlen bewusst, bis eine Quelle sie trägt, `horizonte-staffeln.yaml`);
   `episodes` = `folgen` der Staffel (S4 ohne: offen, kein erfundenes Ende); `franchiseId` 527 und `eigenesWerk` unverändert; `deErstausgabe` nur, wo das
   Datum zur Staffel gehört (Messung unten); `jpYear`/`jpSeason` bleiben die des Werks (S2–S4 tragen sonst ein falsches Jahr: **offen, keine Quelle gelesen**).
2. `releases`: Zuordnung über Folgenbereich `[firstEpisodeNumber, +episodeCount−1]` gegen die Grenzen. Das TV-Release (1–58) überspannt S1 und S2 und wird **in zwei
   Releases mit eigenem Slug geteilt**; die Ereignisse folgen über `episode`. Das RTL+-Release (Folge 137) fällt ganz in S4.
3. `streams`: je Staffel nur die `dubRanges` im Fenster, auf die Staffel **zurückgezählt** (Netflix 2–44 → S1 2–44; RTL+ 1–136 → S1 1–45, S2 1–44, S3 1–47);
   die `toggo[]`-Zeilen gehen über ihr `staffel`-Feld (Zählung der Quelle, keine Umrechnung). Gleiche Adresse bei mehreren Titeln: `sharedWith` wie bei den
   Crunchyroll-Teilseiten (`09-7-cr-teilseiten.ts`), damit die Linkprüfung sie nicht doppelt meldet.
4. `folgen/<id>.json` je Staffel statt `s`: Folgen und Titel der Staffel, `de` zurückgezählt; `zaehlung.json` je Staffel (`[45,45]`, `[44,44]`, `[47,47]`, S4 `[1,1,1]`
   mit offener Marke). Die Reiter-Oberfläche (`folgen-staffeln.ts`) und `s` im Panel entfallen für Horizonte, der Kopf „137 Folgen auf Deutsch“ wird zu je Staffel.
5. Reihe: `franchises.json` führt statt 158871 vier Mitglieder; `reihen-von-hand.yaml` (Zeile 99) und `spinoff-von-hand.yaml` (Zeile 131) nennen 158871 und
   brauchen die vier Kennungen (der Wächter `check-reinids-grund` prüft die Handliste gegen `franchiseId`).
6. Der Sammeltitel 158871 **entfällt** aus der Ausgabe (nicht ausgeblendet): wie bei der Teilung, mit Verlust-Riegel („jeder Verwerfungspfad zählen“, Skill
   `stille-ausfaelle-verhindern`): Summe der Ereignisse, Folgenzahlen und Wege vorher = nachher.

**Handpflege:** `horizonte-staffeln.yaml` bleibt die einzige Grenzquelle (`staffelListen`, `staffelEnden`, `startStaffeln` aus `pokemon-staffeln.ts` werden gelesen,
nicht neu gebaut). Ein Staffelschluss in der Quelle (Wächter `check-horizonte-staffeln-bestand` meldet das heute als `⚠ WARNUNG`) legt die nächste Staffel an: das ist
dann **eine neue Zeile in der YAML und ein neuer Titel**, ohne Code.

**Betroffene Dateien (Vorschlag, Bau ohne Verhaltensmischung):**
`shared/staffel-titel.ts` (Konstante, Prädikat), `pipeline/lib/staffel-titel.ts` (reine Zerlegung: Titel, Releases, Wege, Folgen), `pipeline/bau/staffel-titel.ts`
(Phase, `phasenfolge.ts` hinter `schliesseWegeAb`, vor `baueMeta`), `pipeline/bau/folgen-dateien.ts` (je Staffel statt `s`), `pipeline/lib/ausgabe-kennung.ts`
(`al`), `data/curated/horizonte-staffeln.yaml` (+ `titel:`-Feld ist da, + `id`-Vorgabe optional), `data/reihen-von-hand.yaml`, `data/spinoff-von-hand.yaml`,
`web/src/components/detail/folgen-staffeln.ts` (Horizonte-Zweig entfällt, später), Wächter `check-horizonte-staffeln*.ts` (Zählung je Titel statt `s`).
Gesamtumfang geschätzt 400–500 Zeilen plus Wächter; **zwei Commits** (Umbau der Folgen-Datei, dann die Phase), vorher Bau-Vergleich.

## Adressen und Abos

- **`/t/14839/` (live):** heute die ganze Serie. Nach dem Umbau gibt es `14839` nur, wenn eine Staffel sie behält oder `zuAk` auf einen Nachfolger zeigt (Stufe 1 der
  Kennungen: `ak-umleitung.json`, Weiterleitung `/t/<alt>/`, `web/src/lib/ak-umleitung.ts` für Favoriten/Ausgeblendetes/Gesehen im Browser).
- **Der Worker liest dieselbe Umleitungskarte** beim Lesen der Favoriten (`favoriten-lesen.ts`): Newsletter und Push brauchen **keine** D1-Änderung, aber nur **1:1**
  (`Map<alt, neu>`); „ein Favorit wird vier“ gibt es nicht.
- **Zwei Wege:**
  - **A (empfohlen): 14839 → laufende Staffel (S4).** Wer Horizonte merkt, will wissen, wann es weitergeht; S1–S3 sind abgeschlossen, ihre Termine liegen
    vergangen (S1/S2 TV, keine Ereignisse ab 22.11.2026). Die Staffeln S1–S3 bekommen neue `ak`. Mit jeder neuen Staffel zeigt der Nachfolger wieder auf die
    laufende: das ist eine bewusste Handlung (`zuAk` setzen), kein Automatismus. **Kosten:** Das TV-Programm S2 (Wiederholung, bis Folge 58) fällt bei Abonnenten
    heraus, falls es nach dem 22.11. fortgeschrieben wird (`episodeCountAssumed`: derzeit bei 58 gestoppt).
  - **B: 14839 bleibt Staffel 1.** Kein `zuAk`, keine Umleitung, bestehende Links und der Favorit zeigen auf einen gültigen, aber **stillen** Titel (S1 ist durch):
    Abonnenten erhalten ab S4 nichts mehr und es meldet sich niemand — das ist der Ausfall, den das Projekt „rechtzeitig Bescheid geben“ nennt.
- **ICS:** Eine Kalenderdatei, die ein Besucher einmal heruntergeladen hat, trägt `UID:<ev.id>@anime-kalender-de` (`shared/ics.ts`). Die **Ereignis-IDs müssen
  bleiben** (`auto-158871-tv-super-rtl@2026-09-16`), sonst doppelt sich der Eintrag im Kalender des Besuchers. Darum bei der Teilung des TV-Releases die erste
  Hälfte unter dem alten Slug lassen, nur die zweite (Folge 46–58) bekommt einen neuen (`…-s2`). Die Abo-Feeds (`feeds/*.ics`) werden ersetzt, dort ist das unkritisch.
- **Newsletter-Text** („Neu bei RTL+“) nennt den Titelnamen: nach dem Umbau „Pokémon Horizonte – Staffel 4“ statt „Pokémon Horizonte“, und die Mail-Adresse
  `/t/<ak>/` wechselt. `titelAdresse(ev.titleId, …)` übersetzt über die Karte.
- Geteilte Links in WhatsApp & Co. (Open-Graph-Vorschau, `/t/14839/`): Variante A zeigt Staffel 4 mit deren Cover (gleiches Bild, `coverImage` der Serie).

## Messung: was ändert sich am Bestand

| Größe | heute | nach Umbau (Soll) |
|---|---|---|
| Titel in `titles.json` | 2.925 | 2.928 (−1 Sammeltitel, +4) |
| Ereignisse Horizonte | 117 | 117 (S1 90, S2 26, S3 0, S4 1) |
| Releases Horizonte | 3 | 5 (TV je Sender in 2 Teile geteilt, dazu RTL+ Folge 137; ob ein Sender-Paar zusammenbleibt, ist zu klären) |
| Detaildateien `folgen/` | 1 (122 Titel) | 4 |
| Reihe 527 Mitglieder | 1 Eintrag Horizonte | 4 |

Die Soll-Spalte ist **gerechnet, nicht gebaut**. Ein Bau-Vergleich (`tools/bau-vergleich.mjs`) gehört vor die Freigabe: Der Umbau darf an keiner anderen Reihe
etwas ändern (Kopf der Prüfliste: Dateien außerhalb der oben genannten Liste unverändert).

## Größte Risiken

1. **Streams ohne Staffelbezug.** Netflix `dubRanges` 2–44 und RTL+ 1–136 sind Folgen der Serie; das Zurückzählen ist Arithmetik auf belegten Bereichen,
   keine neue Behauptung — aber jede Rundung wäre eine erfundene Ton-Aussage. Muss mit einem Wächter laufen (Summe der Staffelbereiche = Bereich der Serie).
2. **Releases über Staffelgrenzen.** Das TV-Release 1–58 hat eine **angenommene** Folgenzahl (`episodeCountAssumed`); die Teilung bei Folge 45/46 darf kein
   Ende erfinden. Beide Teile tragen die Kennzeichnung weiter, die zweite offen.
3. **`al`-Feld und Quellenverweise.** Ohne `alVon` führen Quellenübersicht, Datenfehler-Meldung und Erweiterung auf eine nicht existierende AniList-Seite
   (`al` = interne Kennung ≥ 7 Mio.). Die Prüfungen mit Fake-Daten sehen das nicht; ein Test an echten Titeln nötig (`check-panel-eigenes-werk.ts` deckt „alle 55
   Kennungen der Handlisten“ ab, nicht diese).
4. **Verlorene Doppelmeldung.** Der Worker und `news.json` nennen 158871 (`news.json`: Meldungen mit der Kennung). Meldungen sind „Aussage zu ihrem Tag, nie
   umschreiben“ (`news-plan.md`): die alte Meldung darf nicht auf eine Staffel umgehängt werden, die sie nicht nennt. Alte Meldungen behalten die alte Kennung,
   die Umleitung deckt sie.
5. **Doppelte Anzeige im Katalog.** Hinter dem Schalter („ohne Synchro“) darf der Sammeltitel 158871 nicht wieder auftauchen (Katalog führt ihn über MAL 53876):
   dasselbe wie bei der Teilung nötig (`kein zweiter Titel mit der MAL`), sonst steht Horizonte einmal vollständig und einmal je Staffel da.
6. **Wartungslast je neuer Staffel.** Heute ist es eine YAML-Zeile; künftig auch ein neuer Titel, neue `ak`, evtl. neue `zuAk`. Das ist gewollt (Staffel =
   Eintrag), muss aber im Wächter-Lauf als `⚠ WARNUNG` sichtbar bleiben, sobald TOGGO/Wikipedia eine Staffel führen, die die YAML nicht kennt.
7. **Unbelegtes bleibt unbelegt.** Staffelnamen, Staffel-Startjahr in Deutschland (nur S4 1 Termin belegt; `deErstausgabe` ist das Datum der **Serie**, 02.02.2024,
   Polyband, ein Disc-Verlag), also kein Staffeldatum) und das Ende von S4: nichts davon aus Nachbarquellen schließen.

## Empfehlung in einem Satz

Neue Phase hinter dem Wegabschluss (Abschnitt 2), Variante A der Adressen (14839 → laufende Staffel), Ereignis-IDs unverändert, vorher Bau-Vergleich; wer nur
den Kalender meint, nimmt Abschnitt 1.
