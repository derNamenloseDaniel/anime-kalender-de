## Was ändert sich

Prime-Erweiterung, Ablauf „Suchauftrag" (Daniel, 26.11., v4.32.207, Black Butler):

1. **Kandidatenliste nur mit Namenstreffern.** `genauZeigen` und der „ähnlich"-Zweig reichten `gefunden.treffer` (jede Kachel der Seite, auch „Ähnlich wie", „Zuschauer sahen auch") an `auswahlGruppe`. Jetzt `befund.namensgleich` (neu, = `gleichNamig` aus `beurteileTreffer`, `amazon.js`) bzw. `befund.treffer`: Black Butler, II, Book of Circus ja; Black Butterfly und Empfehlungen nein. Andere Staffeln bleiben (Staffel-/Typfilter gilt nur für `genau`, nicht für die Auswahl).
2. **Auftrag an die Seite gebunden.** `zeigeAuftragshinweis` (`amazon.js`) vergleicht den Namen jetzt auch ohne `zielAsin` (vorher nur bei `andereSeite`). Der Merker `ak-prime-suchauftrag` lebt zehn Minuten im `sessionStorage` und hing sonst an jeder Titelseite.
3. **Kasten der Vorseite bleibt nicht stehen.** Bei SPA-Wechsel (Adresse anders) baute der Takt neu; lieferte der Bauer `false`, blieb der alte Kasten samt Kandidatenliste im DOM. Neu `akPrimeKastenNeu` (`prime-durchgang-suche.js`): baut keiner, wird die leere Hülle gesetzt (derselbe Weg wie im Zeichenpfad, kein zweites `.remove()`).

## Fünf Stufen

- **(a) Ursache:** s. o., je Fehler Funktion in `amazon.js` (`genauZeigen`/`auswahlGruppe`, `zeigeAuftragshinweis`, Takt bei `alterHinweis`).
- **(b) Klasse:** Zustand über Seitenwechsel: `ak-prime-suchauftrag` (zehn Minuten), `akWeggelegt`, `ak-prime-gti-sprung` (nur mit `ref_=atv_dl_rdr`, 2 min, bereits gebunden), `primeAuswahlKopf` (an Suchadresse gebunden, kein Fehler). Listen über die ganze Seite: nur `auswahlGruppe`; `fassungenAuswahl` liest den Hydration-Block der Titelseite (Adresse geprüft). `suchTreffer().treffer` bleibt „alle Karten" (Doku: Entscheidung über den Namen) und wird nur in `beurteileTreffer` und der Auswahl benutzt.
- **(c) Schließen:** Auswahl aus Namenstreffern, Namensvergleich ohne Zielmarke, Hülle statt Vorseiten-Inhalt. Selektor nicht neu: Karten wie bisher `article[data-testid="card"]`; keine Amazon-Seite abgerufen (Fixture-Daten im Test aus Daniels Meldung).
- **(d) Wächter:** `extension/amazon-auswahl-nur-treffer.test.cjs` (Karten wie in der Meldung, Black Butterfly/Empfehlungen raus, Helfer-Verhalten, Namensvergleich Kaiju/Dragon Maid fremd). Mutationsprobe: `gefunden` statt `namensgleich` → rot; `|| !auftrag.zielAsin` entfernt → rot. Kein „heute" im Test.
- **(e) Warum durchgelassen:** `amazon-genau-kasten.test.cjs` baute `befund.treffer` als 1 Karte und prüfte „alle zehn Karten stehen zur Auswahl" – die Zehn waren alle Namenstreffer, eine Seite mit Empfehlungsreihen kam nie vor; die Titelseiten-Tests setzten stets `zielAsin`, der Weg ohne Zielmarke (alter Merker) war ungeprüft, und kein Test fuhr den SPA-Wechsel mit „Bauer baut nichts". Prüfer-Vorgabe wird geschärft: bei Listen aus Seitenkarten Fixture mit Fremdkarten (Empfehlungen) verlangen, bei Merkern mit Lebensdauer den Test „Seitenwechsel auf fremden Titel".

## Prüfung

`node tools/extension-tests.mjs` grün, `npx tsc --noEmit -p .` grün, `check:umfang` grün (amazon.js nicht gewachsen), eslint Erweiterung grün, `mutationsanker --diff` 0 tot. Version nicht angehoben (`extension-version.yml` zählt).
