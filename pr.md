<!-- titel: Rozen Maiden: Träumend mit deutschem Titel (Mängel titel-de) -->
Auftrag: maengel-synchro-urteil

## Was ändert sich
`data/titel-de.yaml`: Eintrag für 65 „Rozen Maiden: Träumend“ mit zwei Quellen (de.wikipedia „Rozen Maiden“, Abschnitt Synchronisation: TV+Synchron Berlin; Prime Video DE, Abruf der Suchtreffer-Adresse 26.11.2026). Der Name ist selbst deutsch („Träumend“), der TMDB-/aniSearch-Filter „gleich dem Original“ hatte ihn verworfen. Dazu `data/patchnotes/rozen-maiden-traeumend-deutscher-titel.yaml`.

## Zählung (Art titel-de, offen)
Vorher: 7 (`node tools/maengel.mjs`, main 26.11.2026). Nachher: 6 erwartet nach dem Bestandsbau (ohne `data/cache/` lokal nicht gemessen). sprachurteil-offen 51 → 51, synchro-schwach 56 → 56 (unverändert, siehe bericht.md).

## Annahmen
- Basis-Beleg (Test rot gegen main) und Mutationstabelle entfallen: reine Datenzeile, kein neuer Code; die Prüfung der Datei läuft in `check:logic` (Pflicht „zwei Quellen“).
- Kein Beleg für eine veröffentlichte deutsche Fassung (de.wikipedia: Veröffentlichung ausgesetzt); der Titel wird nur als Name geführt, die Synchro-Einstufung bleibt unverändert.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zrQU9XcAbXZN8joujG
