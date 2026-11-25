# Bericht reiter-doppelt-2511

- Zweig `fix/reiter-doppelt` gepusht (1 Commit 5da4db5a), kein PR (Dirigent).
- Klasse: 13 Titel / 2 Reihen (527, 2966) mit doppelten Beschriftungen vorher, 0 nachher (2926 Titel gerechnet).
- Wächter: Bestandseigenschaft + Einheitsfall in `check-reihen-reiter.ts`; Mutante rot (3 Zusicherungen).
- Grün: check-reihen-reiter, tsc, eslint (Quelldatei), mutationsanker-alle. NICHT gelaufen: `check:panel` (kein `dist/`, Browser-Server), Panel-Vergleich.
- Patchnote nicht angelegt (Wortlaut-Vorschlag in pr.md).
- Rückblick gut: Eigenschaftsprüfung am echten Bestand fand die Klasse ohne feste Titelnummer.
- schlecht: Playwright-Version in der Sandbox passt nicht (1234 erwartet, 1243 da), Symlink-Trick half, aber `dist/` fehlt trotzdem.
- unerwartet: Pokémon hat nur ein „25“, die „25a/25b“ aus dem Auftrag treten nicht auf; doppelt sind nur „16“ (und bei 2966 „1“, „2“).
- Vorschlag: `check:panel` in der Cloud mit vorgebautem `dist/` anbieten oder aus dem Bauer-Auftrag streichen.
