## Nachtrag (Kette grün, Kopf 10e8aa7feed2)

1. **Patch-Note `fool-night-alle-folgen-am-start`** — Ursache: Text endete mit „26.11.“; `pruefePatchnotes` (shared/patchnotes.ts:59) verbietet `.`/`!` am Textende. Änderung: Schlusspunkt entfernt. Beleg: Prüffunktion vorher `text endet mit Satzzeichen`, nachher `[]`; `check-patchnotes.ts` Exit 0.
2. **Kette – Logik 1 (`baueMeta`, Handstudio Titel 10–12)** — Ursache: Stand vor dem main-Merge; nach `git merge origin/main` ohne weitere Änderung grün. Beleg: `check-studio-von-hand.ts` zeigt alle drei ✓, Exit 0.
3. **Bau/Installation, Logik 2, PR-Datenbau** — lokal ohne data/cache nicht reproduzierbar; Vollauf `check:logic` hier per Hook gesperrt. Geprüft: `tsc --noEmit -p .` Exit 0, `check-katalog-release.ts` Exit 0. Ob die Patch-Note-Regel (1) auch dort die Ursache war (läuft im Bau über `patchnotes-ausliefern`), zeigt erst die Kette; Datenbau-Reste nur dort sichtbar.
