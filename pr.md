# Reihen-Reiter: gleiche Kurzbeschriftungen bekommen Buchstaben

Reiterlisten im Detail-Panel (F157) zeigten für verschiedene Titel dieselbe Beschriftung: Pokémon (Reihe 527) „16“, „16“, Ookami to Koushinryou (Reihe 2966) „1“, „1“, „2“, „2“. Nur der Tooltip unterschied sie.

**Änderung:** `eindeutigeBeschriftung` in `reihen-reiter-liste.ts` hängt bei gleicher Beschriftung innerhalb einer Liste in Listenreihenfolge a, b, … an („16a“, „16b“, „1a“, „1b“). Einmalige Beschriftungen und Überlappungen („14–15“/„15–16“) bleiben, Tooltip und Namen unverändert.

**Klasse gezählt** (`reihenReiterVon` über alle 2926 Titel aus `public/data`): vorher 13 Titel in 2 Reihen (527, 2966) mit doppelten Beschriftungen, nachher 0.

**Wächter** (`pipeline/check-reihen-reiter.ts`, läuft in `check:logic`): Eigenschaft über den ganzen Bestand (1112 Reiterlisten, keine mit doppelter Beschriftung, nicht an Titelnummern gebunden) plus Einheitsfall für die Vergabe. Mutante (Anhang aus, `=== 1` zu `!== 0`): rot an 3 Stellen (Hauptserie, Bestand, Einheitsfall). `Kurzform`-Muster der Klassenprüfung erlaubt jetzt den Buchstaben.

**Lokal:** `check-reihen-reiter` grün, `tsc --noEmit` grün, `mutationsanker-alle` grün (286 Listen). `check:panel` nicht gelaufen (braucht `dist/` und Browser-Server; Cloud-Sandbox), Panel-Vergleich nicht gefahren; Kette/Nachtlauf prüft.

Patch-Notes-Zeile (Vorschlag, `data/patchnotes/`): kategorie `fix`, text „Reiter gleicher Staffeln unterscheidbar“, untertitel „Pokémon 16a und 16b statt zweimal 16“. Nicht angelegt, Wortlaut offen für den Patchnotes-Autor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
