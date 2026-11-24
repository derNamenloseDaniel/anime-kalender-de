# Bericht tbt-grenzen-2411 (Bauer, 24.11.2026)

- Kopf: 8e5a0431a3e9d9daa1a72bda91f44d736da0e5a1, Zweig `fix/tbt-grenzen-2411` (von origin/main 25c4ba85), PR-Text auf `prtext/tbt-grenzen-2411` (`pr.md`).
- PR-Titel: fix(lighthouse): TBT-Bänder neu (p99 × 1,15 aus 557 Läufen), Ausnahmeweg der Ratsche
- Tests: `lighthouse-urteil.test.mjs` ✓, `lighthouse-messen.test.mjs` 25 Zusicherungen ✓, `mutationsanker-alle`/`-ohne-tests` ✓; Mutationsprobe 15/15 rot, Kontrolle grün.
- Rot an der Basis: beide neuen Tests gegen main-Fassung von urteil/messen Exit 1 (`genau dieser Schritt eingetragen: erlaubt`, `eingetragene Lockerung im PR: grün`).
- Vorprüfung grün (ein Hinweis: Text nennt `tools/mutationslaeufer.mjs`, nicht im Diff, gelb).
- `tsc --noEmit` nicht nötig (nur .mjs); `lighthouse-messen.mjs` hat keinen Trockenweg ohne Browser, der Gesamtlauf-Test mit npx-Attrappe deckt es.
- Kein PR angelegt (Cloud, GraphQL 403); der Dirigent eröffnet ihn mit `pr.md`.

## Rückblick

- **Gut:** Der vorhandene Gesamtlauf-Test (Wegwerf-Repos mit PR-Ereignis) ließ den Ausnahmeweg ohne neuen Aufbau end-to-end prüfen.
- **Schlecht:** Erster Gesamtlauf-Fall rot, weil `pr` und `live` dieselben Grenzen teilen (eine Lockerung = zwei Einträge); steht jetzt in betrieb.md.
- **Unerwartet:** Der Hook sperrt `python -` per Heredoc auch für reine Textersetzung; Edit-Werkzeug ist der kürzere Weg.
- **Vorschlag:** Kante 2750 → 2870 erst nach zweitem Wochensatz (Bericht Vorschlag 2); Drift-Wächter über Wochenmedian (separater Auftrag).
- **Veraltet:** betrieb.md „TBT auf den Runner normiert“ (n = 15/24/29, 4,3 σ, Gruppe 2650–3050) — in diesem PR ersetzt.
