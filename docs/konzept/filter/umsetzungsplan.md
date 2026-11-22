# Filterkonzept, Teil 2: Umsetzungsplan (22.11.2026)

Schritt 1 von 3 (Analyse + Plan). Grundlage: [analyse.md](analyse.md). Schritt 2 ist die Umsetzung, Schritt 3 Mockup/Bilder vorher–nachher. Regeln: Umbau und Verhaltensänderung nie im selben Commit (CLAUDE.md), `check:umfang` darf nur sinken, neues Verhalten in eigener Funktion/Datei, `filters.ts` hat 593 Zeilen und `FilterDetails.tsx` 784 (Grenze 800): neuer Code geht in neue Module.

## 1. Untergrenze und Ansatzvergleich

**Untergrenze (kleinster Weg, behebt beide Fehler):**

- A: In `passtTitel` den Ausschluss von Plattform/Art/Status auf Weg-Ebene rechnen (ca. 40 Zeilen) und die Vorlieben je Ansicht trennen (zwei Schlüssel statt einem, ca. 30 Zeilen).
- Kein neues Konzept, keine UI-Änderung. Löst Yaiba und das Leck, lässt aber die falschen Kombinationen (Netflix + Disc 22, Crunchyroll + Film 115) und die toten Filter bestehen.

**Ansatz B (empfohlen): „Wege-Sicht“ als eigenes Modul** `web/src/lib/wege-filter.ts`: Jeder Titel liefert seine Wege (`wegeVon(title, releases)`), Weg-Filter (Plattform, Anbieter, Art, Status, kostenlos, streambar) laufen **einmal** über die Wege, Titel-Filter wie bisher. Karte und Ergebnis lesen dieselben Wege. Löst Yaiba, Kombinationen und das Karten-Badge in einem Zug.

**Ansatz C (verworfen):** Den Datensatz in Weg-Zeilen aufteilen (eine Zeile je Weg in `titles.json`). Ändert das Datenformat, Download und Budget (`ZIELE.md`); Gewinn gegenüber B nur bei sehr großen Mengen, bei 2.926 Titeln unnötig.

B kostet etwa dreimal so viel wie A, schließt aber die Klasse, nicht nur den Einzelfall. Der Gegenentwurf eines Agenten, der nur das Ziel kennt, wird vor Schritt 2 eingeholt (Regel „tragende Aufgaben“), und die Rechnung (Messskript, Analyse 2.4) wird gegen den Neubau gehalten.

## 2. Schritte

Jeder Schritt ist ein eigener PR; Umbau und Verhalten getrennt.

### S1: Messbasis (Test zuerst, rot vorher)

- Neu: `web/src/lib/filters.wege.test.ts` mit Fixture aus echten Fällen: Yaiba (`177476`), Titel Netflix+Disc, Crunchyroll+Film, ein Titel nur Disc, einer ganz ohne Weg.
- Erwartung als **rote** Tests gegen den Ist-Code: Disc-Ausschluss behält Yaiba; Netflix+Disc ergibt 0; „kostenlos + Netflix“ ergibt 0.
- Vorher/Nachher-Zahlen aus Analyse 2.1 und 2.2 als Zählprobe über `public/data` (Skript `tools/filter-zaehlprobe.mjs`, Ausgabe festgeschrieben in `docs/konzept/filter/zahlen.json`; Exit 0).
- Dateien: neu `web/src/lib/filters.wege.test.ts`, `tools/filter-zaehlprobe.mjs`.

### S2: Weg-Modul (reiner Umbau, noch kein Verhalten)

- Neu `web/src/lib/wege-filter.ts` (`wegeVon`, `wegPasst`, `titelPasstWege`), nicht angeschlossen; Tests grün für das Modul allein.
- `check:umfang` bleibt gleich.
- Dateien: neu `web/src/lib/wege-filter.ts`, Test-Erweiterung.

### S3: Datenbank-Ausschluss auf Weg-Ebene (Verhaltensänderung, behebt Yaiba)

- `passtTitel` (`filters.ts` Z. 506–520) ruft `titelPasstWege` für Plattform, Anbieter, Art, Status, Jahr (ein Jahr: `jpYear`), kostenlos, streambar; die alten Zeilen entfallen. `filters.ts` sinkt.
- Karten: `DbKarte` zeigt nur die Wege, die den Filter bestehen (Plattform-Chips, Disc-Badge). Fundstellen/Suche unberührt.
- Sonderfall „Film ausschließen = Werk“ bleibt (`format === 'MOVIE'`), jetzt als Titel-Filter.
- Dateien: `web/src/lib/filters.ts`, `web/src/components/` (Karte der Datenbank, `PosterKarte`-Umfeld), Tests, `docs/wissen/datensatz.md` (Abschnitt „Filterebene Titel/Weg“).

