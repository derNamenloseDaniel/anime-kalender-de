## Nachtrag (Runde 1, kein Force-Push; Kopf dca8982af)

- A1 → Gegenprobe „anderer Anbieter“ läuft jetzt mit crunchyroll und `woechentlich: false` im Batch-Zweig, prüft `schedule.episodeCount` und die Katalogmarke. Mutante `platform !== 'netflix'` entfernt: rot („✖ gegenprobe: anderer Anbieter im Batch-Zweig“), zurückgenommen, grün.
- A2 → neuer Fall „Die Zahl der Meldung gilt vor AniList (2 gegen 12)“. Mutante `v.folgen ? undefined :` entfernt: rot („gefunden: episodeCount 12“), zurückgenommen, grün.
- A3 → Fälle Art `weekly` und `movie` mit Netflix-ONA, Ende = Starttag, erwarten keine Zahl. Mutante `art !== 'batch'` entfernt: beide rot, zurückgenommen, grün.
- A4 → Fälle „unter 3 Folgen setzt auch keine Zahl“ und „genau 3 Folgen setzen die Zahl“ prüfen `schedule.episodeCount` direkt. Mutante `>= 1` statt `>= KATALOG_MIN_FOLGEN`: rot („unter 3 Folgen setzt auch keine Zahl“), zurückgenommen, grün.
- A5 → `data/patchnotes/fool-night-alle-folgen-am-start.yaml` (bugfix, „Fool Night zeigt alle 12 Folgen am 26.11.“); die PR-Beschreibung bleibt unverändert.
- Grün nach dem letzten Edit: `npx tsx pipeline/check-katalog-release.ts` (Exit 0), Nachbartests check-meldung-cartoon, check-meldung-praefix, check-detektiv-funde (Exit 0), `npx tsc --noEmit -p .`, eslint, `mutationsanker-alle.test.mjs`, `uhr-in-tests`, `umfang-pruefen`.
- Lehre: Eine Gegenprobe „anderer Anbieter“ prüft erst etwas, wenn der Testfall den Zweig wirklich erreicht, den die Bedingung schützt (hier verhinderte der Wochenzweig das). Pro Bedingung ein Mutant und ein roter Lauf vor dem Push.
