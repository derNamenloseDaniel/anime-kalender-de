<!-- titel: fix(kette): Patch-Notes-Kommentar wirkt wieder in der PR-Kette -->
## Ursache

`tools/check-logic-alle.mjs` startet jede Prüfung mit `ohneCiToken` bzw. `sperreUmgebung` (PR 4470/5012); `CI_TOKEN_VARIABLEN` enthält `GH_TOKEN` und `GITHUB_REPOSITORY`. `check-patchnotes-pflicht.mjs` braucht beide, um den PR-Kommentar „Patch Notes: …“ zu lesen (`beschreibungMitKommentaren`). In der Kette war `repo` leer, die Funktion gab still die Beschreibung zurück, der Ausweg wirkte nie. Beleg: PR 5078, Lauf 45835797014 Attempt 3 rot trotz OWNER-Kommentar „Patch Notes: vertagt – …“.

## Ansatzvergleich

- **Untergrenze:** `ohneCiToken` für `check:logic` entfernen. Verworfen: hebt den Schutz für alle ~870 Prüfungen auf (Nachlauf 21.11.2026).
- **Alternative:** Pflichtprüfung als eigener Schritt in `pr-pruefung.yml` außerhalb von `check:logic`. Verworfen: Workflow-Änderung samt Kopierlisten-/Zugangswächtern, die Prüfung verlässt die Liste, Teiljob-Verteilung ändert sich.
- **Gewählt:** Tabelle `CI_ANMELDUNG_DURCHREICHUNG` in `tools/bau-umgebung.mjs` plus `mitCiAnmeldung()`; `check:logic` reicht nur diesen Dateien nur diese zwei Variablen aus der Umgebung des Schritts durch (`GH_TOKEN` setzt `pr-pruefung.yml` schon). Eine Tabelle, drei Zeilen Verdrahtung, Schutz für alle übrigen Prüfungen unverändert.

## Stiller Rückfall

`zugangsWarnung()` (`tools/patchnotes-kommentar.mjs`): im PR-Ereignis ohne `GITHUB_REPOSITORY` oder Token druckt `beschreibungMitKommentaren` eine ⚠-Zeile (Warnung, nicht rot: Tests, die die Prüfung im PR-Ereignis ohne Zugang aufrufen, bleiben grün; die Zeile steht direkt über der Fehlermeldung).

## Klasse

Geprüft: alle Dateien aus `check-logic-liste.txt` auf `GH_TOKEN`/`GITHUB_TOKEN`/`GITHUB_REPOSITORY`/`GITHUB_ACTIONS`/`GITHUB_RUN_ID`.
- `tools/mockup-freigabe-pflicht.mjs`: gleiche Ursache (`beschreibungMitKommentaren(pr, process.env.GITHUB_REPOSITORY)`), Kommentar-Ausweg ebenfalls wirkungslos → in diesem PR mit in die Tabelle.
- `pipeline/lib/sichtungsfenster.ts` (`fristStrengIn` liest `GITHUB_ACTIONS`): `pipeline/check-sichtungsfenster.ts` übergibt die Umgebung selbst, ändert sich nicht still; kein Befund.
- `pipeline/check-lauf-fortschritt.ts`, `check-geheimnis-testlauf.ts`: setzen/entfernen die Variablen selbst, kein Befund.
- `pipeline/fetch-anisearch-cover.ts`/`-robots.ts` lesen `GITHUB_ACTIONS`, stehen nicht in den Prüflisten.

## Tests

`tools/ci-anmeldung-durchreichung.test.mjs` (neu): Durchreichung nur der zwei Variablen, nur für die Tabelle; Klassenwächter (jede Prüfung der Liste mit `beschreibungMitKommentaren` steht in der Tabelle); Verdrahtung in `check-logic-alle.mjs`; `zugangsWarnung`.
Mutationsprobe: Eintrag `check-patchnotes-pflicht.mjs` aus der Tabelle gelöscht → rot (Exit 1); `mitCiAnmeldung` in `check-logic-alle.mjs` entfernt → rot (Exit 1); beides zurück → grün.
Zusätzlich grün: `patchnotes-kommentar.test`, `pr-basis.test`, `pr-kette-pruefen.test`, `bau-umgebung.test`, `tests-liste.test`, `check-workflows`, `kopierlisten-importgraph`, `mutationsanker-alle`, `uhr-in-tests`, `stumme-pfade`, `npx tsc --noEmit -p .`, `npm run check:umfang`, eslint der berührten Dateien.

Patch Notes: keine - Pruefwerkzeug

🤖 Generated with [Claude Code](https://claude.com/claude-code)
