# Filterkonzept, Gegenprüfung (22.11.2026)

Schritt 2 von 3. Geprüft wurden [analyse.md](analyse.md) und [umsetzungsplan.md](umsetzungsplan.md) (Fassung 1) gegen den Code (`36c6d22a`, Zweig `cloud/filterkonzept-2211`) und `public/data` vom 22.11.2026. Kein Code geändert. Messskripte lagen im Scratchpad; sie rechnen den **echten** `filterTitles` aus `web/src/lib/filters.ts` auf den echten Dateien und halten einen Prototyp des Weg-Modells daneben (Stichtag 22.11.2026). Unabhängiger Gegenentwurf: ein Plan-Agent, der nur das Ziel kannte (Abschnitt C).

## A. Was bestätigt ist

Diese Behauptungen der Analyse stimmen (Messung = Wert der Analyse):

- Yaiba (`177476`): Wege disc ×2, joyn/weekly, tv/weekly, Stream joyn; fehlt bei Disc-Ausschluss heute (`filters.ts:513-520`).
- Zu Unrecht verschwindende Titel je Plattform: Prime 443, Crunchyroll 349, Netflix 166, ADN 102, Joyn 66, YouTube 49, RTL+ 39, Disney+ 38, TV 21, Disc-als-Plattform 144 (alle exakt). Disc-Art 188 mit Disc-Weg, davon 140 mit Stream, 81 mit anderer Release-Art. Status: 49 Titel mit mehreren Release-Status, Jahr: 92 mit mehreren Jahren.
- Falsche Kombinationen: Netflix + Disc 22 → 0, TV + Disc 5 → 0, kostenlos + Netflix 17 → 0, TV + Wöchentlich 22 = 22.
- „bestätigt“ in der Datenbank wirkungslos (`passtTitel` kennt `confirmed*` nicht), „verfügbar“ im Kalender zählt in `activeFilterCount` (`filters.ts:249`), wirkt aber nicht in `releaseMatches`.
- Kalender-Fenster 16.11.–31.12.2026: 344 Termine, TV 108, Crunchyroll 80, Joyn 18, Prime 26, Netflix 25, Zweitanbieter 4, bestätigt 294 belegt / 50 geschätzt (je Release, wie der Filter es liest); 243 von 4.638 Terminen liegen in einem anderen Jahr als ihr Release. FSK unbekannt 872.
- Das Leck ist real: `parseHash` setzt `vorlieben.discAus` in jede Ansicht (`router.ts:184`), `schreiber` schreibt jede Änderung zurück (`router.ts:451`).

## B. Befunde (nach Gewicht)

**1. Der Plan würde „Film + Plattform“ zerstören (Plan falsch, kritisch).** Analyse 2.2 nennt „Crunchyroll + Film 115 → 0“ eine falsche Kombination. Gemessen: Die 115 sind genau die Crunchyroll-Streams auf Titeln mit `format: MOVIE` (115 = 115), also echte Filme auf Crunchyroll. Der Plan („Streams haben keine Art, sie scheitern an jedem Art-Einschluss“) hätte gesenkt: Crunchyroll + Film 115 → 0, Prime + Film 340 → 14, Netflix + Film 79 → 6, und „Film“ ausschließen 2.820 (heute, Werk-Regel) → 2.919. Beleg: `filters.ts:513-517` (`istFilmwerk`, `hatArt`), Messung `m3`. **Regel Fassung 2:** Ein Stream-Weg trägt die Art `movie`, wenn der Titel `format: MOVIE` hat, sonst keine. Echte Fehlkombinationen sind nur die Disc-Fälle (27 Titel) und kostenlos + Plattform.

**2. Zahlenbasis falsch benannt.** Die Analyse rechnet auf `titles.json` (2.926 Titel inkl. 297 Ecchi). Die Datenbank zeigt 3.550 Einträge (`titles.json` ohne Ecchi 2.629 + 921 Cartoons; im Ist-Bild 3.540, Rest ±10 = Ladezustand). Auf der echten Basis: Disc ausschließen heute 3.382, richtig 3.521, **139 statt 142 zu Unrecht**. Außerdem widerspricht sich der Plan: „nur Disc 32“ und „richtig 2.880“ gehören zu verschiedenen Definitionen (46 Titel haben nur Disc-Releases, 14 davon einen Stream-watchLink, also 32). Entscheidung unter Befund 5.

