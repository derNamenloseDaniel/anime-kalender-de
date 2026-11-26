# Hinweise im eigenen Stil statt Browser-`title`

## Was / Warum
Daniel, 26.11.2026: „alle stellen in der app wo default html tooltips genutzt werden (title) mit unserem eigenen custom richt text tooltip ersetzen“. Hover-Hinweise erscheinen jetzt im Stil der App, ohne Verzögerung, mit Antippen am Handy (Nutzen für Besucher; Patch Note `data/patchnotes/hinweise-erscheinen-sofort-auch-am-handy.yaml`).

- `Tooltip` (`web/src/components/ui.tsx`) bekommt zwei Optionen: `fuellend` (Zeile/abgeschnittener Text füllt die Breite) und `ohneTabHalt` (Text ohne eigenen Fokus, kein zusätzlicher Tab-Halt). `mitHinweis()` ist jetzt exportiert (hüllt nur bei vorhandenem Text).
- **Befund Mobile Performance:** `Tooltip` baut die Blase erst beim Öffnen, kostet je Instanz aber eine Hülle, State, `useId`, zwei Effekte. Für die Patchnotes-Liste (508 Dateien, je Zeile ein Symbol mit Hinweis) wäre das zu viel; dort steht `data-hinweis="…"` an der Zeile, und `useFlaechenHinweis()` (`hinweis-flaeche.tsx`, nutzt `tooltip-blase.tsx` und `tooltip-einzeln.ts`) hält einen Zustand und eine Blase für die ganze Liste. Kalender-Karten und Datenbank-Zeilen sind nicht betroffen (dort stand kein natives `title`).
- Wächter `tools/title-tooltips.mjs` (Syntaxbaum): `title` an nativen Elementen, `x.title =`, `setAttribute('title')`; Props eigener Komponenten zählen nicht; Ausnahme per Kommentar `title-ok: <Grund>`. Grenze `tools/title-tooltips-grenzen.json` = 2 (Nachzug), in `tools/check-logic-liste.txt`, Test `tools/title-tooltips.test.mjs`.
- Doku: `docs/wissen/design-regeln.md`, Abschnitt „Hinweise: eigener Tooltip statt `title`“.

Leerraum: absichtlich – Einrückung ändert sich, weil ein Element in `<Tooltip>` gehüllt wird.

## Inventur (59 Treffer des Auftrags, an main 7704bbee07, 35 Dateien)
| Stelle | Art | Entscheidung |
|---|---|---|
| FilterDetails.tsx:208 „Meine Anbieter“ | `<button title>` | ersetzt (`Tooltip`) |
| FilterDetails.tsx:608, film-serie-gruppe.tsx:16, AdminPanel.tsx:92, InstallPrompt.tsx:133 | Prop an `Chip`/`Button` (laufen schon durch `Tooltip`) | bleibt |
| Header.tsx:104 Themenknopf | `<button title>` + aria-label | ersetzt, aria-label bleibt |
| NewsView.tsx:150 RSS | `<a title>` | ersetzt |
| Suchfeld.tsx:106 Löschen | `<button title>` + aria-label | ersetzt, aria-label bleibt |
| beleg-dialog.tsx:31 Quelle/Beleg | `<button title>` | ersetzt |
| datum-sprung-teile.tsx:16, 22 | `<button title>` ×2 | ersetzt |
| detail/aktionen.tsx:69 Ausblenden | `<button title>` + aria-label | ersetzt, aria-label bleibt |
| detail/antwort-kasten-kopfblock.tsx:60 | `<p title>` (optional) | ersetzt (`mitHinweis`, nur bei Text) |
| detail/buehne.tsx:56 Reihenname | `<h2 title>` | ersetzt (`fuellend`, `ohneTabHalt`) |
| detail/fortschritt.tsx:18 | `<label title>` | ersetzt (`ohneTabHalt`) |
| detail/weitere.tsx:138, 141 | `<dt>/<dd title>` abgeschnittene Namen | ersetzt (`fuellend`, `ohneTabHalt`) |
| empfehlung/Vorschlaege.tsx:43, 47, 51 | `<button title>` ×3 + aria-label | ersetzt, aria-label bleibt |
| empfehlung/ZumKalender.tsx:8 | `<a title>` | ersetzt |
| kalender/ZweitanbieterZeilen.tsx:44 | `<button title>` | ersetzt (`fuellend`) |
| news-abgeloest.tsx:23, 29, 36 | `<a>/<span title>` ×3 | ersetzt |
| patchnotes-teile.tsx:102, 120 | `<span title>` in langer Liste | ersetzt per `data-hinweis` (Flächen-Blase) |
| detail/kino.tsx:232 | `<iframe title>` | bleibt, `title-ok` (Name für Screenreader) |
| detail/titelwechsel.ts:54, 56; lib/router.ts:370 | `document.title` | bleibt, `title-ok` (Tabtitel) |
| detail/reihen-reiter.tsx:63, detail/staffel-reiter.tsx:80 | `<button title>` | **Nachzug nach PR 5073/Staffel-Titel** (laufende PRs, nicht angefasst); zählen in der Grenze 2 |
| DetailPanel, antwort-*, buehne, panel-koerper, abschnitte u. a. (`title={title}`) | Prop `Title`-Datenobjekt | bleibt (kein Attribut) |

