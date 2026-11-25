# Delta-Wache: nachträgliches zuAk erklärt „Titel weniger“

Die Wache „Delta und Briefkasten“ wurde am 24. und 25.11. rot (Pokémon Horizonte 7000001–7000003), weil `zuAk` in `data/kennungen.json` erst im Folge-PR nach dem Bestandsbau gesetzt werden darf (datensatz.md). Der Bau kannte die Umleitung nicht, die Historie-Zeile blieb unerklärt. Dasselbe drohte mit PR 5030/5035.

`tools/delta-pruefen.mjs` gleicht jetzt die in der Zeile gespeicherten `titelWeg` gegen das aktuelle `zuAk` ab (`mitNachtraeglichemZuAk` in `pipeline/lib/bestand-pendel.ts`, `jetztUmgeleitet` in `bestand-verschoben.ts`). Jetzt umgeleitete Kennungen zählen als „zusammengelegt (zuAk nachträglich eingetragen)“, nie mehr als die Zeile als „Titel weniger“ meldet. Ohne `zuAk` bleibt es rot.

Geprüft: `node tools/delta-pruefen.mjs --tage 2` zeigt die Zeile vom 24.11. 18:30 erklärt (vorher ⚠ 3 Titel weniger). Neuer Test `tools/delta-wache-zuak-nachtraeglich.test.mjs` (Mutationsprobe: Abgleich abgeschaltet → rot; Kontrolle ohne `zuAk` rot), alle `delta-wache-*`-Tests grün, `tsc --noEmit` grün. Die Zeile vom 25.11. 18:07 (aniSearch-Titel PR 5030) wird mit PR 5035 erklärt.

Patch Notes: keine (Betrieb)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