**3. Jahr-Filter: der Plan will die Bedeutung wechseln und verliert 74 %.** Analyse 3.2 / Plan S3: Datenbank-Jahr = `jpYear`. Gemessen für 2026: nach Release-Jahr (heute) 450 Titel, nach `jpYear` 118. Der Filter beantwortet „was erscheint bei uns 2026“; `jpYear` zeigt das nicht. Das Jahr bleibt Release-Jahr (Titel ohne Release: `jpYear`, wie heute) und wird eine Weg-Eigenschaft (`release.year`). Beleg: `filters.ts:492` (`yearsOf`).

**4. Neuer Dauerspeicher für alle Kalenderfilter (Plan S4) ist ein neues Verhalten.** Heute liegen die Listenfilter des Kalenders nur im Sitzungsspeicher (`kalender-filter.ts:47-55`, `useState`); gespeichert werden nur die Schnellfilter (`vorlieben.ts`) und `tvAus`. Ein neuer Schlüssel `ak.filter.kalender` für Plattformen, Genre usw. würde unsichtbare Dauerfilter erzeugen („Kalender leer?“). Die Datenbank-`sessionStorage` des Plans ist überflüssig: die Adresse hält den Stand (Zurück aus dem Panel), und beim Ansichtswechsel verliert die Datenbank ihre Listenfilter heute schon. **Entscheidung:** Es gibt keine neuen Speicher außer der Teilung des vorhandenen (Befund 7).

**5. Rettungsweg und `watchLinks` fehlen im Weg-Modell.** `wegeVon(title, releases)` kennt Releases und Streams. 947 Titel haben nur `watchLinks` (2.662 `stream`, 2.972 `buy`), 408 davon in der Datenbank-Basis ohne Release und Stream; „Anbieter“ (`providers`) ist ein eigener Filter (`filters.ts:496`). **Regel:** Wege = Releases ∪ Streams ∪ `watchLinks` mit `kind: 'stream'`. Kauflinks (`buy`) zählen nicht als Rettungsweg („Disc aus“ blendet den Handel aus). Titel ohne jeden Weg bleiben bei Ausschlüssen (wie heute). Ergebnis: „Disc aus“ entfernt 29 von 3.550 Titeln (alle nur im Handel erhältlich).

**6. Disc ist nicht überall dasselbe.** 2 Releases (`auto-544-disc`, `auto-142770-disc`) haben `platform: disc`, aber `releaseType: movie`; sie entgehen „Disc aus“ (Art) und werden vom Kalender-Filter als Film behandelt. Disc-Weg = `platform === 'disc' || releaseType === 'disc'`. Nebenbefund für die Daten, nicht Teil dieses Auftrags (Eintrag in `status.md` beim Bau).

**7. Das Leck reicht bis ins Push-Abo.** `pushFilterWert(kalenderFilters, tvAus)` (`push-nachfuehren.ts:10`, `App.tsx:88`) schickt `excluded.releaseTypes` an den Worker; `kalenderFilter(basis, eigen)` übernimmt „Disc aus“ aus `route.filters` (`kalender-filter.ts:28-30`). Heute heißt das: Ein Disc-Chip **in der Datenbank** ändert das Push-Abo. Nach einer Trennung, die `useKalenderFilter` weiter aus `route.filters` füttert, würde ein Datenbank-Chip (jetzt in der Adresse als `xrt=disc`) das Abo still umstellen. **Muss:** Die Schnellfilter des Kalenders kommen aus seinem eigenen Speicher, nie aus der Route; Wächter „Datenbank-Chip ändert `pushFilterWert` nicht“. Das Abo wird bei jeder Änderung neu geschrieben (Effekt hängt am Wert); der Worker (`shared/push-filter.ts`, `passtAmTermin`) bleibt unberührt.

**8. Migration „vor dem ersten Lesen in `App.tsx`“ greift zu spät.** `parseHash` läuft im `useState`-Initialisierer von `useRoute` (`router.ts:408`), vor jedem Effekt. Fassung 2: durchlesende Migration in `vorliebenLesen(ansicht)` (neuer Schlüssel, sonst der alte), gelöscht wird der alte Schlüssel beim ersten Schreiben. **Datenbank startet nicht leer (Plan), sondern mit der Kopie:** Der Nutzer sah vorher in beiden Ansichten denselben Zustand; eine stille Leerung nimmt jemandem, der „Disc aus“ bewusst in der Datenbank hatte, die Wahl. Nach dem Weg-Fix ist „Disc aus“ dort ohnehin harmlos. Nicht übernommen werden `availableX` (Kalender) und `confirmedX` (Datenbank).

