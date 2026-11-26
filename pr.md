<!-- titel: feat(wache): zusammengelegte Staffeln mit eigener Ankündigung melden (F157, Teil B, nur Wächter) -->

Auftrag: mighty-nein-staffeln

F157, Teil B (Daniel, 24.11.2026: „jede Staffel ist ein eigener Titel mit Reiter“). **Dieser PR liefert nur den Wächter.** Die Aktivierung für Horizonte und The Mighty Nein steht aus, Begründung unten.

## Stand vor dem Bau (26.11.2026)

- PR 5079 (Teil A, Code zurück, ohne Wirkung) und PR 5072 (Folgen vor dem ersten Termin zählen) sind gemergt; PR 4897 (Horizonte als ein Titel) ist geschlossen und gemergt.
- Teil B läuft nirgends: kein offener PR, kein Zweig zu Mighty Nein außer `bilder/mighty-nein-folgen-vor-start` (nur Bilder zu PR 5072), `git log -30 -- data/ pipeline/` ohne Aktivierung. Horizonte steht noch in der Ein-Titel-Form (kein `basis` in der Horizonte-Yaml).

## Was dieser PR tut

`zusammengelegteStaffeln` (`pipeline/lib/staffel-ohne-seite.ts`): Ein Titel mit belegten Staffelgrenzen, aber ohne `basis` (Ein-Titel-Form), führt jede Staffel nur als Abschnitt. Ein Release, dessen erste Folge in einer späteren Staffel liegt und die noch kommt (Termin ab heute) oder läuft (`offen`), ist ein Fund. Die Folgenzahl des Titels braucht die Regel nicht, die Yaml-Grenzen sagen, wo die Staffel beginnt. Mit `basis` (jede Staffel ein Titel) gibt es keinen Fund.

`pipeline/check-staffel-ohne-seite-bestand.ts` fährt beide Regeln (`staffelnOhneSeite` für Titel ohne Grenzen, die neue für Titel mit Grenzen). `BEKANNT` trägt jetzt zwei Fälle mit Grund; ein erledigter Eintrag und ein neuer Fall sind weiter rot.

## Klasse, gezählt (Werke mit angekündigter Folgestaffel ohne eigene Seite, `public/data`, 26.11.2026)

| | vorher (Wächter auf main) | nachher (dieser PR) |
|---|---|---|
| Funde | 1 (The Mighty Nein, Release `the-mighty-nein-s2-primevideo`) | 2 (dazu Pokémon Horizonte Staffel 4, `pokemon-horizonte-s4-rtlplus`, ab Folge 137) |
| davon in `BEKANNT` | 1 | 2 |

Die Klasse wurde nicht kleiner, sondern sichtbar größer: Horizonte war durch die pauschale Ausnahme „hat Staffelgrenzen“ unsichtbar. Gegenprobe über alle künftigen Releases mit Folge > 1 oder „Staffel/Season N“ (N > 1) im Namen: 18 Treffer, alle Staffel-Titel mit eigenem Release (Discs, Boxen) außer Mighty Nein und `black-clover-s2-crunchyroll` (eigener Titel 195604, durchlaufende Zählung); Pokémon-Hauptserie (527 ff.) hat keinen Fund.

## Basis-Beleg und Mutationen

- Neue Fälle in `pipeline/check-staffel-ohne-seite.ts` (18 Zusicherungen für die neue Regel) gegen die main-Fassung von `staffel-ohne-seite.ts`: rot, Exit 1, SyntaxError: der Export `zusammengelegteStaffeln` fehlt. Mit dem Code: grün, Exit 0 („Staffel ohne Seite: 0 Fehler“).
- die Diff-Mutantenprobe: erster Lauf 35 Mutanten, 10 überlebt (Name-Rückfälle, Gleichheit am Tag, Klammerung der Folgen- und Tagesprüfung, Felder des Funds, ein überflüssiger Längenriegel). Fälle ergänzt, den Riegel gestrichen. Zweiter Lauf 31 Mutanten, 2 überlebt (Prüfung auf fehlenden Tag, Name aus der Kennung). Dritter Lauf **31 Mutanten, 0 überlebt**.
- `npx tsc --noEmit -p .` grün; `pipeline/check-staffel-ohne-seite-bestand.ts` am Bestand grün (725 Titel, 926 Releases, 2 Funde, beide in `BEKANNT`).
- Neue Prüfungen waren nicht nötig: `check-staffel-ohne-seite.ts` steht in der Prüfliste für check:logic, der Bestandsprüfer in der Bestandsliste.

## Was fehlt, und warum (Grenzen der Cloud)

Der Datenbau bricht hier ab („data/cache/ ist leer“, geprüft); ein Schnitt, der Kennungen, Kalender-UIDs (`ev.id`), `kennungen.json` (`zuAk`), Umleitungsdatei und Folgen-Dateien ändert, ließe sich also nicht am gebauten Datensatz belegen, und ein Fehler träfe den Bestandsbau auf `main` (Alarmgrenze 6 h).

- **Horizonte aktivieren:** `basis: 4` und `kennung: 7000001–7000003` in der Horizonte-Yaml, `zuAk` an 26469–26471 und die drei Paare der Umleitungsdatei entfernen, `staffelzaehlung` zu einer Liste von Fenstern, Wächter `check-ak-umleitung-versatz` und `staffel-altmeldungen` auf beide Formen. Der Plan steht im Bericht staffel-titel-plan (Ordner berichte); der Code dafür ist seit PR 5079 zurück.
- **The Mighty Nein:** ein Cartoon (TMDB -219080). `schreibeCartoons` hat keinen Staffel-Schnitt; er bräuchte eine Staffel-Yaml für Cartoons (Form aus dem lokalen Zweig `wip/cartoon-staffel-schnitt-lokal`, in der Cloud nicht vorhanden) und einen eigenen Bauschritt samt Riegel. Das ist neuer Code mit Datenwirkung, nicht in der Cloud prüfbar.
- Wenn beides aktiviert ist, entfallen beide `BEKANNT`-Einträge; die Ratsche meldet sie dann als erledigt (rot), die Liste darf nur sinken.

## Annahmen

- „Zusammengelegt“ heißt hier: Titel in einer `*-staffeln.yaml` ohne `basis`. Die Pokémon-Hauptserie ist eingeschlossen, hat heute aber keinen Fund.
- Eine laufende offene Staffel (`offen`) zählt als Fund auch bei einem Termin in der Vergangenheit, weil ihre Seite weiter fehlt.
- Keine sichtbare Änderung, daher keine Patch Note.
