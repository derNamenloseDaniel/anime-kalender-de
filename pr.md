<!-- titel: Mängel handlung-de: 13 eigene deutsche Handlungstexte (Wikipedia DE + AniList) -->
Auftrag: handlung-de-wikipedia

## Was ändert sich
`data/handlung-eigen.yaml` bekommt 13 neue Einträge, `data/patchnotes/handlung-zu-13-weiteren-titeln.yaml` die Patch Note („Deutsche Handlung zu 13 weiteren Titeln“). Sonst nichts.

Titel: Gon, der Höhlenfratz (8764), The Golden Bird (3760), Pokémon Ranger: Spuren des Lichts (8438), Cyborg 009 Call of Justice 1–3 (87481–87483), Psycho-Pass Sinners of the System 2 (104382), Ultraman Staffel 2 und 3 (109911, 147729), Larva Island Staffel 2 (132477), Mahouka Yotsuba-Film (178707), Sylvanian Families Mini-Episoden Klee (187054), Girls und Panzer Finale 5 (202390).

## Offene Mängel handlung-de
- Vorher: 63 (gemessen, Stand `main`).
- Nachher: 50 (gerechnet: 63 − 13; alle 13 Kennungen stehen in der offenen Liste, `check-handlung-eigen` zählt 103 eingebunden statt 90, der Bau liest die Einträge). Die Zahl in der Mängelliste ändert erst der nächste Bestandsbau.
- Ziel „alle 63, mindestens 45 Einträge“ nicht erreicht, Grund unten.

## Annahmen
- Zwei Quellfamilien je Eintrag: de.wikipedia.org (Seite trägt Inhalt der Reihe oder des Titels) und AniList (Beschreibung des Titels). Das ist die einzige Kombination, die aus der Cloud lesbar ist (andere Hosts nicht auflösbar).
- Wo Wikipedia nur die Reihe beschreibt (Cyborg 009 Teil 2 und 3, Sylvanian Families, Girls und Panzer), steht `umfang: reihe`.
- Eigene Formulierung: gegen AniList-Beschreibung und Wikipedia-Rohtext gemessen, kein gemeinsamer Abschnitt von fünf Wörtern außer den Titelnamen selbst.
- Keine Spoiler über die Ausgangslage der ersten Folge bzw. die Inhaltsangabe der Quelle hinaus.

## Geprüft
- `check-handlung-eigen`, `check-handlung-eigen-bestand`, `check-handlung-eigen-hinweis`, `check-anisearch-handlung`, Patch-Notes-Prüfungen: grün.
- `npx tsc --noEmit -p .`: grün.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zqd6PkqGk8vGGuFVvk
