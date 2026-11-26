Bauer-Bericht fix/stream-pillen-omu-doppelt (Commit 07ec2f27, kein PR angelegt)

1. Neu `wege-sichtbar.ts` (`sichtbareWege`, `sichtbareTermine`), einmal in `panel-antwort.ts` verdrahtet: Pillen, Kopfzeile, Gruppen, Legende lesen dieselbe Liste.
2. OmU nie als Pille (29 Titel) und nie als Kalender-Marke („Synchro offen“ statt „OmU“).
3. Prime-Kanal ohne Sprachbeleg entfällt (Verweis 36 Titel, Bezugsweg 479 Titel); Termin mit offener Sprache nur als „ab“, nie „seit“ (4 Titel).
4. Ein Kanal, eine Pille: 101 Titel hatten Verweis und „Amazon Prime (X)“ nebeneinander. Daniels Titel 156040: Stream-Reiter leer, Disc bleibt.
5. Test `check-stream-pillen-sichtbar.ts` (22 Prüfungen, 9 Mutanten fallen), tsc, eslint, umfang, Nachbartests grün; 97 Titel haben danach einen leeren Stream-Reiter.

Rückblick
- gut: Klasse mit den echten Funktionen am echten Datensatz gezählt, nicht per Grep; eine Stelle statt fünf Filter.
- schlecht: Erste Schätzung (36 + 29 Titel) war um den Faktor 10 zu klein, weil ich Verweise und Bezugswege getrennt zählte; Doppel-Mutant überlebte, bis das Fixture belegt war.
- unerwartet: Der OmU-Bezugsweg stand wegen `zeilenGruppen` unter „Abo“ statt „Weitere Anbieter“; die Blase „nur Untertitel“ war ausdrückliche Entscheidung (10./21.10.2026) und hatte einen eigenen Test.
- Vorschlag: Regel 2 für Bezugswege (479 Titel) von Daniel bestätigen lassen (Rückbau = eine Bedingung); toter OmU-Code (`DubStatus` „omu“, `detail.pilleNurOmu*`, `antwort.nurUntertitel`, ICS/Mail „(OmU)“) in eigenem Umbau-Commit entfernen; Doppel in Verweisen mit zwei Prime-Kennungen (12 Titel, vermutlich Staffeln) prüfen.
- veraltet: Kommentar in `chips-regeln.ts` und Doku zum „Nur-Untertitel“-Status in `docs/wissen` (Daniel 10.10.2026) beschreiben jetzt einen Zustand, den die Oberfläche nicht mehr zeigt; nicht nachgeführt (Auftrag: Code).
