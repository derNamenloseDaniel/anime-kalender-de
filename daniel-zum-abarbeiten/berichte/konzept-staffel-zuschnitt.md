# Konzept: Staffeln nach dem besten Anbieter zuschneiden

Stand 28.11.2026. Nur Konzept, nichts gebaut. Auftrag Daniel 27./28.11.: Stone Ocean (AniList/aniSearch Teil 6.1 + 6.2, Netflix eine Staffel mit 38 Folgen) — intern bleiben 6.1, 6.2 und 6; der Besucher sieht den Zuschnitt des besten Anbieters; der aniSearch-Absprung zeigt beide Einträge. Vergleichsfall PR 5261 (Steel Ball Run als Reiter 7.1 und 7.2–3).
Zahlen aus `public/data/titles.json`, `data/anbieter-staffeln.json` (Netflix, 366 Kennungen, gemeldet über die Erweiterung), gemessen 28.11.2026 mit einem Wegwerfskript (Scratchpad, nicht eingecheckt). Keine Netflix-Seite abgerufen.

## 1. Klasse (Netflix)

Vergleich je Netflix-Kennung: unsere Serien-Titel an der Adresse (ohne Film/Special/Musik, nach Jahr/Jahreszeit) gegen Netflix' Folgenzahlen je Staffel; „Grenzen“ = Summenfolgen. Von 366 Kennungen haben 125 einen Titel bei uns.

| Befund | Kennungen |
|---|---|
| 1 Titel : 1 Staffel | 47 |
| gleiche Liste | 34 |
| Summe weicht ab (Serie läuft noch / unvollständig; Steel Ball Run: Netflix 1+1, wir 1+11) | 19 |
| **Netflix gröber, wir feiner** (Netflix-Grenzen ⊂ unsere) | **12** |
| Netflix feiner, wir gröber (Gegenrichtung; Teilung → bestehender Weg „Staffel-Titel“, `pipeline/bau/staffel-titel.ts`) | 9 |
| Grenzen kreuzen sich | 0 |

Die 12 Fälle der Aufgabe (Netflix führt als eine Staffel, was wir als mehrere Titel führen):

| Netflix-Kennung | Netflix-Staffeln | Unsere Titel (AniList-ID, Folgen) |
|---|---|---|
| 80179831 JoJo | 26 / 48 / 39 / 39 / **38** | 14719 (26) · 20474 (24)+20799 (24) · 21450 (39) · 102883 (39) · **131942 (12)+146722 (26)** |
| 80039972 | 25 / 25 | Tiger & Bunny 9941 (25) · 117197 (13)+151803 (12) |
| 80987039 | 23 / 25 | Mushoku Tensei 108465 (11)+127720 (12) · 146065 (13)+166873 (12) |
| 80991903 | 13 / 11 | Dorohedoro 105228 (12)+OVA 114622 (1) · 173172 (11) |
| 80992228 | 12 / 12 / 28 | Kengan Ashura 100891 (12) · 111048 (12) · 146638 (12)+169692 (16) |
| 80997338 | 15 / 9 | Hi Score Girl 20574 (12)+Extra Stage 104307 (3) · 108581 (9) |
| 81054847 | 12 / 12 / 24 | Beastars 107660 · 114194 · 136880 (12)+187267 (12) |
| 81186864 | 8 | Pokémon Concierge 162147 (4)+175035 (4) |
| 81281579 | 12 / 15 / 15 | Record of Ragnarok 127399 (12) · 138056 (10)+165356 (5) · 187921 (15) |
| 81564905 | 13 / 13 | My Happy Marriage 147103 (12)+OVA 167486 (1) · 169441 (13) |
| 81663325 | 22 | Sakamoto Days 177709 (11)+184237 (11) |
| 81922765 | 25 | Baki-Dou 210032 (12)+… 13 |

