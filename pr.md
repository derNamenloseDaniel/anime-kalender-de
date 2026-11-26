<!-- titel: fix(worker): Cron-CPU unter dem Limit — kleine Bau-Datei statt 1,7 MB parsen, Monitor liest nur den Seitenanfang -->
Auftrag: worker-cron-cpu

## Was

Die Wache „Datenbankverbrauch“ (`d1-verbrauch.yml`) ist rot: Cron-CPU p99 72,8 ms am 25.11.2026 (Schwelle 8 ms, Free-Limit 10 ms; `tools/kapazitaet-messen.mjs`, `tools/kapazitaet-bewertung.mjs`). Free-Plan bleibt (Projektentscheidung).

- **Ursache** (lokal gemessen, Tabelle unten): Jeder Fünf-Minuten-Takt parste `events.json` (1,3 MB), der Stundenlauf zusätzlich `news.json` (366 KB), und der Monitor las `events.json` über die Live-Seite noch einmal ganz.
- **Vorberechnung im Bau:** `public/data/worker-termine.json` (96 KB statt 1,7 MB, Bau-Schritt `pipeline/bau/13-9-worker-termine.ts`, angehängt in `pipeline/bau/13-schreiben.ts`): Termine von Bautag −3 bis +8 und die „Jetzt auch bei“-Zeilen. Form, Schnitt und Deckung in `shared/worker-termine.ts`; `weitereAusNews` ist dafür nach `shared/news-weitere.ts` gezogen (eigener Umbau-Commit, Ausgabe gleich; `worker/src/news-quelle.ts` verliert sie).
- **Worker:** `worker/src/termine-quelle.ts` lädt die Datei einmal je Aufruf; fehlt sie, ist sie veraltet (deckt jetzt ± 2 Berliner Tage nicht) oder hat eine andere Form, gelten wie früher die vollen Dateien. Verdrahtet in `worker/src/index.ts` (Zeilenzahl 798, unter 800) und `worker/src/push-takt.ts` (`pushStuendlich` nimmt `ladeWeitere` statt `ladeNews`).
- **Kennungen:** `pipeline/lib/ausgabe-kennung.ts` übersetzt die neue Datei (`titleId`, `id`) wie `events.json` und `news.json`; ohne das fände der Push keine Favoriten.
- **Monitor:** `worker/src/monitor.ts` liest je Seite nur die ersten 64 KB (`leseAnfang`); `minBytes` ist höchstens 2.000, `expect` steht vorn.
- Kein Deploy, kein D1-Zugriff der Website; Abo-Pfade unverändert.

## Beleg

**Messung vorher/nachher** (Node 22, `process.cpuUsage`, Median aus 8–15 Läufen nach 3 Aufwärmläufen; echte `events.json`/`news.json`, Antworten in 16-KB-Stücken, D1 als node:sqlite-Attrappe `tools/worker-unteraufrufe-attrappe.ts`, Messskript im Scratchpad, vorher gegen `origin/main`):

| Schritt (ms) | vorher | nachher |
|---|---|---|
| `events.json` laden + parsen (je Takt, früher) | 6,7 | entfällt |
| `news.json` laden + parsen (stündlich, früher) | 1,6 | entfällt |
| `worker-termine.json` laden + parsen (96 KB) | – | 1,2 |
| `pushSchnell` (Fünf-Minuten-Takt) | 6,1 | 1,4 |
| `pushStuendlich` | 9,8 | 1,5 |
| Monitor: Abruf der 20 Seiten (`checkAllSites`) | 4,1 | 2,1 |
| `loescheAbgelaufenes`, Wecker | je ≤ 0,1 | je ≤ 0,2 |
| **Stundenlauf gesamt** (`scheduled` `0 * * * *`) | 15,7 | 5,6 |
| **Fünf-Minuten-Takt gesamt** (`*/5 * * * *`) | 7,7 | 1,5 |
| Digest (`0 5,6 * * *`, nur der Lauf um 07:00 Berlin lädt die Dateien) | 11,5 | 12,7 (unverändert, Rauschen) |

