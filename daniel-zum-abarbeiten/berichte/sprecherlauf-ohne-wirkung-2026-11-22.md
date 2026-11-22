# Sprecherlauf ohne Wirkung? (Auftrag sprecherlauf-analyse-2211, 22.11.2026)

Rolle Analyst, nur gelesen und gemessen (Git-Verlauf, Lauf-Logs, `data/maengel.json`). Alle Zeiten UTC aus Werkzeugausgaben.

## Ergebnis in einem Satz

Der Sprecherlauf hat gewirkt, nur später als gemessen: Er lief erst 09:13–10:04 am 22.11. (der Zeitplan kam rund 7 h zu spät), und der Bau von 10:23 senkte `sprecher` von 373 auf 351; die +3 davor sind drei Titel, die durch ein neues Sprachurteil „deutsch“ aus der Ausnahme `ohne-synchro` in den Mangel rutschten.

## Befund

1. **Sammler:** `data:anisearch-sprecher` in `daten-auf-abruf.yml` (Cron `0 2 * * *`, Grenze 1100). #4508 (gemergt 21.11. 21:36) macht aus 384 Hauptbestand-Seiten ohne deutsche Rolle eine Nachholliste.
2. **Läufe seit 21.11. 18:00:** 44969864221 (Start 01:06, `data:toggo`), 44989370505 (05:25, `data:anisearch-artikel`, „0 von 9339 offen“), 45006447930 (09:13–10:04, `data:anisearch-sprecher`: „384 Sprecherseiten kommen dran … 384 Seiten geholt, 0 leere in Folge“, Lücke nachher 0). Der Zeitplan lieferte die drei Slots der Nacht mit 4–7 h Verspätung; der Sprecherslot ist der letzte. Alle Nachmessungen des Nacht-Orchesters (23:26, 00:26, 01:26) lagen **vor** diesem Lauf, der „Lauf, der nichts bewirkt“, war zu dem Zeitpunkt nie gelaufen.
3. **Ankunft:** Der Lauf kam als PR #4555 (10:04:38, Commit 22fce09f), der Bestandsbau 9aef1416 (10:23) liest ihn: `sprecher` offen 373 → 351, behoben 22, Ausnahme 41 → 39. Von den 384 Seiten tragen 24 jetzt deutsche Rollen (384 Rollen), also 22 behobene Titel; die übrigen 360 führt aniSearch weiter ohne deutsche Besetzung (das ist die Grenze der Quelle, nicht des Sammlers).
4. **Die +3:** 213805 (The Ramparts of Ice: Staffel 2, Bau 5efbb36d1, 23:17), 21505 und 21681 (Ajin Film 2 und 3, Bau d8e947dd, 00:47). Beide kamen aus Handbelegen des Nacht-Orchesters (#4517, #4522): Mit Sprachurteil deutsch endet die Ausnahme `ohne-synchro`, und der Titel zählt als `sprecher` offen. Das ist ein Gewinn (neu belegte Synchro), kein Rückschritt.

## Ursache, Klasse, Schließen

- **Ursache:** Die Messung (Aufgabe 19) verglich gegen einen Lauf, der laut Zeitplan „nachts“ läuft, tatsächlich aber erst gegen 09 Uhr; dazu verdecken neu belegte Titel (+3) die Wirkung der Nachholung.
- **Klasse:** Trifft jeden Nachschub, dessen Wirkung an `daten-auf-abruf.yml` hängt (alle Slots 01/05/09 Uhr, die Reihenfolge ist fest), und jeden Zähler, in den Handbelege selbst Mängel hineinschieben. `daten-auf-abruf.yml` steht nicht im Cloudflare-Weckplan (`shared/weckplan.ts`), die Verspätung (Mittel „täglich 371 min“, betrieb.md) gilt hier voll.
- **Vorschlag:** (a) Wirkungsmessung erst nach Lauf-PR und folgendem Bestandsbau („Lauf-PR gemergt?“ mit Uhrzeit prüfen), nicht nach Kalenderzeit. (b) Wirkungsaufgaben nennen den Sprecherlauf per `gh workflow run daten-auf-abruf.yml -f lauf=data:anisearch-sprecher -f grenze=400` statt auf den Slot zu warten (steht so im PR #4508). (c) Zähler mit Zu- und Abgang trennen: `sprecher` neu durch Beleg getrennt von behoben ausweisen.

## Rückblick

- **Gut:** Die Maengel-Historie im Git-Verlauf trägt je Bau Zähler und Titelmengen; so ließ sich jede der +3 benennen.
- **Schlecht:** Die Nachmessung hatte keine Zeit für den Lauf vermerkt; „keine Wirkung“ stand dreimal im Protokoll.
- **Unerwartet:** Nur 24 von 384 nachgeholten Seiten tragen deutsche Rollen (6 %); die erwartete Wirkung −333 war zu hoch.
- **Vorschlag:** Erwartung künftig als Spanne aus einer Stichprobe, nicht aus der Zahl der Seiten.
