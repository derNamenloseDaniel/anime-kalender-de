# Bericht test-vorschlaege-sammel

- Zweig `fix/test-vorschlaege-sammel`, ein Commit, nur Test: `tools/worker-amazon-zahl-gleich.test.ts` prüft jetzt den Prime-Knopf mit offenen gewählten Treffern (Titelzahl = Worker, Karten und Suchen getrennt, nur Karten offen ≠ „alles geprüft“).
- Beleg: drei Mutanten (`tools/mutationen/amazon-knopf-karten.json`) rot, Kontrolle grün, 0 überlebt; Test und `tsc --noEmit -p tools/tsconfig.worker.json` Exit 0.
- 2498, 2510, 4393, 4436, 4454: nach Lektüre gestrichen, weil auf `main` schon mit Test und Mutanten gedeckt (Tabelle im PR-Text).
- 4454 „Mod-Uhr setzbar“: Uhr in `register.tsx` setzen wäre Umbau, Reihenfolge ist über `sortiereRegeln(…, jetzt)` mit festen Zeiten getestet.
- Cloud-Grenzen: kein Browser, daher keine neue Pixelmessung; nicht nötig.

Rückblick
- Gut: Die älteren Lücken waren schon geschlossen; der Abgleich gegen `main` verhinderte doppelte Tests.
- Schlecht: Die Sammelzeile war veraltet; sie nannte keine Stände.
- Unerwartet: Die Arbeit früherer Läufe (inkl. `tools/mutationen/test-vorschlaege-sammel.json`) lag in einem Datencommit („Bestand neu gebaut“) auf main.
- Vorschlag: Sammelzeile „Test-Vorschläge“ leeren; `tools/mutationen/test-vorschlaege-sammel.json` ist ohne Aufrufer.
- Veraltet: Eintrag in der Sammelzeile zu 2498, 2510, 4393, 4436, 4454.