Stand der Dateien bei der Messung: `events.json` 1,39 MB, `news.json` 356 KB, `worker-termine.json` 96 KB (285 Termine, Bautag 26.11.2026). Die Messmaschine schwankt (Maxima bis 20 ms); Mediane zählen. p99 über rund 314 Aufrufe am Tag ist der vierte Platz von oben; der eine Digest-Lauf bestimmt ihn nicht allein.

Teuerste Schritte vorher: Parsen der beiden Dateien (zusammen rund 10 ms des Stundenlaufs), danach der Monitor.

**Untergrenze und zwei Ansätze:** Untergrenze = nur rechnen, wenn sich etwas geändert hat; das scheitert, weil Cloudflare-Isolates zwischen den Takten nicht verlässlich leben (ein Speicher im Isolate fängt gerade die kalten Starts nicht, die p99 bestimmen). Ansatz A (gebaut): Vorberechnung im Bau, Abruf 35 KB statt 1,7 MB. Ansatz B (nicht gebaut): Monitor auf eigenen Trigger `30 * * * *`; senkt den Stundenlauf von 5,6 auf etwa 3 ms und den Monitor-Aufruf auf etwa 2,6 ms lokal, spart aber nichts am Fünf-Minuten-Takt und belegt einen weiteren der fünf Trigger. A senkt alle drei Läufe, B bleibt der nächste Hebel (Plan in `docs/wissen/betrieb.md`, Absatz „Cron-CPU unter 8 ms“).

**Grenze der Messung:** Node ist nicht der Worker; am 25.11. lag der Betrieb beim 4- bis 5-fachen der lokalen Zahl des alten Stundenlaufs. Ob p99 unter 8 ms fällt, zeigt erst die Wache nach dem Deploy (Deploy ausdrücklich nicht in diesem PR). Offen darüber hinaus: `ausbleibenMessen` kostet bei eingeschaltetem Schalter zusätzlich (R2-Stand lesen), hier nicht gemessen (Schalter aus).

**Tests:** `tools/worker-termine.test.ts` (neu, in `check:worker`): Ausschnitt gleich den vollen Dateien, roh und nach der Übersetzung in eigene Kennungen; Rückfälle bei 404, Nicht-JSON, falscher Form, veraltet, Netzfehler; `leseAnfang` bricht nach 64 KB ab. Zwei Mutanten von Hand (Deckung ohne `von`, Übersetzung der `weitere` entfernt): rot. **Rot an der Basis:** gegen die main-Fassung von `worker/src/monitor.ts` liest der Monitor die 1,3-MB-`events.json` ganz (`events.json gelesen 1300000 Byte, abgebrochen: false`), mit dem PR 81.920 Byte (`abgebrochen: true`); `leseAnfang` und `termine-quelle.ts` gibt es an der Basis nicht, `tools/worker-termine.test.ts` bricht dort schon am Import ab. `package.json` trägt den neuen Test in `check:worker`. Angepasst: `tools/worker-push-takt.test.ts` (die Attrappe liefert die kleine Datei; ein Abruf je Takt), Anker in `tools/mutationen/push-takt.json`. Grün: `worker-push-takt`, `worker-push-versand`, `worker-digest-versand`, `worker-ausbleiben-messer`, `worker-wecker`, `worker-loeschlauf-scheduled`, `npx tsc --noEmit -p .`, `-p worker/tsconfig.json`, `-p tools/tsconfig.worker.json`, `npm run check:umfang`, `node tools/mutationsanker-alle.test.mjs`. Die erzeugte Datei kommt aus dem Bau-Schritt allein (aus den committeten Kerndateien, Bautag 26.11.2026); der nächste Bestandsbau schreibt sie neu. Dokumentation: `docs/wissen/betrieb.md`.

## Live-Beleg

Entfällt (kein Live-Datenfeld). Nach dem Deploy: `d1-verbrauch.yml` abwarten, Zeile „Cron-CPU“ des Tages gegen 8 ms halten; zuvor muss ein Bestandsbau `worker-termine.json` live gestellt haben (`https://anime-kalender.de/data/worker-termine.json`, JSON mit `termine` und `weitere`).

## Patch Notes

Patch Notes: keine – intern: Betrieb des Workers, kein Nutzen für Besucher.
