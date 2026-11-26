# Bericht: fix/patchnotes-kommentar-ci

- Ursache bestätigt: `ohneCiToken` in `check:logic` entzog der Pflichtprüfung `GH_TOKEN` und `GITHUB_REPOSITORY`; `beschreibungMitKommentaren` fiel still auf die Beschreibung zurück.
- Fix: `mitCiAnmeldung` + Tabelle `CI_ANMELDUNG_DURCHREICHUNG` (`tools/bau-umgebung.mjs`, `.d.mts` nachgeführt), verdrahtet in `check-logic-alle.mjs`; nur zwei Prüfungen bekommen zwei Variablen.
- Stiller Rückfall: `zugangsWarnung` druckt im PR-Ereignis ohne Zugang eine ⚠-Zeile (Warnung, nicht rot).
- Klasse: `mockup-freigabe-pflicht.mjs` hatte dieselbe Ursache, mit repariert; übrige Treffer ohne Befund (Details pr.md).
- Wächter: `tools/ci-anmeldung-durchreichung.test.mjs`; beide Mutationen rot, danach grün. tsc, umfang, eslint, Nachbartests grün.
- Zweig `fix/patchnotes-kommentar-ci` gepusht (Commit 9f7781fe9); kein PR (gh in der Cloud gesperrt). Doku: betrieb.md, Abschnitt 26.11.2026.

## Rückblick
- gut: Tabelle statt Workflow-Umbau, kein Eingriff in den Schutz der übrigen Prüfungen.
- schlecht: Die Kette lief nicht lokal, die echte Wirkung (Kommentar gelesen) ist erst am nächsten PR-Lauf messbar; Rerun an PR 5078 zeigt es.
- unerwartet: `mockup-freigabe-pflicht` war mitbetroffen; `.d.mts` zu `bau-umgebung` musste mit.
- Vorschlag: nach Merge PR 5078 neu anstoßen; Warnzeile in der Kette beobachten (soll nie erscheinen).
- veraltet: nichts gefunden.
