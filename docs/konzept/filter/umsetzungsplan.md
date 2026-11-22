# Filterkonzept, Umsetzungsplan (Fassung 2 nach Gegenprüfung, 22.11.2026)

**Fassung 2 nach Gegenprüfung.** Grundlage: [analyse.md](analyse.md), Befunde in [gegenpruefung.md](gegenpruefung.md) (B1–B17, hier als „B<n>“ zitiert). Schritt 3 baut nach diesem Plan.

**Was sich gegenüber Fassung 1 geändert hat:**

1. **Film-Regel (B1):** Streams erben die Art `movie` vom Werk (`format: MOVIE`); Fassung 1 hätte „Crunchyroll + Film“ von 115 auf 0 gesenkt.
2. **Zahlenbasis (B2):** die Datenbank hat 3.550 Einträge, nicht 2.926; „Disc aus“ entfernt 29 Titel zu Recht und 139 nicht mehr zu Unrecht.
3. **Jahr bleibt Release-Jahr (B3)**, nicht `jpYear` (450 → 118 Titel für 2026 wäre ein Verlust).
4. **Keine neuen Speicher (B4, B5):** Schnellfilter bleiben Vorlieben, aber je Ansicht ein Schlüssel; nicht in die Adresse; kein `sessionStorage`; kein Dauerspeicher für Kalender-Listenfilter.
5. **Rettungsweg-Regel (B5, B6)** mit `watchLinks`; Disc-Weg = `platform disc` oder `releaseType disc`.
6. **Push-Abo (B7):** Kalender-Schnellfilter nur aus eigenem Speicher; Wächter.
7. **Migration (B8):** durchlesend in `vorliebenLesen`, Datenbank startet mit der **Kopie**, nicht leer.
8. **Tests (B9):** `pipeline/check-*.ts` mit Fixtures in `tools/check-logic-liste.txt`, Bestandsprobe in `check-bestand-liste`; Test und Fix im selben PR.
9. **UND/ODER-Regel (B10)** ist festgelegt.
10. **Darstellung gestrichen/gedreht (B11–B13):** kein „N Titel zeigen“, kein Auge-Tooltip, TV-Plattformchip entfällt statt des Schnellchips.
11. **Zustände bleiben (B14):** nur tote Filter entfallen.
12. **Zahlen an Chips eingeschränkt (B15)**; Mockup, Bühnen-Plan und Vorher/Nachher-Bilder neu (Abschnitt 6).

Regeln: Umbau und Verhaltensänderung nie im selben Commit; `check:umfang` darf nur sinken (`filters.ts` 593 Zeilen, `FilterDetails.tsx` 784 von 800: neuer Code in neue Module); jeder PR ein Thema.

## 1. Untergrenze, Gegenentwurf, Wahl

- **Untergrenze (Stufe 1, ≈ 70 Zeilen):** Weg-Regel im Ausschluss + je Ansicht ein Vorlieben-Schlüssel + `useKalenderFilter` unabhängig von der Route. Löst beide Fehler von Daniel.
- **Gegenentwurf (Plan-Agent, nur Ziel bekannt):** `wege[]` als Datenfeld in `titles.json`, Speicher `{kalender, datenbank, version}`. Verworfen (Schema, Download-Budget, Worker); `wegeVon` bleibt rein und kann später in die Pipeline wandern (gegenpruefung.md C).
- **Gewählt:** Weg-Modul `web/src/lib/wege-filter.ts` in zwei Stufen. Stufe 1 liefert die Untergrenze plus Modul für den Ausschluss; Stufe 2 den Einschluss (gleicher Weg), Jahr/Status/kostenlos und die Darstellung.

## 2. Festgelegte Regeln (Spezifikation für Schritt 3)

**R1 Einheiten.** Titel-Filter (Genre, Schlagwort, FSK, Herkunft, Wertung, Cartoon, Favoriten, Vertrauen, Sprecher, Film-Werk) entscheiden über den Titel. Weg-Filter (Plattform, Anbieter, Art, Status, Jahr, kostenlos, Disc, TV, „streambar“) entscheiden über **Wege**.

