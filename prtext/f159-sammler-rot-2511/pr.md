fix(sammler): Basisvergleich fährt nur rote Prüfdateien, Marke „Prüfung rot“ fällt von selbst
Sammler-PRs bleiben nicht mehr „[Prüfung rot]“ liegen, nur weil main beim Einreichen selbst rot war (PR 4979 neun Stunden, PR 5013 bis zum Konflikt mit main).

**Ursache (belegt):** `quellen_pruefen_main` fuhr den ganzen `check:logic` mit `QUELLEN_BASISFRIST_STANDARD=240` s; der braucht rund 8 min (Lauf 45619157790, Job sendezeiten: PR-Prüfung 13:01→13:09, Basis 13:09→13:13 = Frist). Die Basis lieferte nur die Fristzeile, keine `  - `-Liste, und jeder Fehler galt als neu.

**Teil 1 – Basisvergleich:** Auf main laufen nur die roten Prüfdateien des Funds, je Datei `npx --no-install tsx <datei>` (der Weg, den `tools/check-logic-alle.mjs` je Prüfung nimmt). Eine Datei, die es auf main nicht gibt, ist dort nicht rot. Ist die Basis nicht prüfbar (Frist, Start, `node_modules`, Arbeitsbaum), bleibt alles rot wie heute, und der Grund steht als erste Zeile im PR-Text („Vergleich mit main nicht möglich …“).

**Teil 2 – Marke fällt von selbst:** Neuer Workflow `sammler-rot-erneut.yml`, ausgelöst nach jedem grünen Bestandsbau (`workflow_run`) und von Hand. Job `suche` findet markierte PRs der App (nur `gh pr list`), nur dann `pruefen`: PR-Stand lokal mit aktuellem main zusammengeführt, dieselbe Prüfung wie beim Einreichen (`quellen_pruefen` plus `quellen_neue_fehler`). Keine neuen Fehler → Titelmarke und Label weg, Hinweis am PR, dann stößt `merge-anstossen` `claude-daten-merge.yml` an. Weiter rot oder Konflikt mit main → nichts ändert sich außer dem Hinweis (ein Kommentar je PR, wird aktualisiert).
Eigener Workflow statt Schritt im Bestandsbau: der Bau liegt auf dem kritischen Pfad zum Deploy; im Normalfall kostet der Workflow nur den Suchjob. Nur `GITHUB_TOKEN`, kein neuer Secret-Name, nie das App-Token.

**Geänderte Dateien:**
- `tools/quellen-pruefen.sh` – `quellen_pruefen_dateien` neu, `quellen_pruefen_main` und `quellen_neue_fehler` nehmen die Fund-Liste, Grund bei nicht prüfbarer Basis
- `tools/quellen-pruefen-main.test.mjs` – 7 neue Fälle (Basis gleich → nicht neu, Basis grün → neu, Datei fehlt auf main, gemischt, Frist, Start, Module fehlen)
- `tools/rote-sammler-erneut.sh` – neu, Ablauf je markiertem PR
- `tools/rote-sammler-erneut.mjs` – neu, Entscheidung und Kommentarwortlaut
- `tools/rote-sammler-erneut.test.mjs` – neu, 17 Fälle (grün → Marke weg, rot neu → bleibt, Basis gleich → Marke weg, Konflikt, Hinweis ersetzt, ohne Marke übersprungen, Token unsichtbar)
- `.github/workflows/sammler-rot-erneut.yml` – neu
- `data/zugangs-register.json` – Workflow beim `GITHUB_TOKEN` eingetragen
- `tools/test-kind-frist-stand.json` – Stand gesenkt (Zeitgrenzen an den Test-Kindprozessen)
- `docs/wissen/betrieb.md` – Abschnitt „Sammler prüfen ihren Fund“ nachgeführt (25.11.2026)
- `prtext/f159-sammler-rot-2511/pr.md`, `prtext/f159-sammler-rot-2511/bericht.md` – PR-Text und Bericht

**Geprüft:** `quellen-pruefen-main.test.mjs`, `rote-sammler-erneut.test.mjs`, `quellen-pr-pruefung.test.mjs`, `sammler-pruefschritt-waechter.test.mjs`, `zugangs-waechter` (mit `--register-pruefen`), `check-workflows`, `workflow-ohne-pakete`, `mutationsanker-alle`, `test-kind-frist`, `npx tsc --noEmit -p .` – grün. Mutationsprobe: 7 Mutanten in Teil 1, 14 in Teil 2, alle gefangen. Der Test von Teil 2 fing beim Bau einen echten Fehler (zweites `git fetch` überschrieb `FETCH_HEAD`, geprüft wurde main statt PR-Stand).
Nach dem Merge: `gh workflow run sammler-rot-erneut.yml` einmal von Hand (Beleg am echten markierten PR), dann nach ~5 Fällen, einem Tag, einer Woche beobachten.

Patch Notes: keine (Betrieb)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