### S4: Kalender- und Datenbank-Speicher trennen (Verhaltensänderung, behebt das Leck)

- `vorlieben.ts` bleibt als Typ, bekommt zwei Schlüssel: `vorlieben.kalender` (localStorage) und `vorlieben.datenbank` (sessionStorage, plus Adresse).
- `parseHash` (`router.ts` Z. 132–150): Im Kalender nur noch `vorlieben.kalender`; in der Datenbank `vorlieben.datenbank` und Adresse (`fav=1`, `frei=1`, `xrt=…`, `st=…`); `schreiber()` ruft `vorliebenNachfuehren` je Ansicht mit dem passenden Schlüssel.
- `kalenderBasis()`/`kalenderFilter()` in `kalender-filter.ts` vereinfachen: Kalender hat **einen** eigenen Speicher, `route.filters` trägt nur noch die Datenbank; `useKalenderFilter` schreibt in `vorlieben.kalender`.
- Push: `usePushNachfuehren` liest weiter die Kalender-Filter (`kalenderFilters`), keine Änderung am Worker (`shared/push-filter.ts`).
- Dateien: `web/src/lib/vorlieben.ts`, `router.ts`, `kalender-filter.ts`, `App.tsx`, `web/src/components/kalender/KalenderBereich.tsx`, Tests `vorlieben`, `router`, `kalender-filter`.

### S5: Zustände bereinigen (Verhaltensänderung)

- „bestätigt“ aus dem Datenbankfenster entfernen (`schnellListe`, `showConfidence`/Ansicht), und aus `activeFilterCount` der Datenbank.
- Jahr aus dem Kalenderfenster entfernen; Kalender-`FilterState.years` bleibt leer (alter Wert wird beim Lesen verworfen).
- Zustände 3 → 2 für kostenlos, bestätigt, Status, Favoriten (Kalender): `NUR_NEIN` in `filter-zyklus.ts` wird zu `ZUSTAENDE` je Filter (`['nichts','ja']` oder `['nichts','nein']`).
- „verfügbar“ → „streambar“ (nur Datenbank), TV nur als Plattformchip im Kalender; Schnellchip TV entfällt.
- Dateien: `schnellfilter.ts`, `schnellfilter.tsx`, `filter-zyklus.ts`, `FilterDetails.tsx` (nur Streichungen), `i18n-spaet.ts`, Tests.

### S6: Darstellung (Verhaltensänderung)

- Neue Komponente `web/src/components/filter/AktiveChips.tsx` (bestehendes Chip-Muster, `ak-*`-Tokens): entfernbare Chips unter der Leiste (Handy eine Zeile scrollbar; Desktop in der Kopfzeile der Liste).
- Zahlen an den Datenbank-Chips (`filter-zaehlung.ts`, Ergebnis ohne eigene Facette; nur Chips im geöffneten Fenster, Berechnung beim Öffnen, Budget am Handy gemessen).
- Knopf „N Titel zeigen“ statt „Fertig“ (Handy); Desktop-Kopfzeile mit Trefferzahl.
- Leerzustand nennt die Filter (Erweiterung von `suchhinweis.ts`, Regel E6).
- Schnellfläche einfarbig; „ohne Synchro“ und „Staffeln zusammenfassen“ in die Ansichtsleiste (Handy: Werkzeugleiste).
- Auge „Im Handel“: Tooltip „nur im Kalender“.
- Dateien: `components/filter/*`, `FilterDetails.tsx` (Streichungen, Chip-Gruppen auslagern), `db-kopfzeile.tsx`, `kalender/BereichAuge.tsx`, `i18n-spaet.ts`, `ansicht-*.mjs` (neue Zusicherungen).

### S7: Doku und Bilder

- `docs/wissen/datensatz.md` / `docs/wissen/karte.md`: Filterebenen, Speicher je Ansicht, Migration; `status.md` und `stand.md` nachführen.
- Nachher-Bilder (`node tools/pr-bilder.mjs`) in `docs/konzept/filter/nachher/`, Gegenüberstellung für Schritt 3 (Top 5, `analyse.md` Abschnitt 5).

## 3. Tests und Prüfungen

