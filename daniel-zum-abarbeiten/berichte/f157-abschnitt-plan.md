# F157 „Abschnitt": eine Seite je Serie, jede Staffel ein Abschnitt — Plan

Auftrag `f157-abschnitt-plan-2411` (Dirigent, 24.11.2026 14:35). Nur Plan und Messung, kein Produktcode geändert. Gemessen am Stand
`1217e539` (main, 24.11.2026 14:23) mit Wegwerfskripten (`/tmp/m1.mjs` … `m4.mjs`, nicht eingecheckt) gegen `public/data/*` und `data/*`.
Zeilenzahlen für Neues sind Schätzungen und so gekennzeichnet.

**Entscheidung Daniel, 24.11.2026 12:49 (F157 „Abschnitt"):** Lange Serien mit belegten Staffelgrenzen bekommen keine eigenen Titel je Staffel,
sondern eine Seite je Serie; jede Staffel ist ein Abschnitt (Reiter an der Box, Mockup `web/buehne/mockups/staffel-abschnitt.tsx`,
`staffel-reiter*.ts(x)`, `staffel-pfeile*.ts(x)`, `staffel-lage.ts`). Je Staffel Folgenzahl, Status (erschienen / läuft / kommt), Synchro.
Kalenderkachel „Horizonte · Staffel 3 · Folge 38". Suche: ein Treffer je Serie. Favorit und Abo gelten für die ganze Serie. Keine
Kalender-ID ändert sich. Rahmen aus der Entscheidungsdatei (liegt nur lokal bei Daniel, nicht im Repo; hier nach dem Auftragstext):
Grenzen zuerst deutsche Plattform/Disc, dann gelesene Liste, TMDB nur Vorschlag; Namen nur wörtlich gelesen, sonst „Staffel N";
ohne belegte Grenze bleibt ein Eintrag; nichts wird automatisch geteilt. Dazu F153-Vorgabe 23.11.2026 19:39: keine Schwelle entscheidet,
je Serie eine eigene Einschätzung (`f153-staffelplan.md`, Kopf).

## 1. Befund (gemessen 24.11.2026)

### 1.1 Zwei Staffel-Bauweisen leben nebeneinander

| | **Pokémon-Mechanik** (Abschnitt im Titel) | **Staffel-Titel** (Horizonte, PR 4603 ff.) |
|---|---|---|
| Quelle | `data/curated/pokemon-staffeln.yaml` (Grenzen je Titel) | `data/curated/horizonte-staffeln.yaml` (Grenzen + `kennung` 7000001–7000003, `basis: 4`) |
| Bau | `pipeline/lib/pokemon-staffeln.ts` lädt; `folgen-dateien.ts:127` schreibt `s` | Phase `teileStaffelTitel` (`pipeline/build.ts:32`, `pipeline/bau/staffel-titel.ts` 117 Z., `pipeline/lib/staffel-titel.ts` 170 Z., `staffel-termine.ts`, `staffel-folgen-schreiben.ts` 42 Z.) |
| Ausgabe | `folgen/<id>.json` Feld `s: [[Staffel, von, bis], …]`, offene letzte `[Staffel, von]`; `franchises.json` `staffelQuelle`/`staffelBis`/`staffelFolgen`; Termine `staffelFolge: [Staffel, Folge]` (nur Nicht-TV, `pipeline/bau/staffel-folge-termine.ts`) | 4 Titel in `titles.json` (7000001/2/3 + 158871 als Staffel 4) mit `staffelTitel: {sammel, nr, ab, aktiv?, laengste?}`; eigene Releases `auto-700000N-tv-*`; eigene `folgen/700000N.json` (Staffelzählung, ohne `s`) |
| Anzeige | Folgenliste mit Staffel-Abschnitten (`web/src/components/detail/folgen-staffeln.ts` `staffelAbschnitte`, `folgen-bereich.tsx:119`), Wegzeile „Staffel 1–3, Staffel 4 Fg. 1" (`shared/staffel-folge.ts` `staffelTeile`, `staffel-angabe.ts`), Kachel „Staffel {s} · Folge {n}" (`Marken.tsx:55,66`) | vier eigenständige Titelseiten; Reiter nur im Mockup (`staffel-reiter-liste.ts` `ausSammeltitel`) |

### 1.2 Zahlen

- **Titel mit Staffeldaten in `folgen/<id>.json` (`s`): 12 von 1824 Folgendateien** — 527 (5 Staffeln), 1564 (4), 1565 (4), 112153 (3), 97634 (3), 14093, 19291, 9107 (je 2), 158870, 17115, 17873, 21356 (je 1). Alles Pokémon-Familie.
- `franchises.json`: 286 Vorkommen von `staffelQuelle`/`staffelBis`/`staffelFolgen` (Reihen-Beschriftung, nicht nur Pokémon).
- **Staffel-Titel: genau 4** (7000001 S1 ab 1, 7000002 S2 ab 46, 7000003 S3 ab 90, 158871 S4 ab 137 mit `aktiv` 2026-11-24, `laengste` 47).
- Horizonte-Termine: 117 (7000001 TV 72, 7000002 TV 24, 7000003 TV 20, 158871 RTL+ 1). **Termin-IDs tragen noch die alte Form** (`auto-158871-tv-super-rtl@2026-09-16` an Release `auto-7000002-tv-super-rtl`): die ICS-UID (`shared/ics.ts:134`, `UID:${ev.id}@anime-kalender-de`) hängt nicht am Titel. Termine mit `staffelFolge` im ganzen Bestand: **0** (Pokémon hat keine Nicht-TV-Termine im Fenster, Horizonte ist geteilt).
- Folgendateien Horizonte: 7000001 `f` 45 / `de` [[1,45]], 7000002 44 / [[1,44]], 7000003 33 / [[1,47]], **158871 hat keine Folgendatei**; `zaehlung.json` 158871 `[1,1,1]`.
- Kennungen (`data/kennungen.json`, Zeile `[ak, AniList, aniSearch, zuAk?]`): `[14839,158871,17947]`, `[26469,7000001,17947]`, `[26470,7000002,17947]`, `[26471,7000003,17947]`; 10 Zeilen tragen heute `zuAk`.
- Alte Kennungen 7000001–3 in eingecheckten Daten: `news-historie.json` 36×, `synchro-historie.json` 3×, `meldungen-an-claude.jsonl` 2×, `maengel.json` 2×, `public/data/news.json` 1×. D1 (Meldungen) nicht gemessen (Kopie braucht Token, siehe 6).
- Suche heute: „Horizon" trifft in `titles-core.json` **7 Titel**, davon 4 Horizonte (158871, 7000001–3).
- Größen gzip: `titles-core.json` 220,7 KB, `franchises.json` 226,4 KB, `woche-kacheln.json` 9,8 KB (248 Termine, 33 Titel; Horizonte in der Datei: 0). Startbudget 190 KB, zuletzt 184,4 KB (05.11.2026, `tools/start-budget.mjs`; heute nicht neu gemessen, braucht den Vite-Bau).

### 1.3 Wer liest Staffeldaten

- `staffelTitel`/`lesekennung`/`staffelVonTiteln`/`zurueckAufSammeltitel`: 37 Dateien unter `pipeline/`, `shared/`, `web/`, `worker/`, `tools/` (u. a. `13-1-toggo-fenster.ts`, `13-2-auslieferung.ts`, `13-4-zusatzdateien.ts`, `cartoon-reihen.ts`, `luecken-titel.ts`, `check-anilist-produkt.ts`, `ausgabe-kennung.ts`, `maengel-regeln.ts`; Wächter `check-staffel-titel.ts` 277 Z., `check-staffel-titel-termine.ts` 278, `check-staffel-lesekennung.ts` 124, `check-staffel-aufrufer.ts` 83, `check-staffel-historie.ts` 72, `check-horizonte-staffeln*.ts` 273, `check-horizonte-kachel.ts` 109).
- `s` liest: Panel (`folgen-bereich.tsx`), Wegzeile (`staffel-angabe.ts` über `staffelTeile`), Worker-Titelzeile (`worker/migrations/055/056/058` `json_extract(t.daten,'$.s')`, `titelzeile-format.ts`).
- `staffelFolge` liest: Kachel (`Marken.tsx`), Terminseite (`pipeline/lib/termin-seite.ts:16`).
- **Wertvoll und zu behalten:** `pipeline/lib/staffel-termine.ts` ordnet TV-Termine über den Folgentitel der Wikipedia-Liste einer Staffel zu (tv.de nennt keine Nummern, Sender wiederholen quer durch die Staffeln, Tor-Befund PR 4579). Genau das braucht die Kachel „Staffel 3 · Folge 38" bei TV.

## 2. Untergrenze (einfachster denkbarer Weg)

Horizonte zurück auf die Pokémon-Mechanik: `kennung`/`basis` aus `horizonte-staffeln.yaml` streichen, Phase `teileStaffelTitel` für diese Serie nicht mehr laufen lassen. Dann gibt es wieder einen Titel 158871 mit `s` (4 Zeilen), die Folgenliste zeigt Staffel-Abschnitte, die Wegzeile „Staffel 1–3, Staffel 4 Fg. 1", Suche einen Treffer. Alles das baut schon (Stand vor PR 4603). Es fehlt gegenüber F157: Reiter an der Box, Status je Staffel, `staffelFolge` an TV-Terminen, Weiterleitung der drei Kennungen, Übernahme von Favoriten/„gesehen bis". Aufwand Daten ~10 Z., Umleitung 3 Zeilen in `kennungen.json`; Wächter-Umbau unvermeidlich (die Staffel-Titel-Wächter schlagen sonst an).

## 3. Datenmodell: Ansätze im Vergleich

| | **A: Feld `staffeln` am Titel** (`titles.json`/`titles-core.json`) | **B: Ableitung aus `folgen/<id>.json` (`s`) + `staffelFolge` am Termin (Empfehlung)** | **C: Staffel-Titel behalten, nur verstecken** |
|---|---|---|---|
| Idee | Grenzen, Namen, Status je Staffel als Feld an jedem Titel mit Staffeln | Grenzen und Namen nur in der Detaildatei (besteht); Termine tragen `[Staffel, Folge]` (besteht, auf TV ausweiten); Panel rechnet Abschnitte beim Öffnen | 7000xxx bleiben intern, Suche/Liste blenden sie aus, Panel zeigt sie als Reiter |
| Ladegröße | `titles-core` +0,18 KB gzip für 13 Titel, +0,40 KB für alle 32 Kern-Titel > 60 Folgen (gemessen, Formfeld); nicht im Startbudget, aber im Nachladen (≈ 337 KB) | Startbudget: nur `staffelFolge` an Wochenkacheln, geschätzt < 0,1 KB gzip (≈ 10 Horizonte-Termine/Woche × ~15 B); Detaildatei lädt erst auf Absicht; `titles-core` −1,6 KB gzip durch Wegfall von 3 Titeln (gemessen) | unverändert (4 Titel bleiben) |
| Regel „neues Feld nur, wenn die Mehrheit es braucht" | **verletzt** (13 von 2929 Titeln) | erfüllt (kein neues Titelfeld; Staffelname als 4. Stelle in `s`-Zeile oder eigenes `sn` in der Detaildatei) | erfüllt |
| Bauaufwand (geschätzt) | Feld + Typ + Packer ~60 Z., Panel ~80 Z. | Namen in `s` ~20 Z., TV-`staffelFolge` über `staffel-termine` ~40 Z., Panel-Reiter aus Mockup übernehmen ~120 Z., Status ~30 Z. in `shared/logic.ts` | Ausblenden an Suche, Woche, Reihen, Datenbank, Teilen-Seiten, Meldungen: > 15 Leser, jeder ein Sonderfall |
| Suche | ein Treffer, Staffelnamen als Synonyme nötig | ein Treffer; Staffelnamen („Gute Aussichten") als Synonyme von 158871 in `synonyme.json` | Filter an jeder Suchstelle |
| Kalenderkachel | `staffelFolge` am Termin trotzdem nötig | `staffelFolge` besteht, `Marken.tsx` zeigt es schon | Kachel zeigt Staffel-Titel-Namen, nicht „Staffel 3 · Folge 38" |
| Events / ICS | Termine bleiben am Titel, `ev.id` unverändert | dito; Release-Slugs zurück auf `auto-158871-*` | unverändert |
| Status (nur `shared/logic.ts`) | im Bau vorberechnet, veraltet zwischen Bauläufen | zur Laufzeit aus Terminen + `de` + `today` über eine neue Funktion in `shared/logic.ts` | `titleStatus` je Staffel-Titel (besteht) |
| Favorit/Abo ganze Serie | ja | ja | **nein**: Favorit hängt an einer Staffel, Staffel 5 wäre ein neuer Titel (F153-Vorgabe „Gruppen-Favorit" nur mit Zusatzlogik) |
| Wartung bei neuer Staffel | Yaml + Bau | eine Yaml-Zeile | Yaml-Zeile + neue Kennung + neue Kennungszeile |

**Empfehlung: B.** Es ist im Kern die Pokémon-Mechanik, die schon für 12 Titel läuft und gelesen wird; F157 ergänzt Anzeige (Reiter), Status je Staffel und TV-Zuordnung. A verletzt die Feldregel und bringt nichts, was B nicht hat; C hält die ganze Teilungs-Maschinerie am Leben und verfehlt „Favorit für die ganze Serie".

**Status je Staffel (B):** neue Funktion `staffelStatus(zeile, events, de, today)` in `shared/logic.ts` (761 Z. heute; +~25 Z. ⇒ ~786, unter 800 — knapp, siehe Risiko 6.5): *erschienen* = jede Folge der Staffel deutsch erschienen (`de` deckt `von..bis`, kein künftiger Termin); *läuft* = mindestens eine erschienen und (offene Staffel oder künftiger Termin mit dieser Staffel); *kommt* = keine erschienen, Termin angekündigt. Folgenzahl je Staffel = `bis − von + 1`, offene Staffel ohne Zahl („≈" nur, wenn `episodeCountAssumed`). Synchro je Staffel aus `staffelTeile` (besteht).

## 4. Horizonte-Rückbau

1. **Kennungen:** `data/kennungen.json` Zeilen 26469/26470/26471 bekommen `zuAk` 14839. Jede alte Kennung hat genau einen Nachfolger — die 1:1-Form von `zuAk` reicht (das Problem „nur 1:1" betraf Teilungen, nicht das Zusammenführen). Daraus entsteht `ak-umleitung.json` (`[[26469,14839],…]`): `/t/26469` → `/t/14839` (`web/src/lib/ak-umleiten.ts` `adresseNachfolger`), Teilen-Seiten der alten ak über `schreibeUmleitungen`.
2. **Favoriten/Abos ohne Doppelung:** Browser-Favoriten laufen durch `umleiteListe` (Set ⇒ wer S1 und S4 gemerkt hat, hat danach einen Eintrag). Server-Abos (`worker/src/favoriten-kennung.ts` lädt `ak-umleitung.json`) ebenso; Feed-Filter `leseFavoriten` dedupliziert vor dem Lesen prüfen (Messweg 6.2).
3. **„Gesehen bis Folge":** `umleiteKarte` nimmt bei Zahlen das Maximum, **ohne Versatz**: „gesehen bis 5" an Staffel 2 (= durchlaufend 50) würde 5 an 14839. Nötig: Umleitung mit Versatz `[alt, neu, ab−1]` (S1 0, S2 45, S3 89) in `ak-umleitung.json` und `umleiteKarte` (~10 Z.). Dazu 14839 selbst: seit `aktiv` 2026-11-24 zählt die Basis in Staffel 4 (Folge 1 = 137) — ein am 24.11. gesetztes „gesehen bis 1" an 14839 ist mehrdeutig; kleiner Fall (ein Tag), wird als Restrisiko hingenommen und dokumentiert.
4. **Folgenzählung:** Kalender und `gesehenBis` zählen wieder durchlaufend (Folgennummer des Kalenders); Anzeige „Staffel 4 · Folge 1" kommt nur aus `staffelFolge`. `zaehlung.json` 158871 wird `[137,137,…]`, die „137 von 137"-Falle (`check-folgenzahl-offen-bau.ts`) bleibt durch die offene Staffel gesperrt; im Panel zeigt der Abschnitt „Staffel 4: 1 Folge, läuft".
5. **Meldungen und Historie:** News-Meldungen bleiben unverändert (Aussage zu ihrem Tag, `news-plan.md`); ihre Kennung 7000xxx übersetzt `ausgabe-kennung.ts` über `zuAk` auf 14839. Meldungen aus der D1 mit 7000xxx und Staffelfolge: `zurueckAufSammeltitel` (shared/staffel-titel.ts) **bleibt** als Lesefunktion für Altmeldungen, mit fester Tabelle (7000001→ab 1, 2→46, 3→90) statt aus gebauten Titeln; dazu ein `bis`-Tag für das Basis-`aktiv`-Fenster (Meldungen zu 158871 zwischen 24.11. und Rückbau-Tag zählen in Staffel 4).
6. **Releases:** Slugs `auto-700000N-tv-*` verschwinden, `auto-158871-tv-*` kommen zurück. `ev.id` (= UID) war nie umgestellt ⇒ Abonnenten-Kalender unverändert. Release-Seiten `/r/auto-700000N-*`, falls erzeugt: Messweg 6.3.
7. **Rückbau-Code:** Phase `teileStaffelTitel`, `pipeline/lib/staffel-titel.ts` (Plan/Teilung), `staffel-folgen-schreiben.ts`, `13-1-toggo-fenster.ts`-Verteilung, `mitStaffelTiteln`, Sonderfälle in `luecken-titel.ts`, `check-anilist-produkt.ts`, `check-anisearch-kennung-mehrfach.ts`, die Staffel-Titel-Wächter. Geschätzt −900 bis −1200 Zeilen ⇒ `check:umfang` sinkt. `staffel-termine.ts` (Wikipedia-Zuordnung) wird umgehängt: statt den Termin auf einen anderen Titel zu verschieben, schreibt es `staffelFolge`.

## 5. Wellen

Jede Welle: Umbau und Verhaltensänderung in getrennten Commits; Umbau mit `tools/bau-vergleich.mjs` (gleiche Ausgabe), Panel mit `tools/panel-vergleich.mjs`; Probelauf vor dem Merge.

### Welle 1 — Horizonte als eine Seite (kleinster lieferbarer Schnitt)

Horizonte (158871) wird wieder ein Titel mit vier Abschnitten; Reiter, Status und Kachel „Staffel N · Folge M" gelten automatisch auch für die 12 Pokémon-Titel mit `s`, weil sie dieselben Daten tragen. Die Kalenderkachel zeigt bei TV „Staffel 3 · Folge 38" über die Wikipedia-Zuordnung, die alten Kennungen leiten um, Favoriten und „gesehen bis" wandern mit Versatz.

- **1a Daten/Bau (Verhaltensänderung):** `horizonte-staffeln.yaml` ohne `kennung`/`basis`, Namen bleiben (wörtlich gelesen, Belege im Kopf); Phase aus `build.ts` raus; `pipeline/bau/10-termine.ts` + `staffel-folge-termine.ts`: TV-Termine erhalten `staffelFolge` aus `staffel-termine.ts`, nur bei eindeutigem Folgentitel-Treffer (sonst ohne, gezählt); `folgen-dateien.ts` schreibt Staffelnamen in die Detaildatei; Synonyme der Staffelnamen an 158871; `kennungen.json` `zuAk`; `shared/wochen-packen.ts` trägt `staffelFolge` in die Kachel-Datei (heute nicht, gemessen 0 Vorkommen).
- **1b Aufräumen (Umbau, eigener Commit):** toter Staffel-Titel-Code und Wächter raus, `zurueckAufSammeltitel` auf feste Alt-Tabelle.
- **1c Web:** Reiter aus `web/buehne/mockups/staffel-*` nach `web/src/components/detail/` (Quelle: `s` der Detaildatei statt `staffelTitel`; `reiterVon` → aus `s`), Abschnitt zeigt Folgenzahl, Status (`staffelStatus` aus `shared/logic.ts`), Synchro (`staffelTeile`); Reiter wählen nur den Abschnitt, kein Titelwechsel; `ak-umleiten.ts` Versatz.
- **Prüfungen/Wächter Welle 1:** (1) kein Titel im Raum 7.000.000–7.999.999 in `public/data` (`istStaffelTitel`); (2) Horizonte-Termine vorher = nachher: 117, Menge `ev.id` gleich; (3) jeder Nicht-TV-Termin von 158871 trägt `staffelFolge`, TV ohne Treffer gezählt und unter Schwelle gemeldet; (4) `zuAk` für 26469–26471 = 14839 und `ak-umleitung.json` enthält sie mit Versatz; (5) Summe der Staffelfolgen 1–3 = 136 = `s`-Grenzen (besteht als `check-horizonte-staffeln.ts`, umschreiben); (6) Suche „Horizonte" ⇒ genau ein Horizonte-Treffer; (7) Panel-Vergleich: Reiter vorhanden bei ≥ 2 Zeilen in `s`, sonst Panel unverändert; (8) Startbudget `tools/start-budget.mjs` ≤ 190 KB; (9) Stichprobe live nach Deploy: `/t/26470/` landet auf `/t/14839/`, Kachel eines TV-Termins zeigt „Staffel N · Folge M".

### Welle 2 — weitere Serien mit belegten Grenzen

Je Serie eine Yaml nach Horizonte-Muster (ohne `kennung`), allgemeiner Lader statt `pokemon-staffeln.ts`-Sonderweg (`data/curated/staffeln/<serie>.yaml` oder Liste in einer Datei). Reihenfolge und Einschätzung je Serie aus `f153-staffelplan.md` 4.2, aber nach F157-Rahmen: Grenzen aus deutscher Plattform/Disc (Naruto Shippuden 21 Netflix-Staffeln mit Synchrogrenze 480–500, Black Clover 51/51/52/16), gelesene Liste danach, TMDB nur als Vorschlag (Fairy Tail, Hunter × Hunter, Captain Tsubasa erst mit deutscher Bestätigung). Je PR eine bis drei Serien. Wächter: Yaml-Grenzen summieren sich zur Folgenzahl; Grenze widerspricht keiner zweiten gelesenen Quelle (Yū Yū Hakusho-Fall 26/27); `dubRanges` werden je Staffel korrekt geschnitten (`staffelTeile` = Summe).

### Welle 3 — Gegenrichtung und Rest

AniList-Teile derselben deutschen Staffel (Mushoku Tensei, Bungo Stray Dogs) und Serien ohne Grenze (Yu-Gi-Oh!, Dragon Ball Z) — eigene Entscheidung, erst nach Welle 2 und nur mit gelesener deutscher Liste.

## 6. Risiken und offene Punkte (je mit Messweg)

1. **TV-Zuordnung zu Staffeln** (größtes Risiko für die Kachel): heute 116 TV-Termine, die Sender wiederholen quer durch die Staffeln. Messweg: `staffel-termine.ts` auf den aktuellen Bestand laufen lassen, Anteil Treffer/ohne Treffer zählen (Ziel: ohne Treffer ⇒ Kachel ohne Staffel, nie eine falsche Staffel); Stichprobe 10 Termine gegen TOGGO-Programm.
2. **Favoriten-/Abo-Doppelung im Worker:** prüfen, ob der Feed nach `umleiteListe` doppelte ak entfernt. Messweg: Test mit Favoritenliste `[26469,14839]` gegen `favoriten-feed.ts`, erwartet ein Titel.
3. **Release-Seiten `/r/auto-700000N-*`:** ob `build-share-pages.ts` sie erzeugt hat und ob Links darauf existieren. Messweg: `grep -c auto-700000 public/r/**` im Bau bzw. Liste der Teilen-Seiten; falls ja, Umleitung `/r/<alt>/` → `/r/auto-158871-*` mitbauen.
4. **D1-Meldungen mit 7000xxx:** Zahl unbekannt. Messweg: `node tools/mit-lauf-token.mjs meldungskopie-holen`, dann `node tools/meldungskopie.mjs abfrage "SELECT titel, COUNT(*) FROM meldungen WHERE titel BETWEEN 7000000 AND 7999999 GROUP BY titel"` (Spaltenname gegen Schema prüfen), nur an der Kopie.
5. **`shared/logic.ts` nahe 800 Zeilen** (761 + ~25). Messweg: vor Welle 1c `wc -l`; reicht der Platz nicht, zuerst Umbau-Commit (Status-Hilfen in `shared/logic-*.ts`, Export bleibt über `logic.ts`), Skill `zerlegen`.
6. **„Gesehen bis" am Basis-Titel 14839 nach `aktiv` 24.11.** (Staffelzählung, ein Tag): nicht messbar (nur im Browser). Wird hingenommen und in `datensatz.md` vermerkt.
7. **Worker-Titelzeile** liest `$.s` (Migrationen 055/056/058): ein vierter Wert (Staffelname) in der `s`-Zeile könnte die Zeile verändern. Messweg: `titelzeile-format.ts`-Test mit `s` samt Namen; falls betroffen, Namen als eigenes Feld `sn` statt in `s`.
8. **Kachelname „Horizonte" statt „Pokémon Horizonte":** `staffelFolgeText` nimmt `event.name`; ob gekürzt wird, entscheidet der Mockup-Abgleich, nicht dieser Plan.
9. **Startbudget nicht neu gemessen** (Vite-Bau fehlt in der Cloud). Messweg: Kette misst `tools/start-budget.mjs` in Welle 1a.
