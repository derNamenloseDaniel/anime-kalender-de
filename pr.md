<!-- titel: daten(handlung): Ein Satz Handlung, Teil 03 (244 Titel, ids 1889-4087) -->
Auftrag: handlung-satz-teil-03

## Was

Neue Datei `data/curated/ein-satz-handlung/teil-03.yaml`: je Titel mit id 1889 bis 4087 genau ein Satz Handlung (244 Einträge, nach id sortiert), Variante A aus dem Probelauf vom 26.11.2026 (mehrere Quellen, eigener Wortlaut). Je Eintrag `id`, `satz`, `quellen` (Quellenfamilien, keine Texte) und `geprueftAm`.

Sonst ist nichts geändert: keine Pipeline, kein Bau, keine erzeugten Dateien. Die Einbindung baut ein eigener Auftrag.

## Geprüft

- Je Satz: höchstens 160 Zeichen, genau ein Satz, kein gemeinsamer 5-Wort-Abschnitt mit einem Quelltext des Titels (Skript im Scratch-Ordner, Vergleich über `tools/handlung-fakten/naehe.ts`): 0 Treffer.
- YAML wird gelesen und ergibt dieselben 244 Sätze.
- 10 zufällige Sätze gegen die Quellen nachgelesen: 10 von 10 treffen Kern und richtigen Teil.

## Nicht geprüft

- Kein `check:vor-commit`, kein `data:validate`: die Datei wird von keinem Bau gelesen.
- Zahlen und Namen je Satz nur beim Schreiben gegen die Quellen gehalten, nicht mechanisch.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zocxtwkCEZ9wBzvFxa
