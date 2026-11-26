<!-- titel: fix(folgentitel): Handtitel legen fehlende Zeilen an; 15 Titel für Miraculous und Es war einmal … Amerika -->
Auftrag: maengel-folgentitel

## Was ändert sich
- **Code:** `mitHandTiteln` in `pipeline/bau/folgentitel-hand.ts`, aufgerufen in `pipeline/bau/folgentitel-stufen.ts`. Die Handzuordnung füllte nur vorhandene Zeilen (`mitCrTiteln`); eine Liste, die nur aus echten TMDB-Titeln besteht (Miraculous: 17 von 26 Zeilen), verlor jede Handfolge ohne Zeile still. Jetzt legt die Hand Zeilen bis zur Folgenzahl an (ohne bekannte Folgenzahl keine).
- **Daten:** 15 deutsche Folgentitel in `data/folgentitel-hand.yaml`: Miraculous Staffel 1 (10011124, Folgen 4, 5, 8, 12, 14, 15, 16, 19, 24), Staffel 3 (10014481, Folgen 5, 8, 9, 20), Es war einmal … Amerika (10004750, Folgen 12, 23). TMDB führt diese Eigennamen deutsch gleich englisch, der Bau wertet das als „nicht übersetzt“. Beleg: de.wikipedia-Episodenliste (Feld DT, Abruf 26.11.2026); Nummern nur übernommen, weil die vorhandenen Titel dort unter derselben Nummer stehen (17 von 17, 22 von 22, 24 von 24; Staffel 1 hat 4 reine Formatabweichungen wie „Aller Anfang ist schwer (1)“ gegen „– Teil 1“).
- **Doku:** Abschnitt in `docs/wissen/maengel.md` (Klassen aller 283 offenen Titel, Ursache, Miraculous S2/S4). Patch-Notes-Eintrag `data/patchnotes/miraculous-fehlende-folgentitel-ergaenzt.yaml`.

## Zahlen (Mängel-Art folgentitel, auto:tmdb)
- **Vorher:** 283 offen (Stand 24.11.2026; der Auftrag nannte 281).
- **Nachher (Simulation mit den echten Bau-Funktionen, 10011124 17 → 26, 10014481 22 → 26, 10004750 24 → 26 benannte Folgen):** 280 offen erwartet. Gemessen wird erst nach dem Bestandsbau; die Cloud hat kein `data/cache`.
- **Miraculous Staffel 1: 17 von 26 → 26 von 26.**
- Weitere Wirkung: 72 Titel mit TMDB-Kennung, die nie abgerufen wurden, wählt `waehleAbrufe` beim nächsten Wochenlauf (Simulation an `main`, `LUECKE_LIMIT` 128); der Fix dafür steht seit 23.11. auf `main`, ist also nur noch nicht gelaufen. Wie viele davon den Mangel schließen, bleibt offen (am 23.11. gemessen: 3 von 63).

## Ursache Teil 1
Alle 283 eingeordnet (Tabelle in `docs/wissen/maengel.md`): 99 Format/Länge ausgeschlossen, 47 ohne TMDB-Kennung, 72 nie abgerufen, 16 Folgenzahl passt zu keiner TMDB-Staffel, 28 nur Platzhalter oder englisch, 18 teils gleich englisch, 3 mit voller Liste, aber offen. Die 18 mit teils gleich englischen Titeln werden bewusst nicht per Code-Regel gelockert: `tmdb-folgen.json` unterscheidet Eigennamen („Chazz-anova“) nicht von Englisch-Rückfällen („Judai Revived!? A Brand New Journey“, Yu-Gi-Oh! GX Folge 156); eine Schwelle ließe englische Titel als deutsche durch. Dafür gilt die Handzuordnung mit zweiter Quelle. Der Code-Fehler, den das Eintragen sichtbar machte, ist der Handzeilen-Verlust oben.

## Basis-Beleg (Test gegen die `main`-Fassung rot)
`pipeline/check-folgentitel-luecke.ts` mit den beiden Dateien `pipeline/bau/folgentitel-hand.ts` und `pipeline/bau/folgentitel-stufen.ts` aus `origin/main`:
```
Exit auf main-Fassung: 1
  ✖ im Bau: die Hand legt die Zeilen 2 und 4 an, die Liste ist wieder 1 bis 4 in Reihenfolge — gefunden: [{"nr":1,"de":"Eins","minuten":21},{"nr":3,"de":"Drei","minuten":21}]
```
Mit der neuen Fassung: Exit 0. Hochrechnung auf den Bestand: alle 95 vorhandenen Handeinträge haben eine Zeile in `public/data/folgen/<id>.json` (92 gleicher Titel, 3 Titel einer früheren Stufe), das Verhalten ändert sich für sie nicht.

## Mutationstabelle (`diff-mutanten --test "npx tsx pipeline/check-folgentitel-luecke.ts"`)
`diff-mutanten: 29 Mutanten, 0 überlebt, 0 unbrauchbar.` (zuerst 3 überlebt: Doppelzeile bei vorhandener Handfolge und Kitsu-Minuten bei angelegten Zeilen; Tests ergänzt). Die Mutationsliste `tools/mutationen/folgentitel-luecke.json` (Anker nachgezogen, zwei Mutanten neu) mit dem Mutationsläufer:

| # | Mutant | Datei | Ergebnis |
|---|---|---|---|
| 4 | stufen: Hand nicht aufgerufen | pipeline/bau/folgentitel-stufen.ts | rot (Exit 1) |
| 5 | hand: legt keine fehlenden Zeilen an | pipeline/bau/folgentitel-hand.ts | rot (Exit 1) |
| 6 | hand: Zeile über der Folgenzahl angelegt | pipeline/bau/folgentitel-hand.ts | rot (Exit 1) |
| 7 | stufen: Hand mit fremder Kennung | pipeline/bau/folgentitel-stufen.ts | rot (Exit 1) |
| 8 | stufen: Hand vor RTL+ | pipeline/bau/folgentitel-stufen.ts | rot (Exit 1) |

Gesamt der Liste (Hand-Mutanten): 15 rot, 0 überlebt.

## Geprüft
`npx tsc --noEmit -p .` Exit 0; `pipeline/check-folgentitel-*.ts`, `pipeline/check-tmdb-folgentitel-*.ts`, Verteil-Test Exit 0; `check:umfang` grün; Patch-Notes-Prüfung grün. Keine neue Prüfdatei, daher kein Eintrag in der Prüfliste.

## Annahmen und Grenzen
- Quelle: de.wikipedia (Auftrag nennt sie); fernsehserien.de ist laut Kopf von `data/folgentitel-hand.yaml` ausgeschlossen und nicht benutzt. Der Kopf der Datei nennt de.wikipedia jetzt als Gegenbeleg für Eigennamen.
- Folge 15 Staffel 1: Wikipedia „Der Gamer“, TMDB „Gamer“; eingetragen ist die Wikipedia-Schreibweise, in der Quellenzeile als unsicher vermerkt.
- Miraculous Staffel 2 und 4 nicht eingetragen: Wikipedia zählt in anderer Reihenfolge als unsere Dateien (S2 0 von 15, S4 21 von 24 vorhandenen Titeln unter anderer Nummer); ohne geklärte Reihenfolge wäre jede Nummer geraten.
- Der Auftrag verbietet andere `data/`-Dateien; der Patch-Notes-Eintrag ist eine neue Datei (Pflicht des Auftrags), keine bestehende wurde verändert.
- Kein Umbau im selben Commit: Commit 1 Code mit Test, Commit 2 Daten, Commit 3 und 5 Test/Anker, Commit 4 Doku.
