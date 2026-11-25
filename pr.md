# Bestandsprüfungen drucken die Schlusszeile „VERSTÖSSE: <n>“

`tools/pr-bestand-zaehlen.mjs` liest je Bestandsprüfung genau eine Zeile `VERSTÖSSE: <n>`. Fehlt sie, ist die Zahl NaN: die Prüfung gilt nie als geerbt, der PR wird rot, obwohl main denselben Stand hat, und NaN verdeckt den eigentlichen Hinweis (z. B. „Eintrag streichen“ einer Ratsche).

**Vorher:** Alle 124 Prüfungen des Vergleichs (15 Einzelskripte aus `check:bestand`, 109 aus `tools/check-bestand-liste.txt`) lokal auf `public/data` gefahren: 108 druckten genau eine Zeile, 16 keine (im grünen Weg; mehrfach: keine). 15 davon behoben, `pipeline/check-staffel-ohne-seite-bestand.ts` ausgenommen (andere Sitzung).

**Nachher:** Die 15 drucken genau eine Zeile, auf jedem Ausgang (auch frühe `process.exit(1)` und der rote Weg); Exit-Codes unverändert (vorher/nachher je Prüfung gleich). Geändert nur `console.log('VERSTÖSSE: …')` vor dem Ausgang, dazu eine Testerwartung in `check-cr-neu-wache.ts` (stdout bei kaputter Eingabe ist jetzt `VERSTÖSSE: 1`).

**Wächter:** `tools/bestand-verstoss-zeile.mjs` (`druecktVerstoessZeile`, Syntaxbaum) und `.test.mjs` prüfen für jede Prüfung der Liste, dass der Quelltext die Zeile ausgibt; Ratsche `BEKANNT` (nur sinken, enthält `check-staffel-ohne-seite-bestand.ts`). Mutationsprobe: Zeile in `check-toggo-seiten-bestand.ts` entfernt → Wächter rot, zurück → grün.

Patch Notes: keine – Werkzeug

🤖 Generated with [Claude Code](https://claude.com/claude-code)
