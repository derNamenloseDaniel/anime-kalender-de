# Sammler: GitHub-5xx beim Merge geduldig abwarten

Am 25.11.2026 endeten die Sammler-Läufe 45650281762 und 45650286140 rot: Beim `gh pr merge` antwortete GitHub von 16:07:08 bis mindestens 16:09:00 UTC mit 502 und „Something went wrong while executing your query“; die sechs Kurzversuche (3–10 s) waren in knapp zwei Minuten verbraucht.

- `tools/quellen-pr.sh`: neue Funktion `pr_mergen` (Merge-Schleife ausgelagert). Bei 5xx (`serverfehler()`: HTTP 50x, Bad Gateway, Service Unavailable, Gateway Timeout, Server Error, „Something went wrong while executing“) Pausen 15/30/60/120 s (~4 min), danach rot. Vor jedem neuen Versuch wird der PR-Zustand gelesen: ist er `MERGED`, endet der Lauf mit `gemerged=true`. „Base branch was modified“ bleibt bei sechs Versuchen und 3–10 s Pause. `QUELLEN_PAUSE_FAKTOR` (Prozent) stellt die 5xx-Pausen im Test herunter.
- `tools/sammler-pruefschritt-waechter.mjs` und Test: Anker auf `gh pr merge "$ZWEIG"` in `pr_mergen` umgestellt (Reihenfolge-Prüfung unverändert).
- `tools/quellen-pr.test.mjs`: zweimal 502 dann Erfolg, 502 bei schon gemergtem PR (ein Versuch), dauerhaft 5xx (fünf Versuche, Pausen 15/30/60/120), „Something went wrong“, Pausenfaktor 0, „Base branch was modified“ bleibt kurz; dazu der Text-Zweig der Aktion `einreichen` (Nachricht über env, kein `${{` im Skripttext, Anführungszeichen und Shell-Zeichen landen unverändert im PR-Titel, kein Code-Einschleusen).
- `docs/wissen/betrieb.md`: Abschnitt dazu.

Geprüft: `quellen-pr.test.mjs` und Wächter-Test grün, `tsc --noEmit`, eslint, Mutationsanker. Mutationsprobe einzeln: 5xx-Erkennung abgeschaltet → 5 Zusicherungen rot; Zustandsabfrage vor dem Versuch entfernt → „schon gemergt“ rot.

Patch Notes: keine (Betrieb)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
