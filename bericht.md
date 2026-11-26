# Bericht sprecher-bauanschluss

Ergebnis: Wikipedia-Sprecherliste an den Bau angeschlossen — Sammler `pipeline/fetch-wikipedia-sprecher.ts` (Tageslauf, je Seite 1×/Woche) → `data/wikipedia-sprecher.json` → Bauphase `pipeline/bau/sprecher-wikipedia.ts` → `voices/<id>.json` mit Quelle; ≈ + Grund an der Liste, vermutete Besetzung nicht im Sprecher-Index. Zweig `fix/sprecher-bauanschluss`, baut auf `fix/maengel-sprecher-wikipedia` (zuerst mergen).
Beleg: Bautest an der Basis rot (Exit 1), danach grün; Hochrechnung: 81 von 356 offenen sprecher-Mängeln schließen beim nächsten Bestandsbau (4 belegt, 77 mit ≈), 275 bleiben. Erster Sammellauf aus der Cloud: 48/48 Seiten, 47 mit Tabelle. Mutation: 354 Mutanten, 342 rot, 12 gleichwertig (Gründe in pr.md); Vorprüfung grün.
Nebenfund behoben: Live-Ranma setzt eine zweite Stimme ohne `<br>` auf eine neue Zeile; Parser verschmolz die Namen (7 Tabellen betroffen).
Offen: Kommentar „Noch ohne Bau-Anschluss“ in `data/wikipedia-sprecher-seiten.yaml` (Datei laut Auftrag unberührt; im Auftrag sprecher-wikipedia-2 nachziehen). Synchrobeleg wird in Phase 10 geprüft; ein erst in Phase 11 entstehender Weg hielte einen `unsicher`-Titel zurück (Logzeile im Bau zählt ihn).
Mutationsprobe fand zwei echte Fehler: Zusatz am Namen spaltete die Sprecher-Suche, ein Lauf mit lauter gescheiterten Abrufen galt als grün; beide behoben.
Schätzung vs. Ist: 120 min / rund 190 min. Prozesse: keine übrig.

Rückblick
- Gut: PoC gegen alle 48 Live-Seiten vor dem Bau zeigte die Ranma-Änderung und die Episodenlisten-Falle („Deutsche Erstausstrahlung“).
- Schlecht: `liesDateien` der aniSearch-Phase hatte keinen Laufzeittest; erst die Mutationsprobe zeigte es.
- Unerwartet: `hasVoices` zählt in `shared/saison.ts` als Deutsch-Beleg — deshalb `unsicher` nur mit anderweitigem Synchrobeleg.
- Vorschlag: `bau/grundlagen.ts` liest beim Import Pflichtdateien; eine kleine Kulisse „leere Wurzel“ für Laufzeittests der Bauphasen spart je Test die Suche danach.
