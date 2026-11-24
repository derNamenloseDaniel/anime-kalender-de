feat(panel): Staffel-Reiter der Reihe am Antwortkasten wie im freigegebenen Mockup (F157)

## Anlass

Daniel, 24.11.2026 20:18: Freigegeben war das Bild des Mockups `staffel-abschnitt` am Commit 47f7bda363, mit Staffel-Reitern der **Reihe** über dem Antwortkasten. PR 4896 (c958d3c264) hat die Reiter stattdessen im Folgenbereich gebaut und dabei das Mockup auf den Bau umgeschrieben. Die Folgen-Reiter bleiben, die Reiter am Kasten kommen dazu.

Mockup-Änderung freigegeben: „die Folgen-Reiter sind eine nützliche Erweiterung und BLEIBEN; zusätzlich kommen die Reiter am Antwortkasten genau wie im Mockup“ (Daniel, 24.11.2026 20:18, über den Dirigenten)

## Was sich ändert

- `web/src/components/detail/reihen-reiter.tsx` (neu): `ReihenReiterAmKasten`, `ReihenReiterZeile`, `ReihenReiterKontext`, `kastenFarbe`. Karteikarten-Reiter über dem Kasten. Der gewählte Reiter hat Rand und Fläche der Kastenhülle (`kastenKlassen`) und einen Akzentstrich, Punkt = läuft, Ring = kommt. Pfeile erscheinen nur, wenn in ihrer Richtung weitere Reiter liegen, ein Tipp rollt höchstens eine Leistenbreite, es gibt keinen Scrollbalken, die Tippfläche ist ≥ 44 px. ARIA „Tabs“: `role=tablist/tab/tabpanel`, `aria-selected`, Roving-tabIndex. Pfeiltasten, Pos1 und Ende setzen nur den Fokus, Eingabe öffnet (manuelle Aktivierung, weil jede Wahl einen anderen Titel lädt).
- `web/src/components/detail/reihen-reiter-liste.ts` (neu): `reihenReiterVon` und `reihenLageVon`, 1:1 aus dem Mockup (`staffel-reiter-liste.ts`, `staffel-lage.ts` am Stand 47f7bda363).
- `web/src/components/DetailPanel.tsx`: Anbieter `ReihenReiterKontext` mit `wechsleZu` aus `useReihenWechsel`, also derselbe Weg wie die Reihenliste.
- `web/src/components/detail/kasten-folgen.tsx`: Der Kasten steht in `ReihenReiterAmKasten`.
- `web/src/components/detail/staffel-reiter.tsx` (eigener Umbau-Commit 88c87884): exportiert `LEISTE_HUELLE`, `LEISTE`, `reiterKlassen(gewaehlt, farbe = ABSCHNITT_FARBE)`, `Akzentstrich`, `LageMarke`, `zeigeGewaehlten`, `LAGE_WORT`. Beleg „Ausgabe gleich“: `ReiterZeile` für alle 5 Wahlen alt gegen neu gerendert, 5 von 5 gleich. Die Pfeile (`staffel-pfeile.tsx`) waren schon geteilt.
- `web/buehne/mockups/staffel-abschnitt.tsx`: Titel „Staffel-Reiter an der roten Box und im Folgenbereich (F157)“. Die notiz beschreibt beide Reiter, `ersatz: {}`, Fälle und Stichtag 24.11. 10:00 sind unverändert.
- Was entfällt: nichts. Am Kasten gab es bisher keine Staffelwahl der Reihe. `staffel-knoepfe.tsx` sind TOGGO-Absprünge je Anbieter-Staffelseite, `reihen-karte.tsx` nennt den Stand samt Filmen, Specials und eigenen Serien. Beides sind andere Angaben, nichts steht doppelt.
- Wächter `tools/mockup-freigabe-pflicht.mjs` (+ Test, `tools/check-logic-liste.txt`): Ändert ein PR `web/src/` und zugleich `titel`, `ersatz` oder `notiz` eines bestehenden Mockups (oder löscht es), wird er ohne Zeile „Mockup-Änderung freigegeben: <Zitat>“ in Beschreibung oder Kommentar rot. Nur `ersatz` auf `{}` zu leeren bleibt erlaubt (vorgesehener Bauschritt, Skill mockups). Es gab keinen ähnlichen Wächter, Vorbild ist `check-patchnotes-pflicht.mjs`.
- Lehre: `.claude/agents/bauer.md` (Oberfläche), `.claude/agents/pruefer.md` K9v, `.claude/skills/mockups/SKILL.md`, Doku `docs/wissen/datensatz.md` „Reihen-Reiter am Antwortkasten“.
- Prüfungen nachgezogen: `pipeline/check-disc-bereich.ts` (der Kasten steht jetzt in der Reiter-Hülle), `pipeline/check-panel-cover.ts` (ResizeObserver-Attrappe, das Panel rendert jetzt Reiter).
- Fund im Bühnenlauf, im eigenen Commit 9baaa9585 behoben: Das Listenstück aus dem Mockup stürzte ab, wenn die Hauptstaffeln Beschriftungen, aber keinen Staffelstand haben. Das ist eine einzige Staffel in Teilen, und so sieht auch der erste Render aus, bevor `franchises.json` geladen ist. Betroffen waren Sakamoto Days und 86, in der Bühne blieb `disc-bereich-2` leer und `buehne-panel-pruefen` öffnete kein Panel. Ohne Staffelstand ordnet jetzt die Kennung. Wächter: `check-reihen-reiter` rechnet jeden Titel jedes Bühnenfalls mit und ohne geladene Reihe, so wie das Panel es tut (510 Paare). Gegen die alte Zeile ist er rot an 86/11361 und sakamoto-days/15940.
- Patch Note `data/patchnotes/f157-reihen-reiter.yaml`.

