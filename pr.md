<!-- titel: fix(ics): TEXT-Felder maskieren und alle Kalenderdateien gegen RFC 5545 prüfen -->
Auftrag: ics-felder-falten

## Was sich ändert
- `shared/ics-pruefung.ts` (neu): RFC-5545-Prüfung mit 14 Zählern (Zeilenende, Zeile > 75 Oktette, Falz, UTF-8, TEXT-Maskierung, Steuerzeichen, UID/DTSTAMP/SUMMARY/DTSTART je VEVENT, doppelte UID, URL, Klammern, Kopf).
- `pipeline/check-ics-rfc-bestand.ts` (neu, `npm run check:ics-rfc`): geht alle `public/data/feeds/*.ics` durch.
- `pipeline/check-ics-rfc-faelle.ts` (neu, in `tools/check-logic-liste.txt`): schwierige Titel durch `buildIcs`, je Regel eine absichtlich kaputte Datei, gültige Sonderformen.
- `package.json`: Eintrag `check:ics-rfc`.
- `shared/ics.ts`: `esc()` maskiert ein einzelnes CR als `\n` und entfernt übrige Steuerzeichen (außer Tab).

## Befund heutige Ausgabe (62 Dateien in `public/data/feeds/`)
Alle 14 Zähler 0. Falten nach UTF-8-Oktetten, CRLF, Maskierung von Komma, Semikolon, Backslash und Zeilenumbruch, UID und DTSTAMP je VEVENT waren schon richtig (Falzcode seit 17.09.2026). Die einzige Lücke lag in `esc()` bei einem einzelnen CR und Steuerzeichen; sie trifft heute keinen Titel. Die Dateien bleiben unverändert, kein Verhaltensumbau der Inhalte.

## Basis-Beleg (Test gegen die main-Fassung von `shared/ics.ts`)
```
  ✖ text-steuerzeichen: 0 — gefunden: 4
  ✖ Zeilenumbruch und einzelnes CR werden \n
2 Zusicherung(en) verletzt.
EXIT 1
```
Nach dem Fix (`pipeline/check-ics-rfc-faelle.ts`): `ICS RFC 5545: alle Zusicherungen halten.`, Exit 0. Der Test-Commit steht vor dem Fix-Commit.

## Mutationstabelle (`diff-mutanten` mit dem neuen Test)
| Stand | Mutanten | überlebt |
|---|---|---|
| erster Lauf | 127 | 25 |
| nach Vereinfachung und Fällen | 104 | 5 |
| Endstand | 101 | 1 |

Der eine Überlebende (`shared/ics.ts:15`, „Parameter am Aufrufort entfernt value“ an `return value`) ist ein Artefakt des Mutators, kein Verhalten. Die Zähler und Hilfen in `ics-pruefung.ts` sind bis auf diesen Fall abgedeckt.

## Geprüft
`npx tsc --noEmit -p .` grün; `check-ics-*`, `check-favoriten-feed-faelle`, `check-ics-rfc-bestand` grün.

## Annahmen
Patch Notes: keine – intern: Prüfung und Maskierung seltener Zeichen, die heutigen Dateien bleiben byteweise gleich.

- `check-ics-rfc-bestand.ts` hängt nicht in `check:bestand-liste`: die Ratsche der Bestandsmarken erlaubt höchstens 50 Wächter ohne Titelmarke (stehen 50), der Wächter prüft Dateien und kennt keine Titel. Er läuft als eigener npm-Aufruf; die Verdrahtung in die Kette ist offen.
- Kein `URL:`-Feld je Termin ergänzt: das wäre eine Inhaltsänderung. Der Link steht weiter als „Details: …“ in DESCRIPTION; ein vorhandenes `URL`-Feld prüft die Prüfung auf http(s).
- DTSTAMP bleibt die feste Marke 2020-01-01 (RFC-gültig, hält die Dateien byteweise stabil).
