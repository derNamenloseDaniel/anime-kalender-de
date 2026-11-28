<!-- titel: Staffel-Reiter schaltet sofort um, Platzhalter beim Laden -->
<!-- zweig: fix/reiter-sofort-wechseln -->

## Was ändert sich

Reiterklick (`reihen-reiter.tsx`) und Reihen-Karte (`reihen-inhalt.tsx`) laufen beide über `wechsleZu`. Das öffnet den Teil jetzt im selben Zug. Fehlt der Titel noch im Bestand, steht im Panel ein Platzhalter (Reiter mit markiertem aktivem Reiter, Cover und Name aus `franchises.json` bzw. der Reiterliste, Blöcke in Endgröße mit Ladeanimation, `motion-reduce:animate-none`) statt Stillstand und nie „keine Metadaten“, solange geladen wird.

Patch Notes: `data/patchnotes/staffel-reiter-schaltet-sofort-um.yaml`

## Geänderte Dateien

- `web/src/components/detail/panel-laden.ts`: `useReihenWechsel(titleId, onOpenTitle)` ruft `onOpenTitle` synchron, kein `ladeTitelBestand`/`wechselt` mehr. `useTitelNachladen` rechnet `holt` abgeleitet (`!titleById.has(id) && fertigId !== id`), also schon im ersten Zeichnen; eine späte Antwort eines früheren Wechsels setzt nur ihre eigene `fertigId`. Neu `useReihenmitglied` (Cover/Name aus `franchises.json`).
- `web/src/components/detail/panel-platzhalter.tsx` (neu): Platzhalter-Panel.
- `web/src/components/detail/panel-huellen.tsx`: `PanelLeer` nimmt `platzhalter`, solange `holt`.
- `web/src/components/DetailPanel.tsx`: merkt die Reiter des zuletzt gezeigten Titels, zeigt bei fehlendem Titel den Platzhalter.
- `panel-koerper.tsx`, `reihen-inhalt.tsx`, `reihen-liste.tsx`, `reihen-uebersicht.tsx`, `reihen-cover.tsx`: Prop `wechselt`/`gesperrt` entfernt (Reste der Änderung; Karten waren während des Ladens gesperrt).
- `web/src/components/SaisonKarte.tsx`, `SaisonAusblick.tsx`: gleiche Klasse, `await ladeTitelBestand` vor `oeffne` entfernt (eigener Commit).
- `pipeline/check-reihen-spur.ts`, `check-reihen-zeilen.ts`, `check-titelwechsel.ts`, `web/buehne/mockups/reihen-box.tsx`: entfernte Props nachgezogen; Prüfung „gesperrt: Karte aus“ entfällt mit der Sperre.
- `tools/mutationen/reihen-reiter.json`: Anker auf die neue Provider-Zeile.
- `tools/panel-reiter-sofort.test.tsx` (neu): Wächter.
- `data/patchnotes/staffel-reiter-schaltet-sofort-um.yaml`.

Zwei Commits: Reiter/Panel, dann Saison. Kein reiner Umbau dabei.

## Fünf Stufen (Daniels Meldung 28.11. 14:02)

1. **Ursache:** `useReihenWechsel` rief bei einem Teil außerhalb von `data.titleById` erst `ladeTitelBestand` (titles.json, bei Teilen ohne Synchro danach `ohne-synchro.json`) und öffnete erst im `finally`. Bestätigt im Code (`panel-laden.ts` auf origin/main). Die Datei ist Teil des Vorgangs: `titles.json` 4,0 MB roh / 887 KB gzip, `ohne-synchro.json` 7,5 MB roh / 1,75 MB gzip. Bei Fast 4G (rund 9 Mbit/s) sind das für beide gzip-Dateien gerechnet etwa 2,4 s Übertragung plus Latenz und JSON-Parse. **Nicht im Browser gemessen** (diese Umgebung hat keine gedrosselte Messung gegen die Live-Seite); Zahlen sind Dateigrößen aus `public/data` und Rechnung.
2. **Klasse:** Gesucht nach `ladeTitelBestand`/`loadAllTitles`/`loadOhneSynchro` und `.finally`/`await` vor Öffnen in `web/src`. Gleiches Muster (`await ladeTitelBestand`, dann `oeffne`) in `SaisonKarte.tsx` und `SaisonAusblick.tsx` (Ohne-Termin-Chips): behoben. Übrige Treffer laden im Hintergrund (Suche, Empfehlung, Weitere, übernommene Namen) und blockieren keinen Klick. Kein weiterer Klickweg wartet vor dem Öffnen.
3. **Dauerhaft schließen:** `useReihenWechsel` kann nicht mehr warten; das Nachladen liegt allein im offenen Panel (`useTitelNachladen`).
4. **Wächter:** `tools/panel-reiter-sofort.test.tsx`: `wechsleZu` ruft `onOpenTitle` synchron auch für unbekannte Kennung; Fake-Panel mit ladendem Titel zeigt Platzhalter statt „keine Metadaten“, gewählter Reiter `aria-selected`, Name des Teils, `motion-reduce`; geladen und nicht gefunden: erst dann „keine Metadaten“; fremde Reiter ohne Leiste. **Rotlauf gegen origin/main** (alte `panel-laden.ts` mit gleicher Prüfung, Aufruf in der alten Signatur):
   `AssertionError [ERR_ASSERTION]: unbekannte Kennung: sofort geöffnet, nicht erst nach dem Laden  + actual - expected  + []  - [ 999999 ]`
   Grünlauf: `panel-reiter-sofort: ok`. Zusätzlich grün: `check-reihen-spur`, `check-reihen-zeilen`, `check-titelwechsel`, `check-reihen-reiter`, `tsc --noEmit` ohne Fehler.
5. **Warum Prüfer und Kette es durchließen:** Die Prüfungen sahen nur „öffnet nach Wechsel den richtigen Titel“ und nie die Zeit bis zum Öffnen; ein Klick, der erst nach einem Abruf wirkt, fällt in keiner Fake-Bühne auf. Vorschlag: In `bauer.md`/Prüfer-Vorgabe die Frage „Läuft vor dem Öffnen/Umschalten ein `await`/`.then` auf Netzdaten?“ als Pflichtfrage bei Klickwegen aufnehmen (Skill `web-best-practice`, Reaktionszeit unter 100 ms).

## Offen

- Nicht im Browser gemessen: tatsächliche Dauer von `ladeTitelBestand` (gedrosselt Fast 4G) vorher/nachher; nach dem Deploy live mit dem Beispiel `/t/16914/#/woche` messen („fertig = live gemessen“). Vorher: Stillstand bis Download beider Dateien; nachher: Umschalten im selben Frame, Inhalt kommt nach dem Laden.
- Der Bestand ist groß (zusammen 11,5 MB roh): Ein Titel-Einzelabruf (Datei je Teil) würde das Warten kürzen. Nicht mitgebaut, nur genannt.
- Beim Platzhalter trägt die Reiterleiste keine Lagen-Marken (laufend/kommt), bis der Titel geladen ist; Reihenfolge und Beschriftung sind die des vorigen Titels.
- Optik (Platzhalter-Höhen 144/96/160 px) nicht mit Screenshot geprüft; `check:ansichten`/`check:panel` laufen in der Kette.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77znNWUQFxVsfF5omQnk