- Einheiten: Weg-Modul (alle Zustände, Kombinationen, Titel ohne Weg, Streams ohne Art), `passtTitel` mit echten Fällen, Vorlieben je Ansicht (Kalender ändert Datenbank **nicht** und umgekehrt), Router (Adresse ↔ Datenbank-Filter, Push `fav=1`).
- Zählprobe (S1) rot → grün: Disc-Ausschluss 2.880 statt 2.738 Titel, „Netflix + Disc“ 0 statt 22, „Crunchyroll + Film“ 0 statt 115, „kostenlos + Netflix“ 0 statt 17.
- Ansicht: `check:ansichten`/`check:panel` (PR-Aussehen), neue Zusicherung `ansicht-filter-getrennt.mjs`: im Kalender Disc-Auge klicken, in die Datenbank wechseln, Disc darf dort nicht gesetzt sein; und `ansicht-yaiba.mjs`: Karte „Yaiba: Samurai Legend“ bei Disc aus sichtbar.
- Mess: CLS und Filterzeit am Handy (Drosselung) wie bisher, `ZIELE.md` Budgets; Zahlen an Chips dürfen den Filterwechsel nicht über 50 ms heben (Messung vorher/nachher an 2.926 Titeln).
- `npm run check:vor-commit` läuft in der Prüfkette (Agenten fahren es nicht lokal).

## 4. Wächter gegen die Yaiba-Klasse (fünf Stufen)

1. **Ursache:** `passtTitel` wertet Ausschluss einer Wegeigenschaft über `releases.some(…)` und entscheidet damit für den ganzen Titel (`filters.ts` Z. 513–517); die Einheit der Entscheidung (Titel) passt nicht zur Einheit der Eigenschaft (Weg).
2. **Klasse:** Jeder Ausschluss einer Wegeigenschaft in der Datenbank (Messung Analyse 2.1: Disc 142, Prime 443, Crunchyroll 349 …) sowie jeder Einschluss-Mix (Netflix + Disc 22 Titel ohne Weg) und kostenlos + Plattform. Dazu die Geräte-Vorlieben, die über Ansichten fließen (zehn Felder).
3. **Dauerhaft schließen:** Weg-Modul (S2/S3); Vorlieben je Ansicht (S4).
4. **Wächter mit Lehre:**
   - Test `filters.wege.test.ts` (Fixtures mit Yaiba-Struktur: ein Titel, drei Weg-Arten) schlägt fehl, sobald ein Weg-Ausschluss den Titel wirft.
   - Kurzer Prüfer in `check:logic` (`tools/filter-ebenen-pruefen.mjs`): Jede Filterart in `FilterState` hat in `shared`/`web/src/lib/filter-ebenen.ts` eine **deklarierte Ebene** (`titel` | `weg`); ein neues Feld ohne Deklaration lässt den Check scheitern, ein Weg-Feld in `passtTitel` außerhalb von `wege-filter.ts` ebenfalls.
   - Datensatz-Wächter (`check:filter-zaehlprobe`, nachts, Exit 0): über `public/data` je Weg-Eigenschaft „Titel, die nach Ausschluss verschwinden“ gleich „Titel, deren **alle** Wege die Eigenschaft haben“, sonst Meldung.
   - Lehre in `ai_agent_learnings.md` und `docs/wissen/betrieb.md` („Filterebene: Ausschluss wirkt auf der Ebene der Eigenschaft“), Skill `stille-ausfaelle-verhindern`: Verwerfungspfad „Titel verworfen wegen Weg“ wird gezählt und im Ergebnis genannt (Leerzustand E6).
   - Zusicherung für getrennte Speicher (`ansicht-filter-getrennt.mjs`) als Wächter gegen das Leck.
5. **Warum die Prüfkette es durchließ:** `filters.test` prüfte Ausschlüsse an Titeln mit **einem** Weg (Film-Sonderfall 03.09.2026 wurde als Einzelfall behoben, die Klasse blieb); `kalender-filter.ts` trug seit 09.10.2026 den Satz „Filter gehören dem Kalender allein“, die Schnellfilter wurden aber als „Vorlieben des Geräts“ ausgenommen und niemand prüfte das gegen Disc. Schärfung: Prüfer und Bauer bekommen in `.claude/agents/pruefer.md`/`bauer.md` und im Skill `pruefen-und-belegen` die Frage „**Welche Einheit entscheidet, welche Einheit trägt die Eigenschaft?**“ bei jeder Filteränderung, und Tests für Filter brauchen mindestens ein Fixture mit mehreren Wegen/Zuständen (Mehrfach-Zustände, Analyse 2.1).

## 5. Migration gespeicherter Filter

Ausgangslage: localStorage `vorlieben` (zehn Felder, veröffentlicht), `tvAus`, `meineAnbieter`; Adressen mit `xrt=disc` (alt: `xp=disc`).

