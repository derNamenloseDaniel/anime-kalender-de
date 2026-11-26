<!-- titel: Antwortkasten: Kopfzeile am Starttag ohne Uhrzeit-Zusatz -->

Der Antwortkasten schreibt bei einem Komplettstart am Starttag ohne Uhrzeit jetzt „Alle 12 Folgen da“ statt „Alle 12 Folgen heute, genaue Uhrzeit unbekannt“ (Daniel, 26.11.2026, Fool Night). Besucher lesen: es ist live.

## Was sich ändert
- `web/src/lib/i18n-antwort.ts`: Schlüssel `antwort.heuteUhrzeitOffen` → `antwort.heuteDa`, Text „Alle {count} Folgen da“.
- `antwort-kopf.tsx:234` nimmt den neuen Schlüssel; Kommentare in `antwort-typ.ts`, `shared/logic.ts`, `check-katalogstart-tag.ts` nachgeführt.
- Patchnote `data/patchnotes/kopfzeile-heute-ohne-uhrzeit-zusatz.yaml`.
- `antwort-regeln.ts` unberührt (Merge mit `fix/kalender-sprache-offen` bleibt leicht).

## Fünf Stufen
- **a) Ursache:** `i18n-antwort.ts:8` trug den Zusatz; `antwort-kopf.tsx:234` setzt ihn bei `heuteOffen` (aus `katalogstartHeuteOffen`, `antwort-regeln.ts:211`). Eingeführt als Zwischenform für Bass X Machina (03.11.2026): „Uhrzeit unbekannt“ war Wahrheitsschutz, aber Maschinensicht statt Besuchernutzen.
- **b) Klasse:** Gesucht in `web/src` nach „Uhrzeit unbekannt“, „laut Quelle“, „offen“, „unbekannt“ in Kopfzeilen und Pillen. Genau **eine** Kopfzeile trug einen technischen Uhrzeit-Zusatz (diese). Verwandt, nicht geändert: `antwort.taktUnklar` „Takt unklar“, `antwort.filmDeStreamOffen` „Streamstart noch nicht bekannt“, `antwort.kinoDeOffen` „Deutscher Kinostart noch nicht bekannt“, `antwort.kinoDeVerleih` „…, Termin noch offen“ (alles Aussagen über einen fehlenden Termin, keine Uhrzeit-Anmerkung zu einem erschienenen Titel), Status-Etikett „Termin unbekannt“ (`i18n.tsx:124`). Der Hinweis „Termin laut Quelle – ob mit deutscher Synchro … offen“ ist ein Hinweis, keine Kopfzeile, und gehört `fix/kalender-sprache-offen`.
- **c) Fix:** siehe oben. Ein Text, keine neue Logik. `fertig` entsteht nur, wenn `istErschienen` ab 00:00 gilt; „da“ ist damit genau die Aussage, die der Code schon trifft.
- **d) Test:** `pipeline/check-katalogstart-kasten.ts` (echte Komponente, feste Uhr, Berlin = UTC+1): Komplettstart heute 00:30 und 22:00 → „Alle 6 Folgen da“, kein „Uhrzeit“/„unbekannt“; Folgetag und mit Uhrzeit unverändert „auf Deutsch“; Teil 2 nach Teil 1 → keine „da“-Zeile. 11 Fälle grün. Mutationsprobe: Text zurück auf „… da, Uhrzeit unbekannt“ → der neue Fall „Kopfzeile ohne Uhrzeit-Zusatz“ wird rot. `check-katalogstart-tag.ts` grün, `tsc --noEmit -p .` und `check:umfang` Exit 0.
- **e) Warum durchgelassen:** Der Test von 03.11. hat den Zusatz als Soll **festgeschrieben** („Zwischenform“); er prüfte, dass der Text da ist, nicht, ob er einem Besucher hilft. Prüfer und Kette fragten nicht „Welche Information fehlt dem Leser, wenn der Text wegfällt?“ — keine, denn „live und ansehbar“ ist die Nutzeraussage. Schärfung: Zustandskopfzeilen nennen den Zustand für den Besucher, nie die Lücke im Datensatz (Maßstab `kurze-texte-fuer-nutzer`, „Schreiben, was geliefert wird, nicht was fehlt“).

## Zum Auftrag „belegt → da, unbelegt → ab heute“
Im Code gibt es keinen Zweig „am Starttag noch nichts belegt“: `fertigAntwort` wird nur erreicht, wenn der Titel schon als erschienen gilt (Katalogstart `batch` gilt ab 00:00 als erschienen, `istErschienen`). Vor dem Start liegt der Kasten im Zweig „künftig“ mit eigenem Text. „Ab heute“ wäre ein dritter Zustand ohne Beleg im Datensatz (keine Beobachtung/Linkprüfung an der Antwort). Deshalb: ein Text „da“. Will Daniel „ab heute“ bis zur ersten Beobachtung, ist das ein eigener Auftrag (`schedule.observed` / Linkprüfung in die Antwort tragen).

## Überschneidung `fix/kalender-sprache-offen`
Fool Night (`auto-10021751-netflix`, Titel 213457): Release trägt `sprache: offen` und den Hinweis; der Titel hat `streams: netflix, url …/81991076, dub: true`, dieselbe Adresse wie `platformUrl` des Termins. Das ist genau der Fall „Weg mit dub:true an der Adresse des Termins“, den der Bau in jenem Zweig abräumt: **abgedeckt**, der Hinweis verschwindet dort nach dem Datenbau. Hier nicht angefasst.
