<!-- titel: Devil May Cry Staffel 2: Netflix-Weg von Hand belegt (Mängel kein-weg) -->
Auftrag: maengel-weg-b

Mängel `kein-weg` + `erstausgabe-ohne-weg`, nur Titel mit id ab 10000. Offene Zeilen dieser beiden Arten (id ab 10000) vorher: **185** (103 Titel; `data/maengel.json`, Stand 26.11.2026). Nachher: **183** (102 Titel) — gerechnet, nicht im Bau gemessen (Cloud ohne `data/cache`).

- `data/curated/weg-handrecherche-b.yaml`: ein Eintrag, Devil May Cry Staffel 2 (10020916), Netflix, 12.05.2026, 8 Folgen, Quellen space4games.com und netflix.com/de/title/81506915 (abgerufen 26.11.2026). Die Serienkennung 81506915 teilt Staffel 1 (10020483); `data/anbieter-staffeln.json` führt 8 + 8 Folgen, die Summe passt (K57).
- `pipeline/check-weg-handrecherche-b.ts`: Wächter für den Eintrag; `tools/check-logic-liste.txt`: Zeile dazu.
- `data/patchnotes/devil-may-cry-staffel-2-netflix-weg.yaml`: Patchnote.

Basis-Beleg: Test gegen `origin/main` (Datei fehlt) rot — „✖ Devil May Cry Staffel 2 steht in der kuratierten Liste — gefunden: 0“, Exit 1; mit der Datei grün, Exit 0. `npx tsc --noEmit -p .` grün, `pipeline/validate.ts` grün (312 Einträge).
Mutationstabelle (`node tools/diff-mutanten.mjs`): „keine fahrbaren Mutanten (Diff ohne Code-Zeilen oder ohne Test)“ — der Diff enthält nur Daten und einen Test.

Annahmen: Kein `dub`-Feld, weil die Suchtreffer-Aussage („deutsche Synchronfassung von Anfang an“) nicht wörtlich geprüft werden konnte (Seiten aus der Cloud nicht abrufbar). Ein Kinoeintrag zählt im Register nicht als Weg (Detektiv Conan 198369 hat einen und bleibt offen), darum kein Kino-Eintrag. Ziel „mindestens 40 Titel“ nicht erreicht, Grund in bericht.md.