**R2 Wege eines Titels.** `wegeVon(titel, releases)` liefert je Eintrag `{plattform, art?, status?, jahr?, frei?, quelle}`:
- je Release: `platform`, `releaseType`, `releaseStatus(r, heute)`, `year`, `quelle: 'release'`;
- je `streams[]`: `platform`, `frei = zugang === 'kostenlos'`, `art = 'movie'` wenn `titel.format === 'MOVIE'` sonst keine, `quelle: 'stream'`;
- je `watchLinks` mit `kind: 'stream'`: `plattform = Name` (nur über „Anbieter“ filterbar), `art` wie Stream, `quelle: 'link'`; `buy`-Links sind kein Weg.
Disc-Weg: `platform === 'disc' || art === 'disc'` (B6). Berechnung einmal je Titel (`WeakMap`).

**R3 Ausschluss.** Ein Titel bleibt, wenn er **keinen** Weg hat oder mindestens **einen** Weg, der keinen Ausschluss trifft. Reiner Handel („Disc aus“) fällt weg: 29 von 3.550 (Messung 22.11.2026).

**R4 Einschluss und gleicher Weg.** Mehrere Weg-Einschlüsse müssen vom **selben** Weg erfüllt werden. Je Dimension gilt ODER (Vorgabe) oder UND (`modus`, B10):
1. Kandidatenwege = Wege, die alle Ausschlüsse bestehen und in jeder ODER-Dimension einen gewählten Wert tragen;
2. je UND-Dimension braucht jeder gewählte Wert einen eigenen Zeugen unter den Kandidaten (verschiedene Wege erlaubt);
3. gibt es keine UND-Dimension, genügt ein Kandidat.
Titel ohne Weg scheitern an jedem Einschluss (wie heute).

**R5 Karte zeigt nur bestehende Wege.** Plattform-Chips und Disc-Abzeichen der Karte lesen die Kandidatenwege (Yaiba bei „Disc aus“: Joyn und TV, kein Disc-Abzeichen).

**R6 Zahlen am Datensatz sind die Erwartung der Tests** (Tabelle in Abschnitt 5).

**R7 Entfallende Zustände (nur tot oder widersprüchlich):** „bestätigt“ in der Datenbank; „Jahr“ im Kalender; „verfügbar“ im Kalender (Vorliebe, wirkungslos). Alle anderen bleiben dreiwertig. Schnellchip TV bleibt im Kalender, der TV-Plattformchip dort entfällt. Zweitanbieter bleibt „nur ausblenden“.

## 3. Schritte (je ein PR; Reihenfolge nach Wirkung)

### M0: Mockup auf der Bühne (zuerst, hält die Entscheidung fest; Abschnitt 6)
Vor dem ersten Bau-PR gemergt (Skill `mockups`).

### S1: Yaiba-Fix und Trennung (Verhaltensänderung, Stufe 1)
- Neu `web/src/lib/wege-filter.ts` (`wegeVon`, `kandidatenWege`, `titelPasstAusschluss`); `passtTitel` (`filters.ts:496-520`) nutzt es für Plattform, Anbieter, Art im **Ausschluss**; die alten Zeilen entfallen (`filters.ts` sinkt). Film-Werk-Regel und `hatArt` im Einschluss bleiben unverändert (Einschluss kommt in S3).
- `vorlieben.ts`: `vorliebenLesen(ansicht)`, `vorliebenNachfuehren(ansicht, vorher, nachher)`; Schlüssel `vorlieben.kalender` und `vorlieben.datenbank`; Lesen fällt auf den alten Schlüssel `vorlieben` zurück (Migration, Abschnitt 5); Felder: Kalender ohne `availableX`, Datenbank ohne `confirmedX`.
- `router.ts`: `parseHash` setzt Vorlieben nur der aktuellen Ansicht ein (`router.ts:182-197`); `schreiber` ruft `vorliebenNachfuehren` nur, wenn `route.view` **und** `merged.view` dieselbe Gruppe (Kalender oder Datenbank) sind, mit dessen Schlüssel (`router.ts:451`); sonst würde ein Ansichtswechsel den Zustand der anderen Ansicht als „Änderung“ schreiben.
- `kalender-filter.ts`: `useKalenderFilter` hält die Kalender-Schnellfilter (initial aus `vorliebenLesen('kalender')`) im eigenen Zustand; `kalenderBasis(route.filters)` entfällt aus dem Wirkweg; Push (`App.tsx:88`) liest nur diesen Zustand (B7).
- Gleichzeitig Wächter (Abschnitt 4) und die neuen Zusicherungen. Test und Fix im selben PR; Rot-Beleg: neue Zusicherungen gegen den Stand `36c6d22a` im PR-Text.
- Dateien: `web/src/lib/wege-filter.ts` (neu), `filters.ts`, `vorlieben.ts`, `router.ts`, `kalender-filter.ts`, `App.tsx`, `pipeline/check-filter-wege.ts` (neu), `check-vorlieben.ts`, `check-kalender-filter.ts`, `check-adressen*.ts`, `check-push-filter*.ts`, `tools/check-logic-liste.txt`, `docs/wissen/datensatz.md` (Abschnitt „Filterebene Titel/Weg“).

