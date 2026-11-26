
## Nachtrag (Kette grün, Kopf b20e8b7e5f64)

**Ursache:** `tools/ak-von.test.mjs` liest `data/kennungen.json`, ohne Eintrag in `tools/sammler-lesezugriffe.jsonl` (Wächter `pipeline/check-sammler-lesezugriffe.ts`, Kette „Logik 1“).
**Änderung:** Eintrag ergänzt. Eine Fixture wäre schlechter: die echte Zuordnungstabelle ist der Gegenstand des Tests, er wählt Zeilen nach Eigenschaft, nicht nach festem Schlüssel. Die übrigen neuen Tests des PRs geprüft: `tempo-kern.test.mjs` schreibt nur in ein Temp-Dist, kein weiterer Lesezugriff auf `data/*`.
**Beleg:** vorher `✖ tools/ak-von.test.mjs: liest data/kennungen.json ohne Eintrag …`, Exit 1; nachher Exit 0. `node tools/ak-von.test.mjs` → `ak-von.test: ok`, `npx tsc --noEmit -p .` Exit 0.