**9. Der Plan nennt Testdateien, die es so nicht gibt.** Unter `web/src` liegen 0 Dateien `*.test.*`. Prüfungen sind `pipeline/check-*.ts`, gelistet (sortiert) in `tools/check-logic-liste.txt`; `check:logic` darf `public/data` nicht lesen (`check-logic-alle.mjs`, Bestandssperre), also Fixtures; die Zählprobe gegen den Bestand gehört in `tools/check-bestand-liste.txt` bzw. nachts (`tools/pruefung-ort.json`). Und ein „roter Test vorher“ kann nicht in `main` stehen: Test und Fix im selben PR, der Rot-Beleg (Test gegen alten Code) steht im PR-Text. Zu ändern sind ausserdem `pipeline/check-vorlieben.ts` (111 Zeilen), `check-kalender-filter.ts` (51), `check-adressen*.ts`, `check-filter-zyklus.ts` (229), `check-bereich-auge*.ts`, `check-push-filter*.ts`.

**10. UND/ODER (`modus`) fehlt im Plan.** Die Oberfläche zeigt den Schalter ab zwei Auswahlen (`FilterDetails.tsx:44,121`) für Plattform, Art, Jahr, Anbieter, Genre, Schlagwort. „Plattform A UND B“ kann nie auf denselben Weg zielen. Regel: Kandidatenwege = Wege, die alle Ausschlüsse bestehen und alle ODER-Dimensionen erfüllen; jede UND-Dimension braucht je gewählten Wert einen eigenen Zeugen unter den Kandidaten. Test: „Netflix UND Disc“.

**11. Mobil und Desktop: Zwei Verbesserungen des Plans verletzen E5 (nichts doppelt).** Die Zahl „3.540 Ergebnisse“ steht schon im Balken am Handy (`handy-hell-4`) und im Listenkopf am Desktop (`desktop-hell-4`); „N Titel zeigen“ statt „Fertig“ wäre die zweite Zahl auf demselben Bildschirm. Ebenso stehen „ohne Synchro“ und „Staffeln zusammenfassen“ am Desktop schon im Listenkopf; nur am Handy sitzen sie im Fenster. **Fassung 2:** kein neuer Knopf, Verschiebung nur am Handy, Desktop bekommt die aktiven Chips.

**12. Der Tooltip am Auge („nur im Kalender“) taugt nicht.** Am Handy gibt es keinen Hover, und nach der Trennung gibt es nichts mehr zu erklären. Entfällt.

**13. TV-Chip: Der Plan streicht die falsche Seite.** TV ist 108 von 344 Terminen (31 %) im Kalender, der häufigste Ausblendwunsch, mit eigenem Auge und `tvAus` („Premieren bleiben sichtbar“). Das Doppel besteht nur im Kalender (Schnellchip und Plattformchip, `FilterDetails.tsx:752-763`, `istTvChip`); die Datenbank hat TV nur in der Plattformgruppe. Fassung 2: Der Schnellchip bleibt (Häufiges zuerst, E4), der Plattformchip TV entfällt im Kalender.

**14. Zustände abschaffen kostet mehr, als es bringt (Plan S5).** Der Zyklus nichts → ein → aus → nichts ist überall derselbe Griff, `aria-pressed="mixed"` ist ein gültiger Wert für Umschaltknöpfe. Ein 2-Zustands-Chip spart einen Tipp, führt aber ungleiche Chips ein, verlangt Migration der gespeicherten `*Excluded`-Felder und bricht Adressen mit `xst=`. Fassung 2 entfernt nur, was **tot oder widersprüchlich** ist: „bestätigt“ in der Datenbank (0 Wirkung), „Jahr“ im Kalender (243 von 4.638 Terminen = 5,2 % widersprechen der gewählten Woche; der Zeitraum steht schon in der Ansicht), „verfügbar“ im Kalender. Alle anderen Zustände bleiben. Die Projektregel E0 (Wegfall einer Funktion geht an Daniel) wird nicht berührt, weil keine wirksame Funktion wegfällt; das steht im PR-Text.

**15. Facettenzahlen gegen das Budget.** Gemessen (Node, ungedrosselt, Mittel von 5): ein Filterlauf 14,6 ms bei 2.926 Titeln, 39,8 ms mit den 17.777 Titeln ohne Synchro (vor dem Weg-Modell). Am Handy rechnet man das 4- bis 6-fache. Zahlen an jedem Chip (≥ 4 Durchläufe) sprengen das 50-ms-Budget des Plans. Fassung 2: Zahlen nur für Plattform, Art, Status und Schnellchips (≈ 25 Werte), nur über den Kernbestand (3.550), einmal beim Öffnen des Fensters in `useZeitscheibe`, nie auf dem Tippweg; Genre und Schlagwort ohne Zahlen. Wegen kostenlos-Zahl: `kostenloseFolgen` rechnet mit der Jetzt-Zeit (TOGGO-Fenster), Zählprobe mit festem Stichtag.

