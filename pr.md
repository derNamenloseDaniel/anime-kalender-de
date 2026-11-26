<!-- titel: test(worker): Prime-Knopf nennt gewählte Treffer neben den Worker-Titeln -->
## Anlass

Auftrag: test-vorschlaege-sammel (Sammelzeile „Test-Vorschläge“, sechs Anlässe: PR 2498, 2510, 4393, 4394, 4436, 4454). Nur Tests, kein Verhalten geändert.

Ergebnis nach Lektüre der PRs und des Stands von `main`: Fünf der sechs Lücken sind dort schon geschlossen (siehe Tabelle); offen war nur die Amazon-Kulisse (4394). Dafür dieser PR.

## Geänderte Dateien

- `tools/worker-amazon-zahl-gleich.test.ts`: neuer Block „Gewählte Suchtreffer“. `kartenOffen` und `suchOffen` kommen aus der Seite; die Titelzahl bleibt die des Workers (7), der Knopf nennt „7 Prime-Titel · 2 gewählte Treffer · 2 Suchen offen“, bei nur einer offenen Karte „1 gewählte Treffer offen“ statt „alles geprüft“. Vorher stand `kartenOffen` nur als Attrappe `() => 0` in der Kulisse (der Prüfer von 4394 hatte genau diese Kulisse als Lücke genannt).
- `tools/mutationen/amazon-knopf-karten.json`: drei Mutanten.

## Beleg rot / grün

Der Test ist neu und `main` ist korrekt, daher rot nur gegen Mutanten der main-Fassung (der Mutationsläufer mit `tools/mutationen/amazon-knopf-karten.json`, Exit 0 = alle rot, Kontrolle grün):

| Nr | Mutant | Urteil |
|---|---|---|
| 1 | Kontrolle (unmutiert) | grün |
| 2 | `karten` nicht an `akPrimeKnopfText` gegeben (Seitenskript amazon) | rot, Exit 1, „FEHL … Knopf nennt Titel, Karten und Suchen getrennt“ |
| 3 | nur Karten offen gilt als „alles geprüft“ (Skript prime-stand-ziele) | rot, Exit 1 |
| 4 | Karten nicht als eigener Teil | rot, Exit 1 |

3 rot, 0 überlebt. Danach `npx tsx tools/worker-amazon-zahl-gleich.test.ts` Exit 0 („alle Fälle ok“), `tsc --noEmit` mit der Worker-Tool-Konfiguration Exit 0. `diff-mutanten.mjs` erzeugt hier nichts: der Diff enthält keine Codezeile außerhalb von Tests.

## Die übrigen fünf Anlässe

| PR | Lücke | Stand auf main | Belege |
|---|---|---|---|
| 2498 | Ladereihenfolge `globalThis.ak…` gegen Manifest | gestrichen: Wächter extension-lade-reihenfolge samt Test, prüft das echte Manifest, Mutanten in der Liste test-vorschlaege-sammel | Test extension-lade-reihenfolge ok |
| 2510 | Artefakt-`path` bestand-bauen ↔ claude-reparatur | gestrichen: Wächter artefakt-kette samt Test über die echten Workflows | Test artefakt-kette ok |
| 4393 | `coverBild` Grenzfall `w == Breite·Dichte` | gestrichen: Prüfung check-cover-bild-grenze (in `check-logic-liste.txt`) | Lauf „check-cover-bild-grenze: ok“ |
| 4436 | Fahnenhöhe bei `--handy` | gestrichen: Messung ansicht-fahne, Urteil fahne-urteil mit Test, Mutanten in der Liste fahne-handy, in `check:ansichten-handy` | Test fahne-urteil ok |
| 4454 | Mod-Uhr setzbar | gestrichen: `sortiereRegeln` nimmt die Zeit als Parameter, `regelmaessig.test.ts` fährt feste Zeiten (00:30, 01:50, 02:10); der Pane-Test ist ohne Cron zeitunabhängig. Die Uhr in `register.tsx` selbst zu setzen wäre ein Umbau und ist in der Mod nicht möglich (`Date.now` schreibgeschützt) | Mod-Test mod-tests grün (135 Tests) |

## Annahmen

- Kein Fix nötig: kein Test fand einen echten Fehler.
- Die neue Datei unter `tools/mutationen/` ist nur Beleg und wird von keiner Kette gefahren.

Patch Notes: keine – reine Teständerung.

Auftrag: test-vorschlaege-sammel
