<!-- titel: fix(erweiterung): Prime-Spur begrenzt Fehler-Einträge auf 200 -->
Auftrag: erweiterung-diagnose-spur

## Was
`akPrimeSpurKuerzen` in `extension/prime-titelseite.js` behielt die letzten 80 Einträge plus jeden mit `ok: false` ohne Obergrenze. Jetzt gilt zusätzlich: höchstens 200 Einträge bleiben, die ältesten Fehler fallen zuerst heraus.

## Befund zur Basis
Die Kürzung „80 jüngste plus alle Fehler“ stand schon auf `origin/main`, nur die harte Obergrenze fehlte. Test 300 Einträge mit 5 Fehlern (`extension/prime-spur.test.cjs`) war gegen die Basis daher schon grün; rot gegen die Basis war der neue Test zur Obergrenze (1000 Fehler ergaben 1000 statt 200 Einträge).

## Annahmen
- Grenze 200 zählt Einträge insgesamt (80 jüngste + ältere Fehler), weil die jüngsten 80 ebenfalls Fehler sein können.
- Interne Änderung, kein Patch-Notes-Eintrag.

## Prüfung
- der Spur-Test (`extension/prime-spur.test.cjs`) grün, die Erweiterungstests grün, `npx tsc --noEmit -p .` grün, eslint grün.
- Mutationstabelle (diff-mutanten mit dem Spur-Test): 26 Mutanten, 1 überlebt. Der Überlebende (`Math.max` Argumente getauscht, `extension/prime-titelseite.js`) ist äquivalent, weil `Math.max(a, b)` gleich `Math.max(b, a)` ist. Ein erster Lauf hatte 4 Überlebende (`Math.max`/`Math.min`); dazu kam ein Test (100 alte Fehler bleiben vollständig) und `Math.min` entfiel als überflüssig.

Auftrag: erweiterung-diagnose-spur
