## Nachtrag Runde 1 (Kopf b01fe80c7)

- **A1** `check-schluessel-maskiert.ts`: die zwei `.catch(() => void …)` durch `fehlerVon()` (try/catch, der Fehlertext wird zurückgegeben) ersetzt; `stumme-pfade` grün. Mutante: alte `.catch`-Form zurück → `stumme-pfade` Exit 1 (2 statt höchstens 0).
- **A2** `tools/bau-umgebung.d.mts`: Eintrag in `tools/werkzeug-ohne-test-freigabe.txt` (reine Typdeklaration, wie `anime2you-staffel.d.mts`; Passung prüft `tsc` über `check-geheimnis-testlauf.ts`); `werkzeug-ohne-test-wache` grün mit der erwarteten Neu-Freigabe-Warnung. Mutante: Eintrag gestrichen → Wache Exit 1.
- **A4** `CR_ZUGANG` in `GEHEIMNIS_VARIABLEN`, `MERGER_TOKEN_DA` raus; `check-logic-alle.mjs` und `sperre-umgebung.mjs` nehmen zusätzlich `ohneCiToken` (wie `tests-alle`); der Test setzt auch `GH_TOKEN`/`GITHUB_TOKEN` als Attrappen und prüft Prüfung und Kind. Mutanten: `CR_ZUGANG` aus Modulliste → rot (Liste und Kind), `ohneCiToken` aus `check-logic-alle.mjs` → `check:bestand-liste` rot, aus `sperre-umgebung.mjs` → `check:logic` rot.
- **A5** `check-geheimnis-testlauf.ts`: neuer Wächter über alle `NAME: …secrets.X…`-Zeilen in `.github/workflows` (auch `||`) gegen Schlüsselliste, Bau- und CI-Variablen und die begründete Ausnahmeliste `KEIN_SCHLUESSEL` (`MERGER_TOKEN_DA`, `TROCKEN` als Schalter); dazu eine Probe mit künstlichem `||`-Fall und ein Blindheitsriegel (mehr als 10 Workflows). Mutante: `CR_ZUGANG` aus Modulliste und `ERWARTET` → rot („ungeregelt: CR_ZUGANG“).
- **A6** `maskiereSchluessel` fängt jetzt auch `apikey`/`apiKey`/`API_KEY`, `access_token` und `client_secret` (ohne Groß-/Kleinschreibung), Gegenprobe: `monkey`, `keyword`, `tokens` bleiben. Mutante: alte Regex → `apikey`, `apiKey`, … rot.

Stand: `check-reihen-reiter` nach Merge von origin/main grün; berührte Tests, `tsc --noEmit`, `eslint`, `mutationsanker-alle` und die drei Nachbartests (`tests-alle-ci-token`, `pruefung-ort`, `pr-basis-vorab`) grün.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
