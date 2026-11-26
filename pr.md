<!-- titel: tools: diff-mutanten Parameter-Vorgabe auch → leerer Wert, Mutantenklassen im Skill pruef-technik -->
Auftrag: diff-mutanten-klassen

## Ausgangslage
Die fünf verlangten Klassen (Objekt-Eigenschaft entfernt, Parameter-Vorgabe → 0, Zuweisung im Callback entfernt, Argument am Aufrufort entfernt, `throw` → `if (false)`) sind seit PR 4529 (22.11.) in `tools/diff-mutanten-klassen.mjs` samt Tests in `tools/diff-mutanten-klassen.test.mjs`, „Anweisung → if (false)“ seit PR 4651. Offen waren: der „leere Wert“ bei Klasse 2, die Doku im Skill und die Laufzeitmessung.

## Was
- **Verhalten** (`tools/diff-mutanten-klassen.mjs`): Parameter-Vorgabe erzeugt neben `→ 0` bei nicht leerem Text-, Template-, Listen- oder Objektliteral zusätzlich `→ leer` gleicher Art (`(s = "x")` → `(s = "")`, `[1]` → `[]`, `{ a: 1 }` → `{}`). Grund: `→ 0` ändert die Art, ein typtreuer Test fängt das zu leicht; der leere Wert ist der subtilere Fehler.
- **Doku**: neuer Abschnitt „Feste Mutantenklassen von diff-mutanten“ in `.claude/skills/pruef-technik/SKILL.md` (alle Klassen mit Beispiel, was nicht erzeugt wird, gleichwertiges `return null`); Kopfkommentar in `tools/diff-mutanten.mjs` nachgezogen (Anweisung → if (false) fehlte).

## Belege
- Neuer Test gegen die Basis **rot**: `✗ vorgabe: Zeichenkette, Liste, Objekt, Template → leerer Wert gleicher Art`, `✗ vorgabe: Name trägt den Parameternamen`; danach alle Fälle grün. Negativfälle: schon leere Vorgabe, Zahl, Bezeichner erzeugen keinen Leer-Mutanten; alle Leer-Mutanten syntaktisch gültig (TS-Parser).
- `node tools/diff-mutanten-klassen.test.mjs`, `diff-mutanten.test.mjs`, `npx tsc --noEmit -p .`, `eslint` grün; Mutationsanker `--diff`: 0 tote Anker.
- Mutationsprobe `node tools/diff-mutanten.mjs` auf dem eigenen Diff: erst 21 Mutanten, 1 überlebt (gleichwertiges `return null` am Ende von `leererWert`, Zeile gestrichen); letzter Lauf **20 Mutanten, 0 überlebt, 0 unbrauchbar** (11 s).

## Laufzeit vorher/nachher (Grenze +30 %)
Listenerzeugung, Median aus 7 Läufen, alle Klassen; die Läuferzeit wächst mit der Mutantenzahl.

| Diff | vorher | nachher |
|---|---|---|
| 28fc1644 (9 Code-Dateien, +250) | 101 Mutanten, 10,1 ms | 101 Mutanten, 9,6 ms |
| ab69a6e4 (3 Code-Dateien, +224) | 114 Mutanten, 8,5 ms | 114 Mutanten, 8,3 ms |
| 22d37f70 (32 Code-Dateien, +731) | 534 Mutanten, 53,1 ms | 534 Mutanten, 54,2 ms |
| ganzer Bestand (1403 Dateien unter pipeline/lib, shared, tools, web/src/lib, jede Zeile) | 153 127, 7,0 s | 153 170 (+0,03 %), 6,8 s |

Zum Vergleich ohne feste Klassen (Stand vor 4529): 35 / 34 / 202 Mutanten auf denselben Diffs, die Klassen aus 4529/4651 verdreifachen also die Läuferzeit; das lag vor diesem PR und ist hier nicht verändert.

## Annahmen
- „→ 0 bzw. leerer Wert“ gelesen als: beide Mutanten, der leere nur, wo er sich von der Vorgabe unterscheidet und die Art bekannt ist (Literal). Bezeichner und Aufrufe als Vorgabe bekommen nur `→ 0`.
- Template-Literal ohne Platzhalter wird `""` (gleiche Art Text).

Patch Notes: keine – reines Prüfwerkzeug, für Besucher nicht sichtbar.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zqhVJw8QUKYZ2EsmeY
