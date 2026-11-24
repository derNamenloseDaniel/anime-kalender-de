# F157 – Gegenentwurf: eine Seite je Serie, Staffel = Abschnitt

Unabhängiger Entwurf (24.11.2026), nur aus CLAUDE.md, ARCHITEKTUR.md und den Daten unter `public/data` abgeleitet. Kein Produktcode geändert.

## 1. Untergrenze

**Es gibt das Modell schon.** Die Pokémon-Hauptserie ist ein Titel (527, 276 Folgen), die Staffeln sind nur Bereiche in `public/data/folgen/527.json` (`s: [[1,1,82],[2,83,118],…]`). Die Folgenliste zeigt daraus bereits Reiter je Staffel (`web/src/components/detail/folgen-staffeln.ts`). Horizonte ist die Ausnahme: vier Titel (7000001–7000003 synthetisch, 158871 als Basis) plus 3 Dateien `folgen/700000x.json`.

Einfachster Weg: **Horizonte wird wie 527 gebaut** — ein Titel (158871), `s` mit vier Bereichen (`[[1,1,45],[2,46,89],[3,90,136],[4,137]]`), keine Sondertitel. Alles andere (Kachel-Marke, Favorit, Suche) ergibt sich daraus oder ist schon so.

## 2. Datenmodell

