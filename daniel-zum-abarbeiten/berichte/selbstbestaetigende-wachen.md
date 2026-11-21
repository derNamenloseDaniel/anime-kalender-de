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
