# Selbstbestätigende Wachen (Nacht-Orchester, Aufgabe 13, 21.11.2026)

**Frage:** Welche Prüfungen unter `pipeline/check-*.ts` und `tools/` haben eine Soll-Liste, die derselbe Bau erzeugt, den sie prüfen? Eine solche Wache bestätigt den Bau nur sich selbst und kann nicht anschlagen. Vorbild: `check-cover-luecken-bestand.ts`.

**Vorgehen:** 881 Dateien `pipeline/check-*.ts` (119 davon `*-bestand`), dazu `tools/check-*`. Durchsucht wurden die Wachen, die gebaute Daten lesen (`check-*-bestand.ts`, `check-*-wache.ts`), nach zwei Merkmalen: Soll aus einer Funktion, die auch der Bau aufruft (Import aus `pipeline/bau/`), und Soll aus einer Datei, die der Bau schreibt (`ERZEUGTE_DATEIEN` in `tools/pr-nachrechnen-bot-erzeugt.mjs`). 24 Wachen importieren aus `bau/`; 55 lesen erzeugte Dateien aus `data/`. Eingeordnet wurde nach Kopfzeile und Importen, **einzeln belegt (Fall und Mutant) ist nur Nr. 1**.

## Einzeln belegt

| # | Wache | Befund |
|---|---|---|
| 1 | `check-nur-omu-bestand.ts` | **Selbstbestätigend, umgestellt in diesem PR.** Soll = `nurOmuTitel`, dieselbe Funktion, mit der `bau/hinter-toggle.ts:46` den Titel verschiebt. Fehler in der Funktion trafen Bau und Wache gleich, die Wache blieb grün. Beleg im PR: Mutant an `bau/omu-ohne-termin.ts:33`, alte Wache Exit 0, neue Exit 1. |
| 2 | `check-cover-luecken-bestand.ts` | Teil „Lückenliste“: Liste und Prüfung stammen aus demselben Datensatz (`bau/13-11-cover-luecken.ts` schreibt die Liste aus den fertigen Dateien); „veraltet“ kann nur anschlagen, wenn der Bauschritt selbst kaputt ist, „fehlt“ ist nur eine Warnung. Der Hauptbestand ist seit 16.11.2026 durch die Handliste `data/cover-ohne-bekannt.json` unabhängig abgesichert, Reihen und `ohne-synchro.json` nicht. |

## Verdächtig (nach Kopfzeile und Import, nicht einzeln mutiert)

Soll aus einer Bau-Funktion, die auch der Bau aufruft; eine Gegenfassung wäre nötig:

- `check-adn-kennung-bestand.ts`: ruft `loeseAdnTitelIds` und `adnShowsMitKatalogKennung` auf, beide aus `bau/07-adn.ts:78/82`; prüft die Funktion, nicht `public/data`.
- `check-anisearch-dubletten-bestand.ts`: `findeAnisearchDubletten`, derselbe Aufruf steht in `bau/nebendateien.ts` (die Prüfung `anisearchZeilenDoppelt` auf der Ausgabe ist dagegen eigenständig).
- `check-reihen-namen-bestand.ts`: `anisearchNamensKanten`, dieselbe Funktion bildet die Reihen in `bau/03-1-reihen-bilden.ts:78`.
- `check-cartoon-zwilling-bestand.ts`: `fehlendeAnbieter`, dieselbe Funktion wie `bau/cartoon-zu-anime.ts:36`.
- `check-remake-zaehlung-bestand.ts`: spielt `markiereRemakes` auf den Rohdaten nach.
- `check-anisearch-katalog-abgleich-bestand.ts`: `ergaenzeAnisearchTitel` gegen die vom Bau geschriebene Zuordnung.
- `check-cartoon-staffeln-bestand.ts`, `check-cartoon-wege-bestand.ts`, `check-prime-teilseiten-bestand.ts`, `check-cr-teilseiten-bestand.ts`: die Prüfliste (`PRUEFLISTE`) schreibt der Bau; je eine Hälfte der Zusicherungen misst Bereiche gegen Folgenzahlen oder Rohdaten (unabhängig), die andere gegen die Liste (selbstbestätigend).

## Gelesen und unabhängig

- `check-angebot-bestand.ts` (Releases gegen Ereignisse, `titles-core.json`),
- `check-eigene-titel-bestand.ts` (Handdatei `data/eigene-titel.yaml`),
- `check-cr-neu-bestand.ts` (Sammlerdatei `crunchyroll-neu.json` gegen `events.json`),
- `check-staffel-von-hand-bestand.ts` (Handdatei gegen `franchises.json`),
- `check-streaming-luecke-bestand.ts` (Ratsche gegen Handstand, den kein Bau schreibt),
- `check-anisearch-spalte.ts` / `check-anisearch-reihen.ts` (feste Untergrenzen; Referenz ist AniList).

Alle anderen `*-bestand` wurden nicht gelesen.

## Empfehlung

Zuerst Nr. 2 (Reihen und `ohne-synchro.json` bekommen wie der Hauptbestand eine Handliste oder eine Untergrenze), dann `check-adn-kennung-bestand.ts` (Soll aus `data/adn-catalog.json` `anisearchId` über die Brücke, nicht über `loeseAdnTitelIds`). Je Wache eigener PR mit Fall, der vorher grün durchrutschte.

## Umstellung Nr. 1

