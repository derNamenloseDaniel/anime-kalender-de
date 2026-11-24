## Nachtrag (Nachbesserung Daniels Nachträge 20:21–20:25, Kopf 8ed6c66e)

Commits: 331e4e30 (Merge main), 88ee40dc (Verhalten), 700cbe55 (nur Lehre in `.claude/agents/bauer.md`), 8ed6c66e (Patch Note auf 8 Wörter gekürzt).

Zweig mit origin/main gemergt (331e4e30, PR 4907 und 4911). Konflikt in `web/buehne/mockups/staffel-abschnitt.tsx` (notiz): beide Seiten behalten, also Reihen-Reiter und die sn-Namen der Folgen-Reiter.

Mockup-Änderung freigegeben: „wie beschrieben die rote box auch mit reitern versehen, und dafür die aus der reihe entfernen“ (Daniel, 24.11.2026 20:21, über den Dirigenten)

### 20:21

- „aktuelle implementation so lassen“: Die Hauptserie und der Sammeltitel bleiben wie gebaut (`ausHauptstaffeln`, `ausSammeltitel` in `reihen-reiter-liste.ts` unverändert). Die Folgen-Reiter bleiben auch. Bild `pokemon-sammeltitel`, `pokemon-reisen`, `pokemon-horizonte`: Die Reiterleiste ist links und rechts gleich.
- „wie beschrieben die rote box auch mit reitern versehen“: Jeder Titel einer Kategorie mit mindestens zwei Titeln hat jetzt Reiter, auch Filme und Specials (`reihenReiterVon(…, gruppen)`, neue `ausGruppe` in `reihen-reiter-liste.ts:30`). Bild `pokemon-film`: Vorher hatte der Film keine Leiste, jetzt stehen dort die Reiter 1–24, gewählt ist 16 (Kyurem).
- „und dafür die aus der reihe entfernen“: `ReihenListe` liest die Reiter aus `ReihenReiterKontext` (`reihen-liste.tsx:10`) und gibt sie `reihenOrdnung` als `ohne` weiter (`reihen-inhalt.tsx:94`). Die Titel fehlen dann in ihrer Gruppe und in der Zahl am Schalter „ohne Synchro“ (`reihen-inhalt.tsx:144`, `reihen-uebersicht.tsx:64`). Bleibt kein Teil übrig, entfällt die Karte (`reihen-liste.tsx:15`). Im Panel des Films zeigt die Reihe nur noch die Gruppen Hauptserie 12, Eigene Serien 10 und Specials & OVAs 23. Die Filme fehlen. Bei Horizonte 4 zeigt Eigene Serien 6 statt 10.
- „für pokemon kommen da nur 1-25 (… als eigene staffel oder zusammengefasst zB 1-5) und nicht alle titel aus reihenbox“: Die Hauptserie hat 12 Reiter von „1–5“ bis „25“ und keinen Film. Die Prüfung zeigt „Hauptserie zeigt nur Hauptserie, kein Film“.
- „filme, ovas etc bleiben einzeln, wir sollten je nach reihen kategorie die reiter dort einstellen“: Die Kategorien sind die Gruppen der Reihenliste (`reihenGruppen`: Hauptserie, Neuverfilmung, Eigene Serien, Filme, Specials & OVAs). Gebildet werden sie im Panel mit `reihenOrdnung(reihenTeile, reihenName, t).gruppen` (`DetailPanel.tsx:95`). Es gibt keine neue Datenquelle, je Titel einen Reiter. Ein Film zeigt nur Filme, ein Special nur Specials & OVAs.
- „schnell wechseln … direkt an rote box, ohne zu reihe scrollen zu müssen“: Ein Klick geht über denselben Weg `wechsleZu` wie die Reihenliste.

### 20:24

- „bei allen reiter bezeichnern sollte die kurzform verwendet werden“: In Filmen, Specials und eigenen Serien trägt jeder Reiter die laufende Nummer in der Reihenfolge der Reihenliste (`label: String(i + 1)`). Staffeln tragen weiter Nummer oder Bereich. Die Prüfung über alle Bühnenfälle verlangt bei jedem Reiter `^(\d+(–\d+)?( - Teil \d+)?|Teil \d+)$`.
- „Reiter: 1,2,3,4,... Für: Mewtu gegen Mew, Pokémon 2, Im Bann der Icognito, Pokémon 4“: Die Film-Reiter 1–4 sind genau 484, 981, 982 und 983, so wie in der Prüfung. Teile hinter „ohne Synchro“ bekommen dort keinen Reiter (Toho Cinemas x Pokémon GO, Wild Card 2027). Sonst verschöbe sich die Nummer. Sie bleiben über den Schalter der Reihenliste erreichbar.