### S2: Karte und Leerzustand (Verhaltensänderung)
- Karte (`DbKarte`-Umfeld, Plattform-Chips, Disc-Abzeichen) liest die Kandidatenwege (R5).
- Leerzustand nennt die Filter (E6): Erweiterung von `suchhinweis.ts`/`suchhinweis-filter.ts`; Text für Besucher, „Kein Treffer wegen: Disc aus · Fantasy · … [Filter lösen]“.
- Dateien: `web/src/components/DatabaseView.tsx`-Umfeld, `suchhinweis*.ts`, `i18n-spaet.ts`, Zusicherungen.

### S3: Einschluss auf gleichem Weg, Jahr, Status, kostenlos (Verhaltensänderung)
- `titelPasstWege` (R4) ersetzt die Einschlussprüfungen für Plattform, Anbieter, Art, Jahr, Status, kostenlos, „streambar“; `modus` wird eingehalten.
- Erwartungswerte siehe Abschnitt 5 (Netflix + Disc 22 → 0, kostenlos + Netflix 17 → 0, Crunchyroll + Film 115 bleibt, UND-Fall).
- Dateien: `wege-filter.ts`, `filters.ts`, Zusicherungen.

### S4: Aufräumen der Zustände und Namen (Verhaltensänderung)
- „bestätigt“ aus Datenbankfenster und aus `activeFilterCount` der Datenbank; „Jahr“ aus dem Kalenderfenster; Kalender-`availableX` verworfen.
- Plattformchip TV im Kalender entfällt (`FilterDetails.tsx:752-763`, nur Streichungen).
- „verfügbar“ → „Streambar“ (`i18n-spaet.ts:312`), Schlüssel und Adresse `wo=1` bleiben.
- Dateien: `FilterDetails.tsx`, `schnellfilter.ts`/`.tsx`, `i18n-spaet.ts`, Zusicherungen.

### S5: Darstellung (Verhaltensänderung, nach Live-Messung von S1–S3)
- Neu `web/src/components/filter/AktiveChips.tsx` (vorhandenes Chip-Muster, `ak-*`): entfernbare Chips der Datenbank unter der Leiste; Handy eine Zeile, seitlich scrollbar; Desktop im Listenkopf (Trefferzahl dort steht schon). Entfernen-Fläche 44 px (`TIPPFLAECHE`), Name „Disc ausgeschlossen, entfernen“, `role="list"`.
- Schnellfläche im Filterfenster einfarbig (E9); „ohne Synchro“ und „Staffeln zusammenfassen“ am **Handy** in die Werkzeugleiste (am Desktop stehen sie schon im Listenkopf).
- Zahlen (`filter-zaehlung.ts`, neu): nur Plattform, Art, Status, Schnellchips; Kernbestand; beim Öffnen des Fensters in `useZeitscheibe`; Chip mit 0 abgeblendet, aber tippbar; Zahl im Namen („Netflix, nur, 14 Titel“).
- Alte Farbklasse `slate-` in `ModusSchalter` auf `ak-*` (nur sinkend, `tools/design-klassen.mjs`).
- Dateien: `components/filter/*`, `FilterDetails.tsx` (Gruppen auslagern), `DatenbankBereich.tsx`, `i18n-spaet.ts`, `ansicht-filterfenster.mjs` (neue Zusicherungen).

### S6: Doku, Bilder, Beobachtung
- `docs/wissen/datensatz.md` (Filterebenen), `docs/wissen/betrieb.md` (Lehre), `karte.md` (Speicher je Ansicht), Skill `stille-ausfaelle-verhindern` (Verwerfungspfad „Titel wegen Weg verworfen“), `.claude/agents/pruefer.md`/`bauer.md` und Skill `pruefen-und-belegen` (Frage „Welche Einheit entscheidet, welche trägt die Eigenschaft?“, Pflicht-Fixture mit mehreren Wegen); `status.md`/`stand.md`.
- Nachher-Bilder `node tools/pr-bilder.mjs` nach `docs/konzept/filter/nachher/`.
- Nebenbefund in `status.md`: 2 Releases `auto-544-disc`, `auto-142770-disc` (`platform disc`, `releaseType movie`).

