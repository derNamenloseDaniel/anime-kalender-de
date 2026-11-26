# Bericht worker-cron-cpu

- Zweig `fix/worker-cron-cpu` (nicht deployt, kein PR angelegt); PR-Text in `pr.md` auf `prtext/worker-cron-cpu`, Vorprüfung grün.
- Ursache: Jeder Fünf-Minuten-Takt parste `events.json` (1,4 MB), der Stundenlauf zusätzlich `news.json`, der Monitor las die `events.json` über die Live-Seite ganz.
- Gebaut: Bau-Datei `worker-termine.json` (96 KB, Bau-Schritt 13-9, Kennungs-Übersetzung), Worker liest sie mit Rückfall auf die vollen Dateien; Monitor liest je Seite nur 64 KB.
- Lokal (Node, Mediane): Stundenlauf 15,7 → 5,6 ms, Fünf-Minuten-Takt 7,7 → 1,5 ms, `pushStuendlich` 9,8 → 1,5 ms, Monitor-Abruf 4,1 → 2,1 ms; Digest unverändert 8–13 ms (ein Lauf am Tag).
- Offen: Ob p99 im Betrieb unter 8 ms fällt, zeigt erst die Wache nach dem Deploy (Betrieb lag bei dem 4- bis 5-fachen der lokalen Zahl); nächster Hebel Monitor auf eigenem Trigger `30 * * * *`.
- Deploy-Reihenfolge: erst ein Bestandsbau stellt `worker-termine.json` live, dann Worker deployen (ohne Datei greift der Rückfall, es gibt keinen Ausfall).

## Rückblick

- gut: Die Attrappe `tools/worker-unteraufrufe-attrappe.ts` erlaubt echte `scheduled`-Läufe mit D1-Attrappe; Schnitt-Datei ist durch Test gegen die vollen Dateien (roh und übersetzt) gesichert.
- schlecht: Node-Messung sagt nicht, ob 8 ms im Worker erreicht sind; die Messmaschine schwankt stark (Maxima bis 20 ms).
- unerwartet: Der Bestandsbau auf main änderte `events.json` während der Arbeit (Fenster 94 → 285 Termine, Datei 35 → 96 KB); neue Dateien in `public/data/` brauchen einen Eintrag in `uebersetzeDatei`, sonst stimmen die Kennungen im Worker nicht (der Wächter prüft es jetzt).
- Vorschlag: Nach dem Deploy die Cron-CPU 24 h beobachten; reicht es nicht, Monitor auf eigenen Trigger legen (Plan in `docs/wissen/betrieb.md`).
- veraltet: `docs/wissen/betrieb.md` Absatz „Pünktlicher Push“ nennt `JSON.parse` 5,7 ms je Takt für die volle Datei; gilt nur noch im Rückfall.