**16. `yaiba` ist auf der Bühne vorhanden** (Fall `yaiba-joyn`), aber die Zellen haben flüchtigen Speicher (`speicher-je-zelle.ts`). „Kalender-Auge → Datenbank“ ist daher in der Bühne nur mit einem Skript zu zeigen (Klick, Wechsel in derselben Zelle), nicht mit Fall-Adresse. Siehe Mockup-Abschnitt im Plan.

**17. Weitere Lücken, geprüft und ohne Folge für den Umfang.** Erweiterung (`extension/`) und Feeds (`public/data/feeds/*.ics`, in der Pipeline gebaut) nutzen die Oberflächenfilter nicht. Newsletter/Push-Worker: unberührt (nur Favoriten bzw. `terminFilter`). Alte Ansichten `#/favoriten`, `#/wo` setzen `favoritesOnly`/`availableOnly` per Adresse und bleiben. Alte Links `xp=disc` wandern wie bisher zu `xrt=disc`. Gruppierung nach Reihe (`groupByFranchise`): der Reihenkopf entscheidet, Verhalten wie vorher. Eine `i18n`-Sprache (nur Deutsch in `i18n-spaet.ts`). Handy: Chips 32 px Box mit 44 px Trefferfläche (`TIPPFLAECHE_HOCH`) bleiben, neue Knöpfe nehmen dieselbe Klasse.

## C. Untergrenze und echter Gegenentwurf

**Untergrenze (≈ 70 Zeilen, vom Gegenentwurf-Agenten unabhängig bestätigt):** `passtTitel`: Ausschluss von Plattform/Art/Anbieter = „kein anderer Weg übrig“; `vorlieben.ts` bekommt einen Schlüssel je Ansicht; `schreiber`/`parseHash` nutzen nur den der aktuellen Ansicht; `useKalenderFilter` liest Schnellfilter aus dem eigenen Speicher. Löst Yaiba und das Leck, lässt aber die 27 + 17 Fehlkombinationen und die Jahr/UND-Fragen stehen. Das ist **Stufe 1** von Fassung 2.

**Gegenentwurf (Agent): „Bezugsweg“ als Datenfeld.** Die Pipeline schreibt `wege[]` je Titel in `titles.json`; Kalender und Datenbank teilen eine Prüffunktion. Gewinn: ein Ort für die Definition, schnellere Prüfung. Verworfen: ändert Schema und Download (Budget in `ZIELE.md`), Worker und Bau; die Ableitung aus Release, Stream und `watchLinks` ist zur Laufzeit schon billig (Weg-Liste je Titel einmal berechnet, `WeakMap`). Aufnahme: `wegeVon` ist eine reine Funktion und kann später in die Pipeline wandern. Zu den Einzelaussagen des Agenten: „107 reine Disc-Titel“ ist falsch (gemessen 46 bzw. 32); sein Hinweis auf einen Teilungsschlüssel `{kalender, datenbank}` mit Version wurde nicht übernommen (zwei Schlüssel genügen), seine Warnung vor dem Push-Abo ist Befund 7.

**Entscheidung: Weg-Modul (Plan-Ansatz B in Fassung 2) in zwei Stufen** mit Stufe 1 als Untergrenze in einem PR zuerst.

## D. Entscheidungen zu offenen Fragen des Plans

| Frage | Entscheidung | Grund |
|---|---|---|
| Datenbank merkt Filter dauerhaft oder je Sitzung? | Schnellfilter wie heute dauerhaft, aber je Ansicht ein Schlüssel; Listenfilter wie heute in der Adresse | Daniel 02.10.2026 will „Disc aus“ dauerhaft; Teilen ohne Personenzustand (Befund 4) |
| Schnellfilter in die Adresse? | Nein; `fav=1`, `frei=1`, `wo=1` weiter nur lesen | `fav=1` im geteilten Link zeigt dem Empfänger dessen Favoriten |
| Datenbank startet leer? | Nein, Kopie | Befund 8 |
| Jahr = `jpYear`? | Nein, Release-Jahr als Weg-Eigenschaft | Befund 3 |
| Zustände 3 → 2? | Nein, nur tote entfernen | Befund 14 |
| „verfügbar“ umbenennen? | Ja, „Streambar“ (Textänderung, Schlüssel und Adresse bleiben) | der Code-Kommentar `filters.ts:440` hält fest, dass der Name zu „hat Synchro“ verleitet |
| Zahlen an Chips? | Eingeschränkt (Befund 15) | Budget |
| „N Titel zeigen“, Tooltip am Auge? | Nein (Befunde 11, 12) | E5, Touch |
| Wegfall von Filtern an Daniel? | Nein; tote Filter, im PR-Text benannt | Befund 14 |