Umfang: 12 Kennungen, 31 Titel von rund 2.930 (1 %); bei 4 davon (Pokémon Concierge, Sakamoto Days, Baki-Dou, Mushoku Tensei Teil 2) ist der Netflix-Zuschnitt zugleich die einzige bekannte deutsche Staffelzählung. Eine Folgezeile (Steel Ball Run) gehört zum Rand: sie steht in der Klasse „Summe weicht ab“, solange Netflix nur 2 Folgen kennt.
Nicht erfasst (keine Daten im Repo): Crunchyroll führt je Serie nur eine Staffelzahl (`data/cr-katalog-de.json`, `staffeln`), keine Folgen je Staffel; Prime/Disney+ nichts je Staffel. Die Klasse für sie ist **nicht gezählt**; der Mechanismus unten kennt die Quelle als Eingabe, ohne sie zu verlangen.

## 2. Bestand, an den das Konzept anschließt

- **Staffel-Titel** (Horizonte, `data/curated/horizonte-staffeln.yaml`, `pipeline/bau/staffel-titel.ts`): schneidet **einen** AniList-Titel in mehrere Titel (neue Kennungen 7.xxx.xxx, `Title.staffelTitel`). Das ist die Gegenrichtung (9 Fälle oben); für unseren Auftrag nicht nutzbar, weil Zusammenlegen Kennungen vernichten würde (Kalender-UIDs `ev.id`, Favoriten, Links, Handbelege).
- **Netflix-Staffelabgleich** (`pipeline/lib/netflix-staffeln.ts`, 16.10.2026): ordnet Netflix-Staffel N dem N-ten unserer Titel zu, **nur wenn die Folgenzahl genau passt**. Bei Stone Ocean passt „Staffel 5 = 38“ nicht auf einen unserer Titel (12/26) — der Abgleich lässt die Adresse unberührt (gewollt).
- **Reiter-Beschriftung** `staffelBeschriftungen`/`zaehleStaffeln` in `shared/titles.ts`: zählt aus **Namen** („Part 2“, „Season 2“). PR 5261 hat dort `teilMerkmal` (`shared/staffel-part.ts`) ergänzt: Steel Ball Run → „7.1“, „7.2–3“, Stone Ocean → „6.1“, „6.2“. Die Zählung kennt keinen Anbieter.
- Folgenzählung Stone Ocean: 131942 hat 12 Folgen, 146722 trägt 26 (aniSearch/AniList; Teil 2 zählt wieder ab 1). `public/data/folgen/146722.json` führt bisher nur 12 deutsche Folgentitel (Zählung 12/12 gegen 26 Folgen) — eigener Befund, hier nicht angefasst.
- Wichtig für die Regel „Plattform-Serienkennung = Franchise, Zuordnung über Folgenzahl; ein Anime gehört genau einer Kennung“: die Netflix-Adresse 80179831 bleibt Franchise-Adresse; die Zuordnung der Anbieter-Staffel zu unseren Titeln läuft über Summenfolgen (26+… = 38), nicht über die Reihenfolge allein.

## 3. Ansätze

**Untergrenze (Ansatz 0): nur Beschriftung, kein neues Feld.** Handliste in `data/` nennt je Fall „diese zwei Titel heißen im Panel Staffel 6“; `staffelBeschriftungen` liest sie. Zwei Reiter blieben (je Titel einer), beide „6“ — doppelte Information auf dem Bildschirm (`design-regeln.md` 13). Nur Vergleichswert.

### Ansatz A — Anzeigefeld `anbieterStaffel` je Titel (Beschriftung, ein Reiter je Anbieter-Staffel)

