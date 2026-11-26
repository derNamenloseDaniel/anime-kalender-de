# Bericht: Disc-Bereich sichtbar (Zweig `feat/disc-bereich-sichtbar`, Kopf `63df57d8`)

1. **Ergebnis:** Jede Disc-Ausgabe ist eine Pille wie bei „Stream“, die ganze Pille führt zum Händler (ohne Händler zum aniSearch-Artikel). Eine Gruppe mit einem Eintrag klappt nie zu; `disc-matrix.tsx` ist weg.
2. **Anlassfall 156040:** vorher 2 Einträge, 0 Links, 2–3 Klicks; nachher 1 Pille „Gesamtausgabe · Complete Box“, 1 Link „Bei Amazon ↗“ (EAN), 1 Klick. Kasten am Handy 296 → 187 px.
3. **Dublette belegt und zusammengeführt:** Termin (anime2you) und aniSearch-Artikel 209535, beide Blu-ray, 03.09.2026. Regel `amSelbenTag` (gleicher Tag, gemeinsames Format, 1:1, kein widersprechender Band); Bestand: lose Termine 183 → 60.
4. **Varianten:** A Pillen (gebaut), B offene Matrix, C Karten als Mockup `disc-bereich-3`; Vergleichsbilder und Begründung in `pr.md`. B und C brechen am Handy (Spalten laufen ineinander, Karten schneiden ab).
5. **Beleg:** `check-disc-bereich.ts` 72 Zusicherungen grün, an main rot; Mutationsprobe 191 Mutanten, 189 rot, 2 gleichwertig; 52 Importeur-Prüfungen, `check-logic.ts`, `tsc --noEmit` grün; Pillen ≥ 52 px, Knöpfe 44 px, Schrift ≥ 11 px; Startbudget 171,0 → 170,9 KB (nach main-Merge 171,1).
6. **Bilder:** 40 Vorher/Nachher (echte Seite, 390 und 1600 px, hell und dunkel, 4 Titel) und 12 Mockup-Bilder unter `bilder/`. `pr-vorpruefung.mjs` meldet nur diese 48 Bildpfade als „nicht im Repo“; sonst kein Befund. Bitte beim Einreichen über `tools/pr-bilder.mjs` hochladen.
7. **Offen:** Händlerlink gibt es nur für 233 Termine (188 Titel); alle anderen Ausgaben führen zu aniSearch. Echte Händlerlinks dort bräuchten die EAN aus `data/anisearch-artikel.json` im Panel (eigener Auftrag). Bild und Preis je Ausgabe kennt der Datensatz nicht, nicht gebaut.
8. **Nicht getan:** kein PR, kein Navigator-Upload (kein `ticket-board` in der Cloud), `stand.md` unberührt; `check:panel`/`check:ansichten` nur in der Kette.
9. Schätzung vs. Ist: keine Schätzung beim Start notiert; Ist 20:33–21:20 Uhr. Prozesse: keine übrig.

## Rückblick

- **Gut:** Die Bühne zeigte in einer Aufnahme, dass B und C am Handy brechen; der Variantenentscheid brauchte kein Abwägen.
- **Schlecht:** Die erste Fassung der Dubletten-Regel hätte „Vol. 2“ mit einer Gesamtausgabe desselben Tages verschmolzen; aufgefallen erst am vorhandenen Dan-Da-Dan-Test, nicht an meiner Messung (40 Stichproben waren alle richtig).
- **Unerwartet:** `pipeline/check-logic.ts` prüft den Klassen-String der Pille wörtlich; meine erste Umformung von `pille.tsx` machte ihn rot, obwohl sich an Stream-Pillen nichts änderte. In der Cloud zeigt Playwright auf eine Browser-Revision, die es nicht gibt (Verweis `chromium_headless_shell-1234` → `-1243` nötig, wie in `bauer.md` beschrieben).
- **Vorschlag:** `tools/diff-mutanten.mjs` bekommt einen Pfadfilter (`--nur web/src`); ohne ihn bricht der Lauf an Mockup-Dateien ab, ich habe die Liste von Hand gefiltert. Und: Bühnengerät 390 px ergänzen, damit Mockup-Bilder das Regelmaß aus `design-regeln.md` treffen.
- **Veraltet:** `docs/wissen/betrieb.md` beschrieb beim Mockup `disc-bereich-2` die Matrix als Stand der Seite; der neue Eintrag darunter nennt die Ablösung. `web/buehne/mockups/disc-bereich*.tsx` (Runden 1 und 2) sind Nachbauten einer Komponente, die es nicht mehr gibt, und könnten gelöscht werden.