- **Quelle der Wahrheit bleibt eine Staffelliste je Serie**: `[Staffel, von, bis?]` in durchlaufenden Folgennummern der Serie, offene Staffel ohne `bis`. Gleiches Format wie heute (`s`), gleiche Kuratierung (`data/curated/*-staffeln.yaml`), kein zweites Format.
- **Neu nur eins:** die Liste muss *ohne* Öffnen der Detaildatei verfügbar sein, weil die Kachel „Staffel 3 · Folge 38" und die Suche sie am Start brauchen. Dafür eine kleine Karte `st: { "<titleId>": [[nr,von,bis?],…] }` in `meta.json` oder einer eigenen Datei `staffeln.json`, **nur für Serien mit ≥ 2 belegten Staffeln**.
- **Staffelname** (offizielle Bezeichner, z. B. „Gute Aussichten") bleibt in der Detaildatei bzw. YAML; die Kachel braucht nur „Staffel N". Name erst im Panel nachladen.
- **Termine:** `episode` in Events wird **durchlaufend** (Serien-Nummer); Staffel und Staffelfolge rechnet `shared/` aus der Karte (`staffelVonFolge(st, nr)`) — eine Funktion, wie `shared/staffel-folge.ts` sie im Ansatz schon hat. Keine Staffelnummer in Events speichern (abgeleitet = ändert sich mit der Karte, nie veraltet).
- **Status je Staffel** (erschienen/läuft/kommt) und deutsche Folgenzahl sind abgeleitet aus `de`-Bereichen und `s`, wie `staffelAbschnitte()` es heute rechnet; nichts Neues speichern.
- **Favorit/Abo:** hängen an der Titel-ID der Serie (158871); künftige Staffeln sind nur eine neue Zeile in `s`, kein neuer Titel → gilt automatisch.
- **ICS:** UID ist `ev.id` (`shared/ics.ts:134`). Die Horizonte-Termine heißen schon heute `auto-158871-tv-…@datum` (Basis-ID, nicht 7000002) — die UIDs ändern sich beim Rückbau nicht, solange der Bau `ev.id` weiter aus der Basis bildet. Das ist der Beleg, dass die Sondertitel nur Anzeige waren.

**Gemessene Ladegröße (gzip -9, Stand 24.11.2026, `public/data`):**

| Posten | Wirkung |
|---|---|
| Karte `st` aller 12 Serien mit `s` + Horizonte | 482 B roh, **242 B gzip** (heute ohne Horizonte 224 B) |
| Wegfall der 3 Staffeltitel in `titles-core.json` | −12,4 KB roh, **−1,9 KB gzip** (von 218,7 KB) |
| Wegfall der 3 Mitglieder in `franchises.json` | −675 B roh, −272 B gzip |
| Events der Staffeltitel | 116 Events behalten ihre Zahl; nur `titleId` zeigt auf 158871 statt 7000002 (Bytes ≈ gleich) |
| `folgen/7000001–3.json` | entfallen (lazy, zählen nicht zum Start); 158871 bekommt eine Datei mit allen Staffeln |

Netto: **Startlast sinkt** (−1,9 KB gz titles-core nachgeladen, +0,24 KB für `st` in meta). Das Startbudget von 190 KB bleibt unberührt, solange `st` in `meta.json` (2,5 KB gz) liegt und nicht in `woche-kacheln`. (`tools/start-budget.mjs` lief nicht: `dist/` fehlt in der Cloud; Zahlen sind Dateimessung, nicht Wächterlauf.)

## 3. Kleinster lieferbarer erster Schnitt

Nur Horizonte, nur Rückbau, **kein neues Feature zugleich** (Umbau ≠ Verhaltensänderung):

1. `pipeline/bau/staffel-titel.ts` + `pipeline/lib/staffel-titel.ts`: Aufspaltung abschalten; stattdessen schreibt der Bau für 158871 `s` aus `horizonte-staffeln.yaml` (derselbe Weg wie `pipeline/lib/pokemon-staffeln.ts`). `horizonte-staffeln.yaml` behält Namen/Grenzen, verliert `kennung`.
2. Events: `titleId` der Horizonte-Termine = 158871, `episode` durchlaufend (heute Staffelfolge, z. B. 33 → 78). Vorher/Nachher-Vergleich der `ev.id`-Menge (`tools/bau-vergleich.mjs`) — muss identisch sein.
3. `shared/`: `staffelVonFolge()` + Kartenleser; Kachel-Marke in `web/src/lib/db-staffel-marke.ts` (existiert) liest die Karte.
4. Alte Links: `7000001–3` → 158871 mit `?staffel=N` (Umleitung in `web/src/lib/ak-umleitung.ts`, existiert); Slug `pokemon-horizonte-staffel-1-7000001` ebenso.
5. Wächter: `check-staffel-titel.ts` und `check-horizonte-staffeln.ts` auf Ein-Titel-Form umstellen (Muster: `check-pokemon-staffeln.ts`).

Zweiter Schnitt (eigener PR): Kachel-Text „Horizonte · Staffel 3 · Folge 38"; dritter: weitere Serien mit belegten Grenzen.

## 4. Größte Risiken

1. **`episode` ändert Bedeutung** (Staffel- → Serienfolge): alles, was `episode` gegen `dubRanges`, Zähler (`folgen/zaehlung.json`: 7000001 = `[45,45]`), Newsletter-Meldungen oder `schedule.firstEpisodeNumber` hält, muss im selben Schnitt umziehen. Bestandsmeldungen in der D1 zählen nach `aktivTag` bereits mit Serien-Nummern — dort genau prüfen.
2. **Doppelzählung/Verschwinden in Meldungen**: Meldungen sind „Aussage zu ihrem Tag, nie umschreiben" — alte Meldungen mit 7000002 dürfen nicht umgeschrieben werden; Anzeige muss die alte Kennung auflösen können.
3. **Favoriten im Browser** (localStorage) mit 7000001–3 : brauchen Abbildung auf 158871, sonst verschwinden sie still (`favoriten-abgleich.ts`).
4. **Suche/Filter nach Staffelzahl**, Cover, Genres je Staffel: Staffeltitel tragen heute eigene Felder (`episodes`, `jpStart`); die Serie hat eine Spanne.
5. **Offene Staffel 4**: Ende unbelegt → Status „läuft" nur aus Termin/`de`, nie aus erfundenem `bis`.

## 5. Was am naheliegenden Ansatz falsch ist

- **„Kalender-IDs bleiben stabil" heißt nicht „Titel-IDs bleiben stabil".** Der naheliegende Ansatz hält 7000001–3 als versteckte Titel am Leben (Alias-Schicht), „damit nichts bricht". Die UIDs hängen aber schon an der Basis-ID; die Sondertitel sind überflüssig. Eine Alias-Schicht kostet dauerhaft Code und Prüfer, der Rückbau einmalig.
- **Staffel in jedes Event/jeden Titel schreiben** (`season`-Feld) wäre die zweite Wahrheit neben `s`; sie läuft auseinander, sobald eine Staffelgrenze korrigiert wird. Abgeleitet, nicht gespeichert.
- **Die Staffelliste in `titles.json`/`titles-core.json` je Titel zu führen** (alle Serien) verteilt 2 Zeilen an 726 Titel, von denen 12 sie brauchen — das widerspricht ARCHITEKTUR.md „neues Feld nur, wenn die Mehrheit es braucht". Eine Karte nur für die Betroffenen ist kleiner und löscht sich selbst, wenn keine mehr bleibt.
- **Neue Datenbank/Endpunkt für Staffeln**: unnötig; die Daten sind 0,5 KB.