## Bildvergleich (links 47f7bda363 freigegeben, rechts dieser Zweig; Nachher A; Handy 375 / Desktop 512 × hell / dunkel)

![f157-reihen-reiter-pokemon-sammeltitel.png](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/bilder/f157-reihen-reiter/f157-reihen-reiter-pokemon-sammeltitel.png)
![f157-reihen-reiter-pokemon-reisen.png](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/bilder/f157-reihen-reiter/f157-reihen-reiter-pokemon-reisen.png)
![f157-reihen-reiter-pokemon-horizonte.png](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/bilder/f157-reihen-reiter/f157-reihen-reiter-pokemon-horizonte.png)

Die Reiterleiste (Ort, Beschriftungen 1–5 … 25 bzw. 1–4, Farbe, Akzentstrich, Punkt/Ring, Pfeil) ist in allen 12 Zellen gleich. Abweichungen kommen nicht von diesem PR: Im Fall Hauptserie und Reisen steht im Kasten die TOGGO-Fläche „Kostenlos · TOGGO · Staffel 1–5“ mit Zahlenknöpfen (PR 4889, nach 47f7bda363 gemergt), deshalb rutschen die Pillen darunter tiefer. Horizonte ist bildgleich. Die Folgen-Reiter stehen weiter unten im Folgenbereich, außerhalb des Bildausschnitts.

## Klasse (Bau-PRs seit 01.11.2026, die ein Mockup umschreiben)

Der Wächter lief auf allen 19 main-Commits seit 01.11.2026, die `web/buehne/mockups/` berühren. 3 wären rot gewesen:
- c958d3c264 (#4896) `staffel-abschnitt.tsx`: titel, A.notiz
- bdcd2e0fe6 (#4889) TOGGO-Staffelknöpfe `toggo-pillen.tsx`: titel, A.notiz, B.ersatz, B.notiz
- 286d31cc9e (#3852) Merken-Gold `merken-gold.tsx` gelöscht (?)

## Prüfungen (lokal)

- `npx tsc --noEmit -p .` Exit 0; eslint der berührten Dateien grün.
- Neu: `npx tsx pipeline/check-reihen-reiter.ts` ok, `node tools/mockup-freigabe-pflicht.test.mjs` ok, `node tools/mockup-freigabe-pflicht.mjs` 15 Gegenproben.
- Basis rot: Beide neuen Prüfungen importieren Dateien, die es an der Basis nicht gibt (rot). Der Wächter auf dem echten Anlass c958d3c264: `ROT … staffel-abschnitt.tsx (titel, A.notiz)`.
- Importeure der berührten Panel-Dateien (`grep -l` in `pipeline/check-*.ts`, `tools/*.test.*`), alle Exit 0: check-disc-bereich, check-dub-anbieter-pille, check-folgen-staffeln, check-folgenflaggen, check-hinweis-anzeige, check-kopfzeile-premiere, check-leerer-kasten, check-nachlade-vorwaermen, check-panel-cover, check-panel-eigenes-werk, check-panel-reihenfolge, check-serienbeleg-folgenbereich, check-staffel-anzeige-panel, check-termin-offen-karte, check-titelwechsel, buehne-staffel-reiter.test.
- design-klassen, design-immer-dunkel, stumme-pfade, uhr-in-tests, umfang-pruefen, check-leerzeichen-gleich, mutationsanker-alle, mutationsanker-ohne-tests, kopierlisten-importgraph/workflows-beleg, pr-nachrechnen-bot-pfade, check-workflows, werkzeug-ohne-test-wache, skript-aufrufer-wache, check-beleg-href: alle grün.
- Mutation (Hand-Listen, `node tools/mutationslaeufer.mjs`): `tools/mutationen/reihen-reiter.json` 29 rot, 0 überlebt; `tools/mutationen/mockup-freigabe-pflicht.json` 15 rot, 0 überlebt. Gestrichen wurde der Mutant „neues Mockup zählt“: Er ist gleichwertig, weil eine neue Datei an der Basis keinen Text hat und `geaenderteFelder(null, …)` dann `[]` liefert.
- Bühne: `buehne:bauen` grün, `buehne-bilder --mockup staffel-abschnitt` grün (24 Bilder je Stand). Voller Lauf `buehne:messen` (alle 6 Werkzeuge) Exit 0, 473 Einheiten ok wie an der Basis 5b9e1eb6; `buehne-panel-pruefen` 8 Fälle ok. Browser lokal über `PLAYWRIGHT_BROWSERS_PATH` (Version 1243 statt 1234 erwartet).
- Startbudget (`npx vite build`, `node tools/start-budget.mjs`): Basis 5b9e1eb6 170.1 KB gzip, PR 170.1 KB gzip (von 190.0).

Parallel läuft der Zweig `feat/f157-staffelnamen` (sn-Namen in den Folgen-Reitern). Konflikt zu erwarten: in `web/buehne/mockups/staffel-abschnitt.tsx` (notiz). `staffel-reiter.tsx` berührt dieser PR nur mit Exporten, die aria-label-Zeile des anderen Zweigs nicht.

Patch Notes: `data/patchnotes/f157-reihen-reiter.yaml`
Schätzung vs. Ist: 90 min vs. ~85 min.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