## 4. Wächter (fünf Stufen)

1. **Ursache:** Die Einheit der Entscheidung (Titel, `releases.some`) passt nicht zur Einheit der Eigenschaft (Weg), `filters.ts:513-520`; zweitens ein Geräte-Eintrag für zwei Ansichten, `router.ts:184`.
2. **Klasse:** jeder Ausschluss und jede Kombination von Weg-Eigenschaften (Messungen B1, Analyse 2.1/2.2), alle zehn Vorlieben-Felder, das Push-Abo (B7).
3. **Dauerhaft schließen:** `wege-filter.ts` als einzige Stelle der Weg-Logik; Vorlieben je Ansicht.
4. **Wächter mit Lehre:**
   - `pipeline/check-filter-wege.ts` (Fixtures, kein `public/data`): Yaiba-Struktur (Disc ×2, Joyn, TV, Stream) bleibt bei „Disc aus“; Nur-Disc-Titel fällt weg; Titel ohne Weg bleibt; Netflix + Disc → 0; Film-Werk mit Crunchyroll-Stream trifft „Crunchyroll + Film“; UND-Fall; `watchLinks`-Rettung. **Mutationsprobe** (Skill `pruef-technik`): Rückbau auf `releases.some` muss rot werden.
   - `pipeline/check-filter-ebenen.ts` (in `check:logic`): jedes Feld von `FilterLists`/`FilterState` hat eine deklarierte Ebene in `web/src/lib/filter-ebenen.ts` (`titel`|`weg`); `passtTitel` prüft Weg-Felder nur über `wege-filter.ts` (Textprüfung auf `releases.some`/`platformsOf` außerhalb des Moduls).
   - `pipeline/check-vorlieben-getrennt.ts`: Kalender-Änderung lässt `vorlieben.datenbank` unverändert und umgekehrt; Datenbank-Chip ändert `pushFilterWert(...)` nicht (B7); Ansichtswechsel schreibt nichts.
   - `tools/filter-zaehlprobe.mjs` (Bestand, `check-bestand-liste`/nachts, Exit 0, fester Stichtag): je Weg-Eigenschaft „verschwindet nach Ausschluss“ = „alle Wege tragen sie“, sonst Meldung; Zahlen in `docs/konzept/filter/zahlen.json`.
   - Zusicherung `ansicht-filter-getrennt.mjs` (Playwright, Bühne): Disc-Auge im Kalender → Datenbank zeigt Disc nicht gesetzt; `ansicht-yaiba.mjs`: Karte „Yaiba: Samurai Legend“ bei „Disc aus“ sichtbar, ohne Disc-Abzeichen.
5. **Warum die Kette es durchließ:** `filters`-Prüfungen nutzten Titel mit **einem** Weg (Film-Sonderfall 03.09.2026 als Einzelfall behoben); `kalender-filter.ts` trägt seit 09.10.2026 „Filter gehören dem Kalender allein“, nahm aber die Schnellfilter aus, und niemand prüfte das gegen Disc und Push. Schärfung in S6 (Prüfer-/Bauer-Vorgabe, Skills).

## 5. Tests, Erwartungswerte, Migration

**Erwartungswerte** (Messung 22.11.2026; Fixtures bilden die Fälle nach, die Bestandsprobe prüft sie am Datensatz):

| Fall | heute | neu |
|---|---|---|
| Disc aus, DB-Basis 3.550 | 3.382 | 3.521 |
| Disc aus, `titles.json` | 2.738 | 2.880 (nur-Handel ohne Link-Stream) / 2.894 mit Rettung über `watchLinks` |
| Prime aus / Crunchyroll aus / Netflix aus (`titles.json`) | 2.005 / 2.247 / 2.528 | 2.448 / 2.596 / 2.694 |
| Netflix + Disc | 22 | 0 |
| TV + Disc | 5 | 0 |
| kostenlos + Netflix | 17 | 0 |
| Crunchyroll + Film, Netflix + Film, Prime + Film | 115 / 79 / 340 | gleich (Werk-Regel) |
| Film aus (Werk) | 2.820 | 2.820 |

