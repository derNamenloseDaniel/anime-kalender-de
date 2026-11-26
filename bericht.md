Zweig `feat/aktionen-nur-icon` gepusht (363fd5d3, ein Commit). Merken (beide Zustände) und Teilen sind reine 44-px-Icon-Knöpfe mit `aria-label` und `Tooltip`; Gold bleibt über `.ak-merken-an`.
Nur `web/src/components/detail/aktionen.tsx` (einzige Stelle der Leiste) und eine Patchnote geändert.
tsc, check:umfang, design-klassen grün; keine Tests betroffen.
Screenshots hell/dunkel bei 512 px im Zweig `prtext/aktionen-nur-icon`; kein Vorher, kein Desktop, kein 375 px (Werkzeug nur eine Breite).
Gold-Zustand nicht abgebildet (Beispieltitel nicht gemerkt).
Kein PR (Cloud).

Rückblick
- gut: `panel-bild.mjs` läuft ohne Server; Tooltip-Baustein existierte schon.
- schlecht: Vorher/Nachher, Breiten und Gold-Zustand nicht abgedeckt.
- unerwartet: Playwright erwartet `chromium_headless_shell-1234`, vorhanden ist 1243; Verweis per `PLAYWRIGHT_BROWSERS_PATH` nötig.
- Vorschlag: `panel-bild.mjs` mit `--breite` und `--gemerkt` erweitern.
- veraltet: nichts gefunden.