- **Einmalig beim ersten Start nach der Änderung** (`vorliebenMigrieren()`, in `App.tsx` vor dem ersten Lesen): Liegt `vorlieben` vor und `vorlieben.kalender` fehlt, wird der Wert nach `vorlieben.kalender` kopiert (Kalender behält, was er hatte); die Datenbank startet **leer** (sie hat vorher nur geerbt; ein geerbtes „Disc aus“ war nicht ihre Wahl). Danach wird `vorlieben` gelöscht.
- Wegfallende Felder (`confirmed*` in der Datenbank, `years` im Kalender, `availableOnly` im Kalender) werden beim Lesen verworfen, nicht gemeldet.
- `tvAus` bleibt Kalender; `meineAnbieter` bleibt geteilte Hilfsliste.
- Adressen: `xrt=disc` in der Datenbank bleibt gültig (jetzt Weg-Ausschluss), `xp=disc` wandert wie bisher (`readLists`). Veröffentlichte Push-Links `fav=1` bleiben (Kalender).
- Ablaufbedingung für den Migrationscode (Regel „Rückwärtskompatibilität nur für Veröffentlichtes“): entfernen, wenn alle Geräte einmal geöffnet haben können, frühestens 31.01.2027; Termin in `stand.md` beim Einführen.
- Mehrstufige Beobachtung nach Einführung (Regel Neueinführung): am ersten Fall (Yaiba live), nach etwa fünf Fällen (Datenbankfilter in Support/Feedback), nach einem Tag, nach einer Woche (Auswertung der Filterzustände über Meldungen, ohne neues Tracking).

## 6. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Geteilte Datenbank-Adressen ändern ihre Treffer (Ausschluss zeigt mehr Titel) | gewollt; Hinweis in den Patch Notes für Besucher („Ausgeschlossene Plattformen blenden nur noch ihre Einträge aus, nicht mehr den ganzen Anime“) |
| Filtergeschwindigkeit am Handy (18.863 Titel in der Rechnung inkl. ohne Synchro, `filterTitlesGen` gibt alle 6 ms ab) | Weg-Modul rechnet pro Titel O(Wege); vorher/nachher am gedrosselten Handy messen; Zahlen an Chips erst beim Öffnen |
| Streams ohne Art/Status: Art-Einschluss lässt 1.271 Titel ohne Release aus dem Ergebnis fallen | gewünscht, aber der Hinweis „Art gilt nur für Termine“ steht am Chip; vorher mit der Zählprobe nachsehen, ob Nutzer dadurch Titel vermissen |
| Push-Worker rechnet nach eigener Regel (`shared/push-filter.ts`) | nicht anfassen; Test, dass `terminFilter` unverändert aus dem Kalender-Speicher kommt |
| Wegfall von Filtern (bestätigt in DB, Jahr im Kalender) gilt als „Wegfall einer Funktion“ | Projektregel E0: geht an Daniel. Der Wegfall ist wirkungslos (bestätigt) bzw. widersprüchlich (Jahr); wird als Punkt im Schritt-2-PR benannt, nicht stillschweigend |
| Dateigröße `FilterDetails.tsx` 784 Zeilen | S5/S6 streichen zuerst, neue Gruppen in eigene Dateien; `check:umfang` sinkt |
| Chips ohne Zahl im Kalender-Zeitraum bei neuem Speicher | Kalender-Zahlen kommen weiter aus `zeitraum`; unverändert |

## 7. Überlegungen (für das Mockup)

- **Reihenfolge nach Wirkung:** S3 (Yaiba) und S4 (Leck) sind die beiden Fehler und kommen zuerst, in dieser Reihenfolge je ein PR; die Darstellung (S6) erst, wenn beide live gemessen sind (Regel „fertig = nach Deploy live gemessen“).
- **Weg-Modul statt Flickwerk:** Die Untergrenze (A) wäre in zwei Stunden gebaut, ließe aber 22 + 115 + 17 falsche Kombinationstreffer stehen. B behebt die Klasse und ist testbar mit den echten Zahlen.
- **Mockup zeigt zuerst die Karte:** Yaiba vorher/nachher an einer Stelle (Datenbank, Suche „Yaiba“, Disc aus), dann das Fenster mit entfernbaren aktiven Chips und „N Titel zeigen“.
- **Was Daniel entscheiden muss (nach Regel E0, Wegfall einer Funktion):** Jahr-Filter im Kalender und „bestätigt“ in der Datenbank entfallen. Beide haben heute keine sinnvolle Wirkung (Analyse 2.3); die Empfehlung ist Entfernen.
- **Beobachtung:** Der Nachweis „live“ ist ein Vergleich der Zählprobe gegen die Live-Seite (Titel „Yaiba: Samurai Legend“ erscheint bei Disc aus; Kalender-Auge ändert die Datenbank nicht), nicht nur ein grüner Test.