Datenmodell: `Title.anbieterStaffel?: { nr: number; teil?: number; von: number; bis: number; quelle: 'netflix' }` (optional, nur die 12 Kennungen), gesetzt von einer neuen Bau-Phase `pipeline/bau/anbieter-zuschnitt.ts` nach `staffel-titel.ts` aus `data/anbieter-staffeln.json` **und** unseren Titeln (Summenfolgen-Abgleich, Position für Position, wie `netflix-staffeln.ts`; jede Abweichung = kein Feld). Reiter und Kopf lesen `anbieterStaffel`, wenn vorhanden: ein Reiter „6“ öffnet 131942, listet beide Teile als Abschnitte der Staffel.
- Kalender: unverändert (`ev.id`, ICS-UID, Termine hängen an den Titeln). ICS-Titel unverändert „… Stone Ocean“; keine Änderung nötig.
- Folgenzählung: Netflix-Zählung 1–38 über beide Teile (`von`/`bis` je Teil), Teil 2 zeigt dort „Folge 13–38“ statt „1–26“ (Anzeige, wie `zaehlSpanne` aus PR 5261). Interne Zählung (`schedule.firstEpisodeNumber`, `zaehlung.json`) bleibt.
- Suche: unverändert (zwei Titel, wie heute). Optional ein Alias „Staffel 6“.
- aniSearch-Absprung: `verweise.ts` zeigt je Teil seinen aniSearch-Link — schon heute beide; im Reiter „6“ werden beide Einträge nebeneinander gezeigt.
- Risiken: Panel-Code (`reihen-reiter-liste.ts`, `staffel-reiter.tsx`, `reihen-namen.ts`) kennt „ein Reiter = ein Titel“; ein Reiter für zwei Titel ändert das (Reiter-Kennung, Deep-Link `#/t/<id>`, Hervorhebung). Größter Aufwand der drei.

### Ansatz B — nur Beschriftung aus dem Anbieter (Reiter bleiben je Titel)

Gleiches Feld `anbieterStaffel`, aber es ändert nur die **Beschriftung** der bestehenden Reiter: 131942 → „6 (Folge 1–12)“, 146722 → „6 (Folge 13–38)“ statt „6.1/6.2“; Steel Ball Run entspräche Netflix' Zuschnitt „7“ (1+1 gemeldet) mit „7.1/7.2–3“ unverändert, solange Netflix nur 2 Folgen kennt. `staffelBeschriftungen` bekommt als Eingang `anbieterStaffel` (shared, keine Pipeline-Logik im Web). Kein neuer Reiter-Typ.
- Wirkung wie A auf Kalender/ICS/Suche/Absprung; Folgenzählung als Anzeige-Spanne.
- Risiko: der Besucher sieht „zwei gleiche Reiter“ mit gleicher Staffelnummer (6 und 6) — die Unterscheidung steht nur im Zusatz. Löst „der Besucher sieht den Zuschnitt des besten Anbieters“ nur teilweise, ist aber billig und ohne Panel-Umbau.

### Ansatz C — zusammenlegen (ein Titel je Anbieter-Staffel, Alt-Kennungen als Alias)

Neuer Titel 6 mit 38 Folgen; 131942/146722 verschwinden aus dem Bestand. Verletzt „Ein Vorfilter verschiebt, er löscht“, bricht Kalender-Abos (UID), Favoriten, Handbelege (`dub-confirmed.yaml` nutzt `anilistId`), aniSearch-/MAL-Zuordnung (jeder der beiden hat eigene IDs) und die Regel „ein Anime gehört genau einer Kennung“. Verworfen; nur zur Vollständigkeit.

## 4. Gegenentwurf (Agent `Plan`, kannte nur das Ziel; Wortlaut gekürzt, Inhalt vollständig)

