Regeln: stdin in Leseschleifen, Workflows ↔ LAUF_ARTEN früh prüfen, fernsehserien.de nur als Hinweis

Drei Lehren vom 25.11.2026 (PR 5021) verankert. Keine Datenänderung, kein Eingriff in `tools/quellen-pruefen.sh`.

- `.claude/agents/bauer.md`: Abschnitt „Shell, Git, Dateien (K8)“ bekommt die Regel, dass ein Fremdbefehl in einer `while read`-Schleife `</dev/null` trägt, samt Testfall „stdin-Leser vor einer weiteren Zeile“.
- `tools/check-workflows.mjs`: neue Prüfung, dass jeder Workflow-`name:` in `LAUF_ARTEN` (`worker/src/lauf-sql.ts`) steht und umgekehrt — dieselbe Regel wie in `pipeline/check-logic.ts` (keine Ausnahmen), nur früh; die alte bleibt.
- `tools/check-workflows.test.mjs`: Kopie von `worker/src/lauf-sql.ts` im Wegwerf-Ordner, zwei rote Fälle (Workflow fehlt in der Liste / Liste nennt Workflow ohne Datei); Mutationsprobe: Prüfung abgeschaltet → Test rot.
- `.claude/skills/synchro-belegen/SKILL.md`: fernsehserien.de und wunschliste.de nur als Hinweis, bis eine schriftliche Genehmigung vorliegt (Verweis auf `docs/wissen/quellen.md`); Eichfall angeglichen.
- `docs/wissen/pokemon-staffeln.md`: Arbeitsschritt 1 und Bauweg nennen fernsehserien.de nur noch mit Genehmigung.
- `docs/wissen/synchro-recherche-2026-10-06.md`: Hinweis am Anfang, dass die Angaben von dort Hinweise sind.
- `prtext/regel-pr-2511-abend/pr.md`, `prtext/regel-pr-2511-abend/bericht.md`: dieser Text und der Bericht.

Geprüft: `node tools/check-workflows.test.mjs` grün (37 Fälle), `npx tsc --noEmit` grün, `anleitungs-pfade-test` grün.

Patch Notes: keine (Betrieb)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
