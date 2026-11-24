# feat(panel): Staffelnamen in der Abschnittsbox und am Reiter (F157)

## Was der Besucher sieht

Hat die Detaildatei Staffelnamen (`sn`, wörtlich aus `data/curated/*-staffeln.yaml`), steht der Name der gewählten Staffel fett über der Kopfzeile der Abschnittsbox. Bei Pokémon Horizonte sind das „Die Serie“, „Die Suche nach Laqua“, „Gute Aussichten“ und „Wunder in Sicht“. Der Reiter zeigt weiter nur die Ziffer, sein zugänglicher Name lautet „Staffel 2: Die Suche nach Laqua“ (mit Lage: „Staffel 4: Wunder in Sicht, läuft“). Ohne `sn` oder für eine Staffel ohne Eintrag ändert sich nichts.

## Warum gekürzt (design-regeln.md, Abschnitt 13, E5 „nichts doppelt“)

Die Yaml-Namen lauten „Pokémon Horizonte: Staffel 2 – Die Suche nach Laqua“. Der Serienteil steht schon als Titel im Panel und „Staffel 2“ am Reiter. `kurzeStaffelNamen` entfernt deshalb nur zwei Teile: den Serienteil bis „: “, wenn alle Namen des Titels (mindestens zwei) ihn teilen und danach noch Text kommt, und „Staffel N – “ mit der eigenen Nummer. Was übrig bleibt, ist immer ein wörtliches Stück des Yaml-Namens, ausgedacht wird nichts. Lange Namen brechen in der Box um (`break-words`), statt abgeschnitten zu werden.

## Änderungen

- `folgen-bereich.tsx`: `sn` im Typ der Liste, wird an `reiterVon` durchgereicht
- `staffel-reiter-liste.ts`: `Reiter.name`, `kurzeStaffelNamen`
- `staffel-reiter.tsx`: aria-label „Staffel N: Name“
- `staffel-abschnitt.tsx`: Namenszeile (`data-staffel-name`, `text-ak-text`) über der Kopfzeile
- Bühne: der Horizonte-Fall bekommt die Ein-Titel-Detaildatei 14839. Sie ist zusammengesetzt aus den eingefrorenen Staffeldateien 26469–26471 mit dem Versatz der Yaml (0/45/89), dazu `s` und `sn` aus der Yaml. Titel und übrige Felder des Falls bleiben so eingefroren, wie sie aus der Zeit der Teilung stammen, bis der Fall nach dem ersten Bestandsbau neu eingefroren wird.
- Patchnote `f157-staffelnamen.yaml`, `docs/wissen/datensatz.md` nachgeführt

## Prüfungen (lokal, alle Exit 0)

`tools/buehne-staffel-reiter.test.ts` (neu: Namen, Kürzungsgrenzen, aria-label, ohne `sn`), `pipeline/check-folgen-staffeln.ts` (neu: echte Komponente mit `sn`, Staffel ohne Eintrag), `check-einzahl-folge`, `check-staffel-anzeige-panel`, `check-panel-eigenes-werk`, `check-horizonte-kachel`, `check-horizonte-staffeln`, `check-folgenflaggen`, `check-serienbeleg-folgenbereich`, `check-synchro-beleg-folgen`, `check-disc-bereich`, `check-vorfaelle-ablauf`, `check-anime2you-*`, `check-patchnotes*`, `buehne-entwurf-render`, `buehne-fall-optionen`, `buehne-toggo-pillen`, `buehne-faelle-nur*`, `buehne-umfang`, `pr-diff-bauen`, `pr-stufe`, `npx tsc --noEmit -p .`, eslint, `uhr-in-tests` (58/58), `heute-utc` (5/5), `design-klassen`, `design-immer-dunkel`, `mutationsanker-alle` (0 tote Anker), `mutationsanker-ohne-tests`.

**Mutationsprobe** (`tools/mutationen/staffel-reiter-liste.json`): 19 neue Mutanten und die Kontrolle. Ergebnis: 19 rot, 0 überlebt. Ein früher Überlebender („Serienteil ohne ‚: ‘“) führte zu einer schlichteren Bedingung (`ende > 0`) und einem eigenen Grenzfall. Der Anker des bestehenden Mutanten „FolgenBereich: Releases → leer“ ist nachgezogen, alle 8 FolgenBereich-Mutanten sind rot. `diff-mutanten`: keine Testzuordnung, abgedeckt durch die Handliste.

**Startbudget** (gzip): Basis origin/main 170,3 KB, PR 170,1 KB (Grenze 190 KB).

## Bilder (Bühne, Handy 375, Ausschnitt Folgenbereich)

Liegen im Zweig `prtext/f157-staffelnamen`: `horizonte-375-hell-start.png`, `horizonte-375-dunkel-start.png` (Startreiter Staffel 3, „Gute Aussichten“), `horizonte-375-hell-staffel2.png`, `horizonte-375-dunkel-staffel2.png` („Die Suche nach Laqua“).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
