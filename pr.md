<!-- titel: TV-Handtermin: Sendetage aus dem Programm belegen statt ≈ (One Piece ProSieben MAXX) -->
Auftrag: kalender-n3-tv-sendetage

Zweig: `fix/kalender-n3-tv-sendetage`

## Was jetzt anders ist
One Piece „Whole Cake Island“ (ProSieben MAXX) bekommt die Tage der gesichteten Folgen 780–789 (05.–20.11.) als belegt; sie tragen kein „≈“ mehr. Die Uhrzeit bleibt die des Handtermins (18:50, nicht ≈).

## Fünf Stufen
- **(a) Ursache:** `pipeline/lib/tv-hand-belege.ts` (`belegeHandTermine`): Der Handtermin bekam `observed` nur, wenn der Gesamtbestand der Sichtungen eine Folgenliste voll trifft. Frühere One-Piece-Sendungen im September (Wa No Kuni, nicht in der Liste) machten `mitWiki` falsch, `folgenBelegt` blieb leer, der Handtermin ohne `observed`. Dann gilt in `shared/logic.ts` `terminGeschaetzt` („nur Start belegt“) jeden Folgetag als ≈. `shared/logic.ts` bleibt unberührt (Hauptänderung dort: Auftrag kalender-n1-n2-geschaetzt).
- **(b) Klasse:** Hand-TV-Releases in `public/data/releases.json`: 3 (Dragon Ball Daima 0 ≈, Yaiba 14 ≈ nach Rest-Sichtung, One Piece 97 ≈ vor dem Fix). Nur One Piece war vom Ausfall betroffen. Probe an echten Daten (`expandEvents`): One Piece 97 → 88 ≈-Termine. Der Rest steht, weil `data/tv-programm.json` nur bis 14.11. gesichtet ist; der nächste Lauf liefert die Tage bis 03.12. (heute 26.11. und 27.–30.11. bleiben ≈, bis die Sendung im EPG steht).
- **(c) Fix an der Klasse:** Fallback in `belegeHandTermine` für jeden Handtermin ohne Treffer im Gesamtbestand: nur Sichtungen von Titel und Sender ab Start des Handtermins auswerten (`schattenAbStart`). Nummern bleiben aus der Folgenliste, keine geratenen.
- **(d) Test:** `pipeline/check-tv-hand-belege.ts` (in `check:logic`), Fixture mit festen Tagen. Neuer Test gegen die main-Fassung: `FEHLER ältere fremde Sendung: belegt: ist 0 soll 1`, Exit-Code 1; mit Fix Exit 0. Mutationsprobe (Skill pruef-technik, drei Mutanten, alle Exit 1): `>= start` → `> start`, → `>= '0'`, Titelfilter entfernt.
- **(e) Warum durchgelassen:** Der Test von 08.11.2026 deckte nur Sichtungen innerhalb des Handtermin-Bereichs ab, nie „ältere Sendung desselben Titels außerhalb der Folgenliste“; die Prüfkette hat keinen Wächter „Hand-TV-Release mit EPG-Sichtung im Bereich, aber ohne `observed`“. Vorschlag: Wächter in `check:logic` auf den echten Datensatz.

Geprüft: `npx tsc --noEmit -p .` 0, `npm run check:umfang` 0, eslint der zwei Dateien 0.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