**Einfachster Weg laut Agent:** `staffelQuelle: 6` auf 131942 und 146722 — zeigt „Staffel 6 – Teil 1/2“, also den AniList-Zuschnitt; Ziel verfehlt, nur Zwischenschritt für die Nummer.
**Vorschlag: „Zuschnitt-Titel“, Gegenstück zum Staffel-Titel.**
- Handdaten `data/curated/anbieter-zuschnitt.yaml` (`url`, `staffel` = Netflix-seq, `glieder` = AniList-IDs in Reihenfolge); der Bau schlägt Treffer per Summenfolgen vor (12+26=38), bestätigt wird per Eintrag; reine Automatik riskant (Netflix ändert Liste → Zuschnitt verschwindet still).
- Neue Phase `pipeline/bau/anbieter-zuschnitt.ts` (nach `schliesseWegeAb`, vor `baueMeta`): **neuer Titel mit eigener Kennung** (Raum 7,5–8 Mio., aus kleinster Glied-Kennung abgeleitet), `episodes` = Summe (38), gleiche `franchiseId`, neues Feld `zuschnitt: { glieder: [{id, ab}], staffel, url }`; die Glieder bekommen `zuschnittIn` und sind für Besucher ausgeblendet (`sichtbareTitel` in `shared/titles.ts`), Pipeline/Prüfungen/aniSearch-Absprung sehen sie weiter.
- Termine wandern mit unveränderter `ev.id` an den Zuschnitt-Titel, Folgennummern um `ab` verschoben (Glied 2: Folge n → 12+n). Reiter „5“ statt „5.1/5.2“; Folgen 38 durchlaufend; ICS: UID gleich, Summary/Folgennummer verschoben; Suche findet den Zuschnitt-Titel, Glieder als Alias; aniSearch-Absprung mit Liste `anisearchIds` („Teil 1“, „Teil 2“); Erweiterungsmeldungen: Folge ≤ 12 → 131942, sonst 146722 (Folge−12), dafür Variante von `ordneStaffelnZu`.
- Risiken (Agent): Merklisten/Verläufe/alte Links auf ausgeblendete Kennungen (Weiterleitung), `ev.id` exakt gleich, Zuschnitt-Titel und Glieder dürfen nie beide zählen („Staffel 5 von 7“), Netflix-Drift laut melden, `titleStatus` aus beiden Gliedern, Synchro je Glied belegt (nicht für die ganze Staffel behaupten), nur Netflix in der ersten Fassung.
- Wächter (Agent): `check-anbieter-zuschnitt.ts` (12+26 ↔ 38 ergibt Titel; Gegenprobe 12+25 ergibt keinen und eine gezählte Meldung), Beschriftung „5“ nie „5.1/5.2“, Riegel „vorher = nachher“ (Termine, `ev.id`), ICS (UID gleich), Suche (einmal), Absprung (zwei Ziele), Meldung Folge 20 → 146722 Folge 8, Folge 39 verworfen und gezählt, Mutationsprobe 12/13.
- Aufgefallen: Der Agent liest `ordneStaffelnZu` (`netflix-staffeln.ts`) so, dass es bei mehr Titeln als Menü-Staffeln aussteigt (JoJo) — von mir nicht nachgeprüft, aber mit meinem Befund vereinbar (Folgenzahl passt auf keinen Einzeltitel).

**Vergleich:** Der Agent erfüllt „intern bleibt 6.1/6.2/6, außen 6“ wörtlich über eine **zusätzliche Kennung**; mein Ansatz A erfüllt es über ein **Anzeigefeld ohne neue Kennung**. Beide sind sich einig: Zusammenlegen (C) ist verworfen, Kalender-UIDs bleiben, Folgenzählung als Spanne (13–38), Netflix-Nummerierung ist ein Zuschnitt, der Bau prüft per Summenfolgen, Abweichung = kein Zuschnitt und gezählte Meldung. Unterschied: Der Zuschnitt-Titel vervielfacht die Risiken (ausgeblendete Kennungen, Weiterleitungen, Suchsynonyme, Status aus zwei Gliedern, Meldungen zurückrechnen) für 12 Kennungen / 31 Titel (1 %). Ein Gewinn gegenüber A bleibt: ein Reiter-Eintrag ist wirklich ein Titel (kein neuer Reiter-Typ).
**Übernommen vom Gegenentwurf:** Handeintrag je Fall mit Summenvorschlag statt Automatik; Netflix-Nummer ist nicht unsere Nummer (siehe 5, offener Punkt); Riegel „vorher = nachher“; Gegenprobe 12+25; Umbau vor Verhaltensänderung.

## 5. Empfehlung

**Ansatz A (Anzeigefeld `anbieterStaffel`, keine neue Kennung), Zuschnitt-Titel nur, wenn A an echter Bedienung scheitert.** Grund: Es genügt, die Gruppierung zu *zeigen*; Kennungen, Kalender, ICS, Suche und Favoriten bleiben, wie sie sind (kein Risiko für Abonnenten), und die Klasse ist klein. Den Zuschnitt-Titel kann man später auf A aufsetzen (das Feld ist seine Vorstufe), umgekehrt nicht.

