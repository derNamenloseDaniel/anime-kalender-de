# Nachtrag CI-Fix

Kopf nach Fix: 922d1e9bd (vorher f7015d3955), main eingemergt.

## Roter Job 1: Kette – Logik 1/2 und Workflows (`tools/pr-vorpruefung.test.mjs`, „Liste: echte Listen im Repo sind in Ordnung“)

- **Ursache:** `pipeline/check-tooltip-bedienung.ts` stand am Ende von `tools/check-logic-liste.txt` (nach den `tools/`-Zeilen); die Liste muss nach LC_ALL=C sortiert sein. Erste Korrektur an `titelwechsel` wäre falsch gewesen: „tm…“ < „to…“, also gehört der Eintrag hinter den `check-tmdb-…`-Block.
- **Änderung:** Eintrag zwischen `pipeline/check-toggo-seiten.ts` und `pipeline/check-tote-adresse-runden.ts` (`tog` < `too` < `tot`).
- **Beleg:** `listenRot()` auf den echten Dateien gibt `[]`; `node tools/pr-vorpruefung.test.mjs` Exit 0 („grün“); `npx tsc --noEmit -p .` Exit 0.

## Roter Job 2: PR-Aussehen – Panel (`npm run check:panel`, „Ausblenden“ hat title)

- **Ursache:** `tools/panel-zurueck.mjs` erwartete `title="Ausblenden"` am Knopf; der Knopf steckt jetzt in `Tooltip` (`web/src/components/detail/aktionen.tsx:70`) und trägt kein `title` mehr. Die Blase (`role="tooltip"`) entsteht erst beim Zeigen, der Knopf bekommt dann `aria-describedby=<Blasen-ID>` (`ui.tsx`, `Tooltip`).
- **Änderung:** Fall prüft `title === null`, fährt per `hover()` über den Knopf, erwartet eine sichtbare Blase mit Text „Ausblenden“ und dass deren `id` dem `aria-describedby` des Knopfs entspricht. Kopfkommentar der Datei angepasst.
- **Beleg:** `vite build` in der Sandbox, dann `node tools/panel-zurueck.mjs` (Playwright mit Verweis auf das vorhandene Chromium 1243): Exit 0, alle Fälle `ok`, darunter die zwei neuen. Die übrigen Teile von `check:panel-teile` lokal nicht gefahren; dafür gilt nur die Kette.

## Fundstellen anderer Tests mit title-Erwartung

Gesucht in `tests/`, `pipeline/check-*`, `tools/*.test.*`, `tools/*.mjs`, `web/src` nach `hat title`, `getAttribute('title')`, `[title…`, `toHaveAttribute('title'`, `.title ===`:

- `tools/panel-zurueck.mjs:122` – umgestellt (siehe oben).
- `tools/buehne-messung.mjs:16` – nutzt `title` nur als letzten Namens-Rückfall hinter `aria-label`/Text; keine Erwartung, unverändert.
- Übrige Treffer betreffen Datenfelder (`title.id`, `.title` an Titelobjekten, Routen-`title`), nicht das DOM-Attribut.

## Rückblick

- Gut: Die Fehlermeldung des Wächters nannte schon die Regel; die Zielstelle nur nach echter Sortierung bestimmen, nicht nach Namensnähe.
- Unerwartet: Der erste Sortierversuch (nach `titelwechsel`) war falsch, erst `listenRot()` direkt aufgerufen hat die nächste Verletzung gezeigt (Schnellweg statt Kettenlauf).
- Sandbox: Playwright erwartet `chromium_headless_shell-1234`, vorhanden ist 1243; `PLAYWRIGHT_BROWSERS_PATH` mit Symlinks auf das vorhandene Verzeichnis löst es.
- Offen: nichts.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
