# Testläufe: Kinder bekommen keine Schlüssel der Datenläufe, fetchJson maskiert api_key

`pipeline/check-anilist-mangel-lauf.ts` startete `fetch.ts` mit `...process.env`. Mit gesetztem `TMDB_API_KEY` stand die TMDB-Adresse samt `api_key` in der Fehlerausgabe (Z. 72, letzte 600 Zeichen von stderr) — im öffentlichen CI-Log lesbar. Der Test war mit Schlüssel außerdem rot (TMDB-Zweig läuft nur mit Schlüssel).

**Beleg (Attrappe `ATTRAPPE-TMDB_API_KEY`):** Austritt `pipeline/lib/tmdb.ts:88` (`warn` mit der `fetchJson`-Meldung `404 : https://…?api_key=ATTRAPPE…`) → stderr des Kindes → Test Z. 72. Echte Dienste erreicht der Test nicht (`fetch` ist durch die Attrappe ersetzt, TMDB-Adressen liefern 404).

**Commit 1 (Testumgebung):** `ohneGeheimnisse()` in `tools/bau-umgebung.mjs` (Secrets der Workflows); angewandt in `sperreUmgebung` (check:logic, tests-alle), im check:bestand-liste-Zweig von `check-logic-alle.mjs` und direkt im Testlauf. Damit sehen alle ~270 Prüfungen mit `...process.env`-Kindern keine Schlüssel; Prüfungen, die einen brauchen, setzen ihn selbst. Wächter `pipeline/check-geheimnis-testlauf.ts` (vorher rot, nachher grün).

**Commit 2 (Verhaltensänderung):** `maskiereSchluessel()` in `pipeline/lib/util.ts`, genutzt in allen drei Meldungen von `fetchJson`. Wächter `pipeline/check-schluessel-maskiert.ts`.

Lokal: berührte Tests (bau-umgebung, tests-alle-ci-token, check-logic-liste/-vollstaendig, pruefung-ort, check-tmdb-genre) und `tsc --noEmit` grün; `check:vor-commit` nicht gefahren.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