Neu: `pipeline/lib/nur-omu-vorstand.ts` (eigene Fassung der Regel aus den Feldern von `titles.json` und `releases.json`, kein Import aus `bau/`), `pipeline/check-nur-omu-vorstand.ts` (Fall mit je zwei Gliedern pro Rolle und Prozessteil gegen eine Kulisse), `tools/mutationen/nur-omu-vorstand.json`. Die Wache liest weiter dieselben Dateien und gibt dieselbe Marke (`melde`), Exit-Code und Zeilen aus; auf dem echten Bestand bleibt sie grün (2926 Titel, 0 Verstöße).

## Tabelle mit Datei:Zeile (Nacht-Orchester, Aufgabe 12, 23.11.2026)

Methode: je Wache die Soll-Quelle (was sie als „richtig“ annimmt) und den Schreiber (Bau-Schritt, der dieselbe Funktion oder Datei erzeugt) per `git grep` bis zur Schreibstelle verfolgt. Urteil **selbst** = Soll und Ist aus demselben Bau, die Wache kann den Bau nicht widerlegen; **teils** = eine Hälfte der Zusicherungen misst unabhängig; **unabhängig** = Soll aus Hand- oder Rohdatei.

| Wache | Soll-Quelle | Schreiber | Urteil |
|---|---|---|---|
| `check-nur-omu-bestand.ts` | `lib/nur-omu-vorstand.ts` (eigene Fassung, seit Aufgabe 13) | `bau/hinter-toggle.ts:46` | unabhängig (umgestellt) |
| `check-cover-luecken-bestand.ts:48` (Lückenliste, Reihen, `ohne-synchro`) | `data/cover-luecken.json` | `bau/13-11-cover-luecken.ts:18` aus `public/data/*` | **selbst** (Hauptbestand: Handliste `cover-ohne-bekannt.json`, unabhängig) |
| `check-adn-kennung-bestand.ts:14-16` | `loeseAdnTitelIds` + `adnShowsMitKatalogKennung` | `bau/07-adn.ts:127-131` | **selbst** |
| `check-anisearch-dubletten-bestand.ts:33` | `findeAnisearchDubletten` | `bau/nebendateien.ts:240` | **selbst** (Teil `anisearchZeilenDoppelt` auf der Ausgabe unabhängig) |
| `check-reihen-namen-bestand.ts:27` | `anisearchNamensKanten` | `bau/03-1-reihen-bilden.ts:78`, `bau/anisearch-reihen-rein-bau.ts:75` | **selbst** |
| `check-cartoon-zwilling-bestand.ts:49` | `fehlendeAnbieter` | `bau/cartoon-zu-anime.ts:37` | **selbst** |
| `check-remake-zaehlung-bestand.ts:38-39` | `alleRemakePaare`/`markiereRemakes` | `bau/13-4-zusatzdateien.ts:407` | **teils** (Höchstgrenze `BEKANNT_HOECHSTENS` von Hand) |
| `check-anisearch-katalog-abgleich-bestand.ts:42` | `ergaenzeAnisearchTitel` | `bau/02-titel.ts:52` | **teils** (Handliste `anisearch-ids-hand.yaml` unabhängig) |
| `check-cartoon-staffeln-bestand.ts:24` | `data/cartoon-staffeln-pruefliste.json` | `bau/cartoon-staffeln.ts:49` | **teils**: Wohlgeformtheit gegen Rohfelder unabhängig, „steht auf der Prüfliste“ **selbst** |
| `check-cartoon-wege-bestand.ts:26` | dieselbe Prüfliste | `bau/cartoon-staffeln.ts:49` | **teils** |
| `check-prime-teilseiten-bestand.ts:26` | `data/prime-teilseiten-pruefliste.json` | `bau/09-7-prime-teilseiten.ts:53` | **teils** |
| `check-cr-teilseiten-bestand.ts:30` | `data/cr-teilseiten-pruefliste.json` | `bau/09-7-cr-teilseiten.ts:51` | **teils** (Bereiche gegen `crunchyroll-dub`-Rohdaten unabhängig) |

## Gegenproben: keine in diesem PR, mit Beleg

Für `check-adn-kennung-bestand.ts` wurde die einzige Gegenfassung aus der Ausgabe gemessen (Release in `public/data/releases.json` mit `platformUrl` `/video/<showId>` je Kalender-Show, die der Katalog mit `anisearchId` führt). Ergebnis am Bestand vom 23.11.2026: 13 Kalender-Shows, davon **vier ohne Titel und ohne Release** (887 Dreamland, 1218 Kill la Kill, 1319/1320 Madoka Film 1/2), die Funktionen lassen sie ohne `titleId` (gemessen mit `loeseAdnTitelIds`). Das ist kein belegter Fehler, nur nicht zugeordnet; eine strenge Gegenprobe müsste diese Ausnahmen aus einer Liste nehmen, und die Liste käme wieder aus dem Bau. Sie würde also entweder rot am Bestand oder selbstbestätigend. Eine unabhängige Handquelle (`showId` → Titel) liegt nicht im Repo.

Für die übrigen **selbst**-Wachen liegt ebenfalls keine Handdatei mit der Soll-Zuordnung im Repo (Reihen: nur die Bau-eigene Prüfliste; Cartoon-Zwillinge: `ZWILLING_AUSNAHMEN` sind Ausnahmen, kein Soll). Reihenfolge für später, je eigener PR, jeweils mit Fixture (zwei Glieder je Rolle) und Mutationsprobe: (1) `check-adn-kennung-bestand.ts` mit neuer Handdatei `data/adn-show-titel-hand.yaml`, (2) Reihen und `ohne-synchro` bei `check-cover-luecken-bestand.ts` mit Untergrenze von Hand, (3) `check-anisearch-dubletten-bestand.ts` Soll aus `data/anisearch-ids-hand.yaml`.
