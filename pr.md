<!-- titel: FSK aus JustWatch: jeden Verwerfungspfad zählen, Analyse der 863 offenen Titel -->
Auftrag: fsk-abdeckung

## Was und warum

Die Mängelliste führt 863 Titel ohne FSK mit Zuständigkeit `auto:justwatch`. Gemessen an den ausgelieferten Titeldaten und der JustWatch-Befunddatei (ohne Cache) trägt der Automatikweg sie nicht, weil JustWatch sie nicht liefert, nicht weil der Code sie verliert:

| Befund bei JustWatch | 863 Titel | davon mit Stream-Weg (310) |
|---|---|---|
| `ohneTreffer` | 686 | 175 |
| Treffer, `ageCertification` leer | 163 | 126 |
| Altersangabe da, Film steht bei mehreren Titeln (12) / übernehmbar (1, Titel 8460) | 13 | 9 |
| ohne Befund | 1 | 0 |

Die echte Übernahme-Funktion an den echten Eingaben: 863 → 862. Hochrechnung für den nächsten Bestandsbau: **höchstens 1** der 863 (8460), 0 durch diesen PR; das ist ein Zählfix, keine Datenänderung.

Der Code-Befund (Skill `stille-ausfaelle-verhindern`): `ohneTreffer`, leere Angabe und geteilter Film fielen in `pipeline/bau/11-2-1-fsk-justwatch.ts` ohne Zählung aus der Schleife. Jetzt landet jeder Titel ohne Freigabe in genau einem Zähler (`FskJwBilanz`); der Bau-Log nennt Zahl und Grund je Pfad und die Kennungen des geteilten Films. Analyse und Vorschlag in `docs/wissen/maengel.md`.

## Commits

1. Umbau, Ausgabe gleich: Schleife in `setzeFskAusBefunden` ausgelagert; Vorher/Nachher der gesamten Titelausgabe byte-gleich (`cmp`).
2. Verhalten: Bilanz und Log-Zeile `fskJwBilanzZeile`, Test `pipeline/check-fsk-justwatch-bilanz.ts` (in `tools/check-logic-liste.txt`), Doku.
3. Test um Verdrahtung des Bau-Schritts (Kulisse mit eigener `AK_ROOT`) und Abweichungs-Zähler ergänzt.

## Belege

- Rot gegen main: `git show origin/main:pipeline/bau/11-2-1-fsk-justwatch.ts` eingesetzt, `npx tsx pipeline/check-fsk-justwatch-bilanz.ts` → `SyntaxError: … does not provide an export named 'fskJwBilanzZeile'`, **Exit 1**.
- Grün mit dem Zweig: Exit 0, 11 Zusicherungen. `npx tsc --noEmit -p .` Exit 0, `npx eslint` Exit 0, `check-sammler-lesezugriffe` 0, `check-workflows` 0, `test-netz-wache` 0, `uhr-in-tests` 58 (nicht gestiegen), Umfang in Ordnung.
- `diff-mutanten (Werkzeug) mit --test "npx tsx pipeline/check-fsk-justwatch-bilanz.ts"` (nach Test-Nachschärfung): 43 Mutanten, 1 überlebt, 0 unbrauchbar. Davor: 12 überlebt.

| Stand | Mutanten | überlebt |
|---|---|---|
| erster Test | 43 | 12 (Abweichungs-Vergleich, Verdrahtung, Log-Aufruf) |
| nach Nachschärfung | 43 | 1 |

Der eine Überlebende ist `pipeline/bau/11-2-1-fsk-justwatch.ts:102`, die Rückfall-`{}` von `readJson`: sie greift nur, wenn die Befunddatei fehlt, im Betrieb nie; gleichwertig.

## Annahmen

- Keine Patch Notes: Die Daten bleiben unverändert, sichtbar wird höchstens 8460 nach dem nächsten Bau.
- Die Zusicherung „kein `fskQuelle` bei TMDB-Freigabe“ verbietet es, die zwei Altfälle (Spycies, Rohirrim) nur im JustWatch-Schritt zu lockern; die Ursache liegt in `mehrdeutigeFilmzuordnungen` (Vorschlag in `bericht.md`, nicht gebaut, ohne Cache nicht am echten Bau prüfbar).
- FSK wird nirgends erfunden oder abgeleitet; es ändert sich kein Datenwert.