## Nachzugsliste
- `reihen-reiter.tsx:63`, `staffel-reiter.tsx:80` auf `Tooltip` umstellen, dann Grenze per `node tools/title-tooltips.mjs --festschreiben` auf 0 senken. `panel-koerper.tsx`, `panel-reihe-zustand.ts`, `reihen-liste.tsx` hatten kein natives `title`.

## Tests
- `npx tsc --noEmit -p .` 0; `node tools/uhr-in-tests.mjs` 58/58; `node tools/design-klassen.mjs` ok; `design-hover`, `design-status`, `design-immer-dunkel`, `buehne-entwurf`; `check-film-serie-filter`, `check-beleg-href`, `check-patchnotes`, `check-patchnotes-render`; `umfang-pruefen`, `mutationsanker --diff` (0 tot); `test-kind-frist` 0 Verstöße; eslint der berührten Dateien.
- Neuer Test nur mit Quelltext-Fixtures in Temp-Git-Ordnern; keine Uhr, kein `public/data`.
- `vite build` + `start-budget`: Basis 171.0 KB gzip, PR 171.1 KB (Budget 190).
- **Nicht gemessen:** Aussehen im Browser (kein Server gestartet); die PR-Aussehen-Kette (`check:ansichten`/`check:panel`) prüft die gehüllten Knöpfe. Risiko Layout: Header-Themenknopf (`hidden md:contents`), Suchfeld-Löschknopf, Beleg-Knopf (`ml-auto` auf der Hülle).

## Mutanten (Wächter)
| Mutant | Erwartung | Ergebnis |
|---|---|---|
| Ausnahme-Kommentar `title-ok:` ignoriert (`if (true) continue`) | Test rot | rot (Assertion) |
| Grenze nie ausgelöst (`> erlaubt + 100`) | Test rot | rot (Assertion) |

## Rückblick
- Gut: `Button`/`Chip` hüllten `title` schon, daher nur 26 echte Stellen statt 59; Syntaxbaum trennt Attribut von Prop.
- Schlecht: Aussehen nur durch Lesen der Layout-Klassen abgesichert, kein Bühnenbild.
- Unerwartet: `Tooltip` öffnet auf Touch bei Knöpfen nicht vor dem Klick (gewollt wegen iOS); dort bleibt `aria-label` der zugängliche Weg.
- Vorschlag: Nachzug der zwei Reiter mit PR 5073 mitnehmen und Grenze auf 0 setzen.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