(Die Basis `titles.json` zählt Ecchi mit; die Fixtures müssen die Basis nennen.)

**Einheiten:** `wege-filter` (alle Zustände, Kombinationen, `modus`, Titel ohne Weg, Streams, `watchLinks`), `passtTitel` mit Yaiba-Fixture, Vorlieben je Ansicht, Router (Adresse ↔ Datenbankfilter; `xp=disc` → `xrt=disc`; `fav=1` im Kalender), Push-Filter unverändert aus dem Kalenderzustand.

**Mess und Ansicht:** `check:ansichten`/`check:panel` in der Kette; CLS und Filterzeit am gedrosselten Handy vorher/nachher (Budget aus `ZIELE.md`); Facettenzahlen dürfen den Tippweg nicht verlangsamen (ein Filterlauf heute 14,6 ms / 39,8 ms mit Titeln ohne Synchro, Node). Tippflächen ≥ 44 px (E2), Kontrast AA in beiden Themen, Escape/Fokus des Fensters wie bisher.

**Migration alter Vorlieben.**
- `vorliebenLesen(ansicht)`: liest `vorlieben.<ansicht>`; fehlt er, den alten Schlüssel `vorlieben` (beide Ansichten starten mit der **Kopie**: kein sichtbarer Sprung, auch nicht im Push-Abo). Verworfen werden `availableX` (Kalender) und `confirmedX` (Datenbank) und `discAus`-Reste beim Lesen.
- Der erste Schreibvorgang einer Ansicht legt ihren Schlüssel an; der alte Schlüssel wird gelöscht, sobald beide neuen existieren (offene alte Tabs/Service-Worker-Stände schreiben höchstens den alten Schlüssel, der dann ignoriert wird).
- `tvAus`, `meineAnbieter`, `groupSeasons`, `ecchiZeigen` bleiben unverändert.
- Adressen: `xrt=disc` bleibt gültig (jetzt Weg-Ausschluss, `buildHash` schreibt es weiter **nicht**, es ist Vorliebe); `xp=disc` wandert wie bisher; `fav=1`, `frei=1`, `wo=1`, `sicher=1` (letzteres in der Datenbank ignoriert) werden gelesen, nicht geschrieben; `#/favoriten`, `#/wo` bleiben.
- Ablauf: Migrationscode entfernen frühestens 31.01.2027, Termin in `stand.md` beim Einführen (Regel „Rückwärtskompatibilität nur für Veröffentlichtes“).
- Beobachtung nach Einführung (Regel Neueinführung): am ersten Fall (Yaiba live bei „Disc aus“, Auge ändert Datenbank nicht), nach ≈ 5 Fällen, nach einem Tag, nach einer Woche (Zählprobe gegen Live-Seite; keine neue Erhebung).

## 6. Bühnen-Mockup und Vorher/Nachher (für Daniels Test vor dem Live-Gang)

**Mockup:** `web/buehne/mockups/filter-konzept.tsx` (nach Vorbild `reihen-box.tsx`, Anmeldung mit `mockup({...})`), Ausschnitt `datenbank` (die ganze App, Adressparameter je Fall über `suchadressen`), Fälle aus `faelle.json`: `yaiba-joyn` (vorhanden), `alle`; Fälle werden bei Bedarf mit `npm run buehne:faelle -- --nur <slug>` ergänzt. Keine eigenen Schalter; Leiste, Gerät und Thema liefert der Rahmen.

- **Vorher** = echtes Bauteil auf dem Stand `main`; **Nachher** = die neuen Bauteile hinter Weichen (`web/buehne/vite-weichen.ts`): `AktiveChips`, Weg-Karte, Leerzustand, Filterfenster ohne Schnellfläche. Das Mockup ist der spätere Test: Nach dem Bau wird „Nachher“ zur echten Komponente, die Bilder müssen übereinstimmen; Nachbau-Teile fliegen im Bau-PR raus.
- Weil die Zellen flüchtigen Speicher haben (B16), zeigt ein Skript (`tools/ansicht-filter-getrennt.mjs`, Playwright, headless) den Wechsel Kalender → Datenbank in **einer** Zelle; das Mockup trägt es als Fall `kalender-auge`.
- Messung: `npm run buehne:bauen`, `buehne:bilder -- --mockup filter-konzept`, `buehne:messen` (Tippziele ≥ 44 px, Kontrast; ein rotes ✕ im Nachher ist ein Fehler des Entwurfs). Danach Bereitlegen und Upload nach Skill `mockups` Schritt 4–5; Bilder werden **vor** der Bitte an Daniel angesehen.