**Offener Punkt (Daniels Entscheidung, Empfehlung steht):** Netflix zählt Stone Ocean als Staffel **5** (Phantom Blood + Battle Tendency = Netflix-Staffel 1), unsere Reihe als **6** (Teil der Reihe). Empfehlung: Besucher sieht die **Reihennummer 6**; vom Anbieter kommen nur die **Grenzen** (welche Teile eine Staffel bilden). Sonst steht dieselbe Staffel in Reihe und Reiter mit zwei Nummern.

### Bau-Schritte (je ein PR, Umbau getrennt von Verhaltensänderung)
1. **Umbau, ohne Wirkung:** `staffelBeschriftungen`/`zaehleStaffeln` bekommen einen optionalen Eingang `gruppe` je Titel; Ausgabe für alle Titel unverändert (`bau-vergleich.mjs`, `panel-vergleich.mjs`).
2. **Daten:** `data/curated/anbieter-zuschnitt.yaml` (`url`, `staffel`, `glieder`, Quelle, Datum) mit den 12 Fällen aus Abschnitt 1; neue Bau-Phase `pipeline/bau/anbieter-zuschnitt.ts` (Logik in `pipeline/lib/`) prüft jeden Eintrag gegen `data/anbieter-staffeln.json` (Summe der Glieder = Netflix-Folgenzahl, Position für Position wie `netflix-staffeln.ts`) und setzt `Title.anbieterStaffel = { nr, teil, von, bis }`; Abweichung = Feld fehlt, Zähler + Meldung im Bau (Skill `stille-ausfaelle-verhindern`). Feld nur an den 31 Titeln, nicht in `titles.json` für alle (CLAUDE.md: neues Feld nur, wenn die Mehrheit es braucht → in die Detaildatei/`franchises.json`-Mitglied legen).
3. **Anzeige:** Reiter „6“ für beide Teile (Klick öffnet den Teil, der offen ist, sonst Teil 1; im Panel Umschalter „Folge 1–12 | 13–38“), Folgenzeile als Spanne (`zaehlSpanne` aus PR 5261), Absprung zeigt beide aniSearch-Einträge (`verweise.ts`).
4. **Beobachtung:** nach dem ersten Fall, nach etwa fünf Fällen, nach einem Tag, einer Woche (Regel Arbeitsweise).
Reihenfolge der Fälle: JoJo → Tiger & Bunny, Kengan Ashura, Beastars (je klare Cour-Folge) → Rest. Die 9 Gegenrichtungs-Fälle bleiben beim Staffel-Titel-Weg (eigene Entscheidung, F153).

### Wächter (vorher rot, gegen main)
- `check-anbieter-zuschnitt.ts` (check:logic): 12+26 ↔ Netflix 38 ⇒ `anbieterStaffel` an beiden; Gegenprobe 12+25 ⇒ keins und gezählte Meldung; Titelzahl und alle `ev.id` vorher = nachher.
- Beschriftung: Stone Ocean zeigt **ein** Reiter-Label „6“ (nicht „6.1/6.2“); Steel Ball Run bleibt „7.1/7.2–3“, solange Netflix nur 1+1 kennt (PR 5261 darf nicht kippen).
- Bestandswächter `check-anbieter-zuschnitt-bestand.ts` (check:bestand): jeder Eintrag der Yaml gegen die aktuelle `anbieter-staffeln.json` (Drift ⇒ rot mit Titel); jeder Fall der Klasse aus Abschnitt 1 hat Eintrag oder begründete Ausnahme (Zählung 12 heute, nur sinkend).
- Panel: Fake-Bühnen-Test über den echten Stone-Ocean-Fall, beide Themen (Screenshot), Tippfläche des Umschalters.
- Mutationsprobe (`pruef-technik`) für Summengrenze 12/13 und Positionsvergleich.

## 6. Grenzen dieses Berichts
Nur Netflix gezählt (Crunchyroll/Prime liefern keine Folgen je Staffel); Netflix-Seiten nicht abgerufen, `anbieter-staffeln.json` stammt aus Erweiterungsmeldungen (Stand 25.09.–12.10.2026); Klassenzahl 12 ist eine Obergrenze für „sicher“ (Pokémon Concierge hat nur 1 Netflix-Staffel mit 8 Folgen, 2×4 bei uns — Folgen je Cour ungeprüft).