### 20:25

- „on hover auf die reiter sollte tooltip den kompletten titel anzeigen“: `title={r.name}` (`reihen-reiter.tsx:63`). `aria-label` trägt ebenfalls den vollen Titel (`:62`): bei Staffeln „Staffel 2: …“, sonst nur den Titel, ohne das Wort „Staffel“. Die Tablist heißt jetzt „Titel der Reihe“.

### Bildvergleich (links Kopf d0f6a37cbc, rechts 88ee40dc; Nachher A, Stichtag 24.11. 10:00; Handy 375 / Desktop 512 × hell / dunkel)

![f157-reihen-reiter-nachtrag-pokemon-film.png](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/bilder/f157-reihen-reiter/f157-reihen-reiter-nachtrag-pokemon-film.png)
![f157-reihen-reiter-nachtrag-pokemon-sammeltitel.png](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/bilder/f157-reihen-reiter/f157-reihen-reiter-nachtrag-pokemon-sammeltitel.png)
![f157-reihen-reiter-nachtrag-pokemon-reisen.png](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/bilder/f157-reihen-reiter/f157-reihen-reiter-nachtrag-pokemon-reisen.png)
![f157-reihen-reiter-nachtrag-pokemon-horizonte.png](https://raw.githubusercontent.com/derNamenloseDaniel/anime-kalender-de/bilder/f157-reihen-reiter/f157-reihen-reiter-nachtrag-pokemon-horizonte.png)

Den Film-Fall `pokemon-film` hatte die Bühne schon (`fall-optionen.ts`). Er gehört jetzt zum Mockup, neu eingefroren wurde nichts. Für das linke Bild wurde er nur im Export von d0f6a37cbc dazugeschrieben. In Sammeltitel, Reisen und Horizonte ist die Leiste in allen 12 Zellen gleich. Bei Horizonte unterscheiden sich die RTL+-Zeile („Staffel 1 Fg. 1 …“) und der Bereich darunter (512 hell). Das kommt aus main (PR 4907, im Merge 331e4e30), nicht aus diesem Nachtrag. Die Reihen-Karte liegt unterhalb des Bildausschnitts.

### Prüfungen

- `npx tsc --noEmit -p .` Exit 0, eslint der berührten Dateien grün.
- `npx tsx pipeline/check-reihen-reiter.ts` ok. Neu geprüft werden: Kategorien (der Film zeigt die Filme 1..n, die Hauptserie nur die Hauptserie, ein Special nur Specials), Kurzform, Tooltip und aria-label im echten Panel, „kein Titel in Reiter und Reihenliste, keiner unerreichbar“ für jedes Titel-Reihe-Paar aller Bühnenfälle, die Gruppenzahlen der Reihenliste im Panel (Film und Horizonte), der Schalter in Spur und Übersicht, die leere Reihen-Karte und ein Titel ohne Reihe ohne Leiste.
- Mutationen `tools/mutationen/reihen-reiter.json`: 16 neue Fälle, 2 nachgeführt. Ergebnis 45 rot, 0 überlebt. Der alte Mutant „leere Leiste“ überlebte zuerst, weil sein Gegenfall „Film ohne Reiter“ entfallen war. Jetzt fängt ihn „Titel ohne Reihe“.
- Importeure (`grep -l` in `pipeline/check-*.ts`, `tools/*.test.*`), alle mit Exit 0: check-leerer-kasten, -nachlade-vorwaermen, -panel-cover, -panel-eigenes-werk, -panel-reihenfolge, -reihen-spur, -reihen-uebersicht, -staffel-anzeige-panel, -termin-offen-karte, -titelwechsel, -disc-bereich, -folgen-staffeln, -serienbeleg-folgenbereich, -hinweis-anzeige.
- Bühne: `buehne:bauen` grün, `buehne-bilder --mockup staffel-abschnitt` grün (4 Fälle × 8 Bilder). `buehne:messen` voll (alle 6 Werkzeuge) mit Exit 0: 477 Einheiten ok (vorher 473, dazu 4 neue Zellen aus `pokemon-film`), `buehne-panel-pruefen` 8 Fälle ok.
- Startbudget: 170.7 KB gzip von 190.0, gleich wie die Basis 331e4e30 (170.7). Die +0.6 KB gegenüber dem ersten Bericht kommen aus main.
- Patch Note `data/patchnotes/f157-reihen-reiter.yaml` neu: „Zwischen Staffeln und Filmen einer Reihe direkt wechseln / Ein Reiter je Titel, der volle Name beim Darüberfahren“. Doku `docs/wissen/datensatz.md` „Reihen-Reiter am Antwortkasten“ nachgeführt.
