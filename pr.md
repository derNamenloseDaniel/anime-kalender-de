<!-- titel: Wächter: jede Stelle im Bau, die Wege anlegt, kennt die Tot-Frage -->
Auftrag: waechter-isttot

## Was sich ändert

- **Neuer Wächter** `pipeline/check-wege-stellen-istot.ts` (in `tools/check-logic-liste.txt` sortiert eingetragen): findet per TypeScript-Syntaxbaum (`pipeline/lib/wege-stellen.ts`) jede Zuweisung und jeden Push an `streams`/`watchLinks` in `pipeline/bau` und `pipeline/lib` und hält sie gegen `pipeline/lib/wege-stellen-geprueft.json`. Rot bei: neuer ungeprüfter Stelle, mehr Stellen als geprüft, einer Stelle, deren Funktion `istTot`/`toteAdressen`/`lautPruefungTot` nicht mehr im Rumpf benutzt (Parameter zählt nicht), veraltetem Eintrag, „ohne“ ohne Grund.
- **Liste der heutigen Stellen:** 44 Funktionen mit Wege-Anlegestellen, jede einzeln angesehen: 13 mit Tot-Frage (`istTot` 7, `toteAdressen` 3, `lautPruefungTot` 3 inkl. dem Fix), 31 „ohne“ mit Grund (läuft vor der Linkprüfung 09-2, die tote Adressen danach entfernt; Handdaten; Adresse aus dem Lauf selbst; aniSearch-Seiten werden nie abgerufen; Fehlalarme des Alias-Fundes, die nur Vorhandenes ordnen/kopieren).
- **Befund, eigener Commit:** `09-6-3-kanal-kauf.ts` (`ergaenzeTitel`) legte Kanal- und Kaufwege aus aniSearch ohne Tot-Frage an, `09-6-1` aus derselben Quelle fragt `lautPruefungTot`. Jetzt fragt auch 09-6-3 (`lautPruefungTot` durchgereicht). Test `pipeline/check-kanal-kauf-tot.ts`.
- Der MOTN-Fall (`13-3-1-tmdb-wege.ts`) ist auf main schon mit `istTot` versehen und steht als geprüft in der Liste.

## Basis-Beleg (rot gegen main, dann grün)

- Kanal-Test gegen die main-Fassung von `09-6-3-kanal-kauf.ts`: `✖ tote Adresse wird kein Kaufweg`, Exit 1; mit Fix Exit 0.
- Wächter gegen die main-Fassung von `09-6-3`: `✖ pipeline/bau/09-6-3-kanal-kauf.ts::ergaenzeTitel: benutzt lautPruefungTot nicht mehr (Zeile 83)`, Exit 1; mit Fix Exit 0 (`✓ 44 Stellen …` (gemeint: Funktionen)).
- Mutationsprobe von Hand: `if (istTot(url)) continue` aus `13-3-1-tmdb-wege.ts` entfernt → `✖ …ergaenzeWegeAusTmdbUndMotn: benutzt istTot nicht mehr`, Exit 1 (steht auch als Selbsttest im Wächter).

## Mutationstabelle (der Diff-Mutanten-Läufer, je Testdatei getrennt, da `--test` für alle Dateien gilt)

| Lauf | Mutanten | überlebt |
|---|---|---|
| erster Lauf, beide Tests zusammen | 192 | 22 |
| nur `check-kanal-kauf-tot.ts` (gilt für 09-6-3) | 17 | 1 (Titelkennung im Entfernt-Riegel) |
| nur `check-wege-stellen-istot.ts` (gilt für wege-stellen.ts) | 175 | 5 |

Danach zwei Tests ergänzt (Titelkennung im Riegel, Variable ohne Funktion als Modul-Stelle); dieser letzte Stand ist nicht erneut als Vollauf gefahren. Verbleibend als gleichwertig begründet: `return undefined` → `if (false)` (fällt durch), Alias-Cache (`aliasJeFunktion.has`, nur Speed), `join(…)` ohne ersten Parameter in `dateienUnter`/`alleWegeStellen` (Arbeitsordner ist die Wurzel). `09-6-anisearch-wege.ts` (eine Zeile durchgereicht): Sonde meldet „Test lädt Datei nicht“, ohne Aussage.

## Geprüft

`npx tsc --noEmit -p .` Exit 0; beide neuen Tests Exit 0 (auch mit der Bestandssperre); der Workflow-Wächter Exit 0; der Uhr-Zähler ok; die Umfangsprüfung ok. `check-tote-adressen.ts` auf `public/data`: 0 Verstöße, die Korrektur ändert den heutigen Datensatz also nicht (keine Patch Notes; kein sichtbarer Unterschied).

## Annahmen

- Stellen vor der Linkprüfung 09-2 gelten als abgedeckt, weil `filtereVerweise` dort tote Adressen entfernt; ergebnisseitig bleibt `check-tote-adressen.ts` der Zweitwächter.
- Der Cartoon-Bau kennt als Tot-Quelle nur Handbelege (`baueIstTot(tot, () => false)`); `ergaenzeCartoonJoyn` bleibt deshalb „ohne“ mit Grund.
- Cloud-Grenzen: kein Bestandsbau, kein `data/cache`; gemessen an `public/data/*.json` und dem Quelltext.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zoi4zJroJBSRZ8fNt8
