## Nachtrag (Kette grün, Kopf a639e5940a4f)

**Ursache:** `pipeline/check-trailer-label.ts` liest `public/data/titles.json` (Zeilen 27 und 88), stand aber in `tools/check-logic-liste.txt`. `tools/bestand-sperre.cjs` verbietet `check:logic` den Lesezugriff auf den gebauten Bestand, daher „Kette – Logik 1“ rot.

**Änderung:** Eintrag aus `tools/check-logic-liste.txt` nach `tools/check-bestand-liste.txt` verschoben (hinter `check-toggo-seiten-bestand.ts`); Prüfung selbst unverändert, nichts abgeschwächt.

**Beleg:** Vorher mit `NODE_OPTIONS=--require tools/bestand-sperre.cjs`: `Error: readFileSync(public/data/titles.json): check:logic darf den gebauten Bestand nicht lesen.` Nachher läuft die Prüfung unter `check:bestand` (ohne Sperre) „Alles grün.“; `npx tsc --noEmit -p .` Exit 0. Vollläufe der Kette lokal gesperrt (F40), die PR-Kette bestätigt.
