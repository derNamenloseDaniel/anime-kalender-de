# Bericht Regel-PR 25.11.2026 abend

- Zweig `regeln/lehren-2511-abend`, PR-Text in `pr.md` (kein `gh pr` möglich).
- Lehre 1: Regel in `bauer.md` (K8). Grep `done <<<|done <` unter `tools/`, `.github/`: nur `tools/quellen-aufsetzen.sh` (Schleife über `find "$rettung/files"`, Zeilen ~61 und ~71) ruft `node tools/dub-belege-vereinen.mjs` und `node tools/health-vereinen.mjs` ohne `</dev/null` auf — nicht repariert. Übrige Schleifen rufen nur `git checkout/rm/cat-file`, `cp`, `mkdir` oder nichts Fremdes. `fund-nachliefern.yml:58` nur `rm`. `quellen-pruefen.sh:68` trägt `</dev/null` bereits.
- Lehre 2: `check-workflows.mjs` prüft Workflow-`name:` ↔ `LAUF_ARTEN`, wie `check-logic.ts` (keine Ausnahmen); Test 37 Fälle grün, Mutationsprobe rot wie erwartet.
- Lehre 3: `synchro-belegen/SKILL.md` (Zeile 11 und Eichfall), `pokemon-staffeln.md`, Hinweis in `synchro-recherche-2026-10-06.md`; wunschliste.de in `quellen.md` gleich eingeschränkt, gleich behandelt. Übrige Treffer (`sitzung-…`, `datensatz.md` u. a.) sind Chronik oder nennen die Seite schon als verworfen.
- Der Testfall „stdin-Leser vor einer weiteren Zeile“ steht nur als Regelsatz; ein Test existiert nicht (`quellen-pruefen.sh` und sein Test waren nicht anzufassen).

Rückblick
- gut: Regel in check-logic war genau definiert (keine Ausnahmen), 1:1 übernommen.
- schlecht: Heredoc-Patch mit Backslash vom Hook gesperrt, Umweg über Edit.
- unerwartet: Der Test hängt die Probe „Probe“ nur bei vorhandener Probe-Datei in die Arten-Liste; sonst wäre jeder Fall rot gewesen.
- Vorschlag: `quellen-aufsetzen.sh` mit `</dev/null` an den zwei `node`-Aufrufen (eigener PR).
- veraltet: nichts gefunden.