**Liste der Überlegungen (im Mockup als Notiz je Variante):**
1. Ausschließen heißt: diese Einträge nicht sehen, nicht diese Anime nicht sehen (Yaiba).
2. Kalender fragt „was kommt wann“, Datenbank „was gibt es“: eigene Vorlieben, nichts erbt.
3. Mehrere Bedingungen gelten für denselben Weg („Netflix + Disc“ gibt es nicht).
4. Film ist ein Werk: ein Stream auf einem Film bleibt ein Film.
5. Ein Zustand wird nur entfernt, wenn er tot oder widersprüchlich ist; sonst gilt überall derselbe Griff (nichts → nur → ohne).
6. Zahlen helfen vor der Wahl, aktive Chips danach; Zahlen nur, wo sie billig sind.
7. Nichts doppelt: die Trefferzahl steht schon im Balken bzw. Listenkopf.
8. Der Leerzustand nennt den Filter, der die Treffer nimmt, und löst ihn mit einem Tipp.
9. Das Push-Abo hängt nur am Kalender.
10. Jahr = Jahr, in dem etwas bei uns erscheint.

**Top-5-Vorher/Nachher-Bilder** (je Handy 390 × 844 und Desktop 1600 × 900, hell und dunkel = 4 Bilder je Zustand; Vorher liegen unter [ist/](ist/)):
1. **Yaiba bleibt:** Datenbank, Suche „Yaiba“, „Disc aus“. Vorher `ist/*-6-yaiba-disc-ausgeschlossen.png`; nachher: Karte mit Joyn und TV, ohne Disc-Abzeichen.
2. **Getrennte Filter:** Kalender mit zugeklapptem Disc-Auge, dann Datenbank. Vorher `ist/*-8-datenbank-erbt-disc-aus.png`; nachher: Datenbank ohne Disc-Ausschluss, Kalender behält ihn.
3. **Aktive Chips und Leerzustand:** Datenbank mit zwei Filtern und leerem Ergebnis; Vorher `ist/handy-*-4-*`, nachher: Chipzeile + „Kein Treffer wegen …“.
4. **Filterfenster:** ohne farbige Schnellfläche, ohne doppeltes TV im Kalender, Ansichtsschalter in der Werkzeugleiste (Handy). Vorher `ist/*-2-*`, `ist/*-4-*`.
5. **Zahlen an Chips:** Plattform/Art/Status mit Zahl, 0 abgeblendet. Vorher `ist/desktop-*-4-datenbank-filterfenster.png`.

## 7. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Geteilte Datenbank-Adressen zeigen nach dem Umbau mehr Titel (Ausschluss blendet nur Wege aus) | gewollt; Patch-Note für Besucher: „Ausgeschlossene Plattformen und Disc blenden nur noch ihre Einträge aus, nicht mehr den ganzen Anime“ (Skill `patchnotes-autor`) |
| Push-Abo ändert sich still | Wächter `check-vorlieben-getrennt`, Kopie bei Migration (B7, B8) |
| Filterzeit am Handy | Weg-Liste einmal je Titel (`WeakMap`); vorher/nachher gedrosselt; Zahlen nie auf dem Tippweg |
| Streams ohne Art: Art-Einschluss lässt Titel ohne Release aus dem Ergebnis | wie heute; Chip-Hinweis „Art gilt für Termine“ nicht neu eingeführt; Zählprobe vorher ansehen |
| Dauerhaft gemerkter Schnellfilter in der Datenbank wirkt unsichtbar | aktive Chips (S5) machen ihn sichtbar; bis dahin Zähler am Filterknopf (heute schon) |
| `FilterDetails.tsx` 784/800 Zeilen | S4 streicht zuerst; neue Gruppen in eigene Dateien; `check:umfang` sinkt |
| Mockup und Bau driften | Nachbau-Teile werden im Bau-PR gelöscht; Bild muss dem Mockup gleichen |
| Wegfall toter Filter gilt als „Wegfall einer Funktion“ (E0) | keine wirksame Funktion; im PR-Text mit Messung benannt |
