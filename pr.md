# Nachtrag CI-Fix 2

**Ursache:** `check:logic` (Kette – Logik) meldete `web/src/components/tooltip-einzeln.ts:26` — roher `keydown`-Hörer in `useEinzigeBlase`; Wächter `pipeline/check-escape-hoerer.ts` verlangt `useEscape`.

**Änderung (be9a15b98):** `tooltip-einzeln.ts:32` ruft `useEscape(offen, () => aktuell.current())`; der rohe `document`-Hörer ist entfernt, keine Ausnahme eingetragen. Als oberste Ebene schließt die Blase vor einem Dialog darunter (WCAG 1.4.13). `pipeline/check-tooltip-bedienung.ts` hängt `window` mit echten Hörern ein (`drueckeEscape`) und hat zwei neue Fälle (Z. 102/104): „Blase im Dialog: erstes Escape schließt nur die Blase“, „… zweites Escape schließt den Dialog“.

**Beleg (lokal, Exit-Codes):** `check-escape-hoerer.ts` 0 (0 Meldungen); `check-tooltip-bedienung.ts` ok (alle ✓ inkl. beider Dialog-Fälle); `check-escape-stapel.ts` 0; `check-leinwand-escape.ts` 0; `tsc --noEmit -p .` 0; `npm run check:umfang` 0.

**Rückblick:** Gut: Wächter nannte Datei und Zeile. Unerwartet: Der Test hing am `document`, das Mini-DOM ignoriert `window`-Hörer — der alte Test hätte `useEscape` nie gesehen. Lehre: Tests für `useEscape` brauchen ein `window` mit echten Hörern.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
