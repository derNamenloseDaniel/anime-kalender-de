<!-- titel: fix(bau): altes Nein ohne Adresse vor jedem sicheren Streaming-Termin aufheben -->
Auftrag: nein-aufheben-streaming

## Was ändert sich
`ueberholteNeins` (`pipeline/bau/11-7-wege-aus-terminen.ts`) hob ein „nicht verfügbar“ nur bei Kanal-Terminen auf (Call of the Night, PR 5023), nicht bei Streaming-Starts. Jetzt gilt es für jeden sicheren Termin (nicht `estimated`, mit `sources`, begonnen): Ist das Nein älter als der Termin und trägt kein „nicht verfügbar“ des Titels eine echte Titeladresse (Suche und Startseite zählen nicht als Adresse), entsteht der Weg aus dem Termin, ohne Adresse und ohne Tonurteil (`herkunft: 'termin'`). Ein Nein mit Adresse und `dub: false` bleiben unberührt; Kanal-Termine verhalten sich wie vorher.
Dazu: ein späterer Termin ohne Adresse ersetzt einen schon vorhandenen Kanal-Weg nicht mehr (`11-7`, `schonDa`); Zählerzeile in `check-handbelege` heißt „(sicherer Termin)“.
Dateien: `pipeline/bau/11-7-wege-aus-terminen.ts`, `pipeline/check-wege-aus-terminen.ts`, `pipeline/check-handbelege-nein-ueberholt-lauf.ts`, `pipeline/check-handbelege.ts`, `data/patchnotes/anbieter-trotz-altem-nein.yaml`, `docs/wissen/maengel.md`.

## Zahlen (public/data + data/dub-confirmed.yaml, Stand 26.11.2026, Messskript im Scratchpad)
| | vorher | nachher |
|---|---|---|
| aufgehobene Neins | 2 (Kamisama Kiss 14713, Call of the Night 175914) | 5 (+ Kuroko 102836 Prime, Spy × Family 140960 Disney+, Overgeared 212888 Crunchyroll) |
| `erstausgabe-ohne-weg` offen | 168 | 168 (davon unter den aufgehobenen Neins: 0) |
| `erschienen-ohne-weg` offen | 0 | 0 |
| `kein-weg` offen | 196 | 196 (davon unter den aufgehobenen Neins: 0) |

Die drei neuen Fälle tragen im gebauten Datensatz schon einen Weg (jüngeres Ja bzw. Adresse aus anderem Weg), die Mängelzahlen bewegen sich offline daher nicht. Der Gewinn liegt in der Regel: Fällt dort ein Ja später weg oder kommt ein neuer Titel mit altem adresslosem Nein und sicherem Termin, bleibt er nicht ohne Weg. Die echte Wirkung zeigt erst der nächste Bestandsbau; ich kann ihn in der Cloud nicht fahren (kein `data/cache`).

## Belege
- Basis rot: neuer Test gegen die main-Fassung von `11-7-wege-aus-terminen.ts`: `npx tsx pipeline/check-wege-aus-terminen.ts` → Exit 1, `FEHLER: Kuroko: Nein nur an einer Suche, Termin ohne Kanal: Weg ohne Adresse und Ton — []` und `FEHLER: Netflix (45): Nein ohne Adresse älter als der sichere Termin … — []`. Mit der Änderung Exit 0.
- `check-handbelege.ts` Exit 0 (Verstöße 0), `check-handbelege-nein-ueberholt-lauf.ts` Exit 0, `npx tsc --noEmit -p .` Exit 0, `node tools/mutationsanker-alle.test.mjs` Exit 0.
- Mutationen (`node tools/diff-mutanten.mjs --test "npx tsx pipeline/check-wege-aus-terminen.ts"`): 37 Mutanten, 0 überlebt, 0 unbrauchbar. Im ersten Lauf überlebte `ab > heute` → `>=` (Zeile 62); der Fall „Termin genau heute“ (48) fängt ihn jetzt.

## Annahmen
- „Keine Adresse“ heißt: kein `available: false`-Beleg des Titels bei diesem Anbieter trägt eine Titeladresse (`adressKern` leer oder `istSammelKern`); Kuroko (Nein an einer Amazon-Suche) und Overgeared (Nein an `crunchyroll.com`) zählen als adresslos.
- Für Kanal-Termine bleibt die Bedingung wie in PR 5023 (kein Adressen-Riegel); der Auftrag nannte nur die Ausdehnung.
- Ein Weg ohne Adresse erhöht die Mängelart `weg-ohne-adresse` (offen heute: 4); das ist die bekannte Folge der Regel.
- Handbelege mit Adresse, `dub: false` und geschätzte Termine bleiben unberührt (Test 46, 47, Trinity Seven).
