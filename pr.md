<!-- titel: Wikipedia-Sprecherliste: 44 neue Seiten, 81 offene Sprecher-Titel zugeordnet -->
Auftrag: maengel-sprecher-wikipedia

Mängel-Art `sprecher` (aniSearch, in der Cloud nicht erreichbar): Der zweite Weg, die Handliste `data/wikipedia-sprecher-seiten.yaml` (de.wikipedia, Abschnitt „Synchronisation“), wächst von 4 auf 48 Seiten und von 6 auf 87 Ziele. 81 dieser Ziele sind offene `sprecher`-Titel.

**Zahlen (Stand 26.11.2026):** offene `sprecher`-Zeilen vorher 356, nachher 356 (unverändert: die Handliste hat noch keinen Bau-Anschluss, die Zeilen schließen erst, wenn eine Bauphase sie liest). Offene Titel mit Wikipedia-Zuordnung vorher 0 von 356, nachher 81 von 356 (Ziel war mindestens 80).

**Änderungen**
- `data/wikipedia-sprecher-seiten.yaml`: 44 neue Seiten, dazu `10015206` (Baki-Special) und `209872` (Ranma 1/2 Staffel 3) an bestehenden Seiten. Neues Feld `unsicher` (Grund) an jedem Ziel, dessen Film, OVA, Special oder Staffel nicht in der Tabelle steht: 77 von 87. Ohne `unsicher` (10): Tabelle nennt den Titel selbst (Free! „Film 2–4“, Mushoku Tensei Staffel 2 laut Seitentext, die sechs bisherigen).
- `pipeline/fixtures/wikipedia-sprecher/`: je Seite der Abschnitt im Wortlaut, mit Quelle, Lizenz CC BY-SA 4.0 und Link auf die Versionsgeschichte im Kopf.
- `pipeline/lib/wikipedia-sprecher.ts` (eigener Commit, Verhaltensänderung mit Test): Kopf „Deu.“/„dt.“, Fettdruck im Kopf und Fortsetzungszeilen mit `||`/`!!` werden gelesen (Made in Abyss, Mob Psycho 100, Maken-Ki fielen bisher durch). Berührte Funktion bleibt unter 80 Zeilen.
- `pipeline/check-wikipedia-sprecher.ts`: vier neue Kleinstfälle für den Parser; Handlisten-Prüfung auf 48 Seiten, eindeutige Kennungen (mindestens 87), Pflichtgrund bei `unsicher` und 10 Ziele ohne.
- `docs/wissen/maengel.md`: Abschnitt mit Abruf, Verworfenem und Annahmen.

**Basis-Beleg (neuer Test gegen die main-Fassung von `pipeline/lib/wikipedia-sprecher.ts`):** rot, Exit 1:
```
  ✖ „Deu. Synchronsprecher“ (Made in Abyss) zählt als deutsche Spalte
  ✖ „dt. Stimme“ unter „Anime“ (Mob Psycho 100) zählt, Bühnenstück und Realserie nicht
  ✖ Kopfzelle in Fettdruck („'''Deutsche Stimme'''“) auf Fortsetzungszeile mit ||
3 Prüfung(en) fehlgeschlagen
```
Mit der Änderung: grün, Exit 0 (auch mit der Bestandssperre der Kette).

**Mutationstabelle (Diff-Mutanten, 14 Mutanten, 0 überlebt):** `&&`→`||` (Fortsetzungszeile), Prüfaufruf und Zerlegung am Aufrufort entfernt, Aufruf entfernt, Zahl 2→0, `?:`-Zweige vertauscht, `findIndex`-/`replace`-Argumente entfernt oder getauscht: alle von `pipeline/check-wikipedia-sprecher.ts` erkannt. Der erste Lauf ließ zwei überleben (Zerlegung der Fortsetzungszeile, `?:`-Zweige); dafür kam der Kleinstfall mit `!!` und zwei Zellen je Zeile.

**Annahmen (ohne Rückfrage entschieden)**
- Abruf nur über `/wiki/<Seite>?action=raw` (robots sperrt `/w/`), eigener User-Agent, 2 s Abstand; rund 160 Seitennamen probiert, Zuordnung Seite → Titel von Hand am Seitentext und Tabellenkopf.
- „Gehört zur richtigen Staffel/Fassung“: nur belegt, wo die Tabelle oder der Seitentext die Staffel/den Film nennt; sonst bleibt der Titel mit `unsicher` in der Liste statt zu fehlen. Empfehlung für den späteren Bau: `unsicher`-Ziele kennzeichnen („≈“), nicht als belegt zeigen.
- Verworfen: Yū Yū Hakusho 392 (Tabelle = Film 1994), El Hazard 115 (Tabelle = OVA), Baki Hanma 146646 (Tabelle = Serie 2018), Bleach TYBW (Tabelle = alte Serie), Code Geass-Filme und Akito, Strike Witches (keine deutsche Spalte).
- Digimon Adventure tri. Kapitel 4–6: die Tabelle zitiert die Synchronkartei nur für Kapitel 1 und 2; als `unsicher` geführt.
- Ob die Kennungen in den Daten stehen, wurde beim Erzeugen gegen den Bestand geprüft, im Repo gibt es dafür keine Prüfung (sie bräuchte einen Leser des erzeugten Datensatzes).

**Patch Notes:** keine (kein sichtbarer Effekt, die Liste hat keinen Bau-Anschluss). `npx tsc --noEmit -p .` grün.
