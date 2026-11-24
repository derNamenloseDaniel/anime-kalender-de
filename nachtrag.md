## Nachtrag: Auflagen A1–A6 umgesetzt (Kopf 583c89d57e)

Nur Tests, ein Kommentar und die Mutationsliste, keine Verhaltensänderung. Jeder Mutant unten ist an der Basis 317b5a683c mit den alten Tests grün und mit den neuen Tests rot (gleiche Liste, zwei Läufe).

- **A1** `pipeline/check-folgen-staffeln.ts`: der Tastendruck merkt sich `preventDefault`; „Ende unterdrückt das Rollen der Seite, Enter bleibt beim Browser“ und „Pos1 und ← unterdrücken den Browser-Standard, Tab nicht“. Rot gegen „Taste ohne preventDefault“ und „preventDefault auch bei fremder Taste“.
- **A2** `tools/buehne-staffel-reiter.test.ts`, Block „ARIA-Muster Tabs“ an der gerenderten `StaffelAbschnitt`: tabpanel mit Id `f-1-abschnitt`, `aria-labelledby` = Id des gewählten Reiters, Id und `aria-controls` je Reiter, tabIndex genau `[-1,-1,-1,0,-1]`. Rot gegen „ohne role=tabpanel“, „ohne aria-labelledby“, „aria-labelledby immer der erste Reiter“ und „Box ohne id“. Die Mutanten auf der Reiterseite (aria-controls entfernt oder falsch, Reiter-Id entfernt, tabIndex −1/vertauscht/entfernt) waren an der Basis schon rot; sie stehen jetzt fest in der Liste.
- **A3** Gleiche Datei: die Tippfläche wird aus den Klassen berechnet (Stufe × 4 px, `[n rem]` × 16 px) und muss mindestens 44 × 44 px groß sein, an jedem Reiter und an beiden Pfeilen (`after:h/w`). Dazu `check-folgen-staffeln`: Aufklapp-Knopf der Box hat `min-h-11`. Rot gegen sieben Mutanten auf 8 statt 11 bzw. `[3.25rem]`/`12`.
- **A4** `check-folgen-staffeln`, „zwei Titel“: 900501 und 900503 werden zusammen gerendert; es müssen 9 eindeutige Ids sein, und jeder `aria-controls`/`aria-labelledby` muss eine davon treffen. Rot gegen `kennung="folgen"`.
- **A6** `buehne-staffel-reiter.test.ts` „zwei laufende: die erste“, dazu ein Warum-Kommentar an `startReiter`. Rot gegen `findLastIndex`.
- **A5** Diff-Mutationsprobe der Darstellungsdateien (`diff-mutanten --liste` auf folgen-bereich.tsx, staffel-pfeile.ts/.tsx, staffel-reiter.tsx und staffel-abschnitt.tsx, ohne das Bühnen-Mockup, dazu 21 Hand-Mutanten): **vorher 91 von 187 überlebt, jetzt 74 von 187**. Alle 21 Hand-Mutanten sind rot und stehen in `tools/mutationen/staffel-reiter-liste.json`. Die 74 übrigen haben keine Maß- und keine Bedienbedeutung, die ein Test im Mini-DOM sehen könnte:
  - 37: Mess-Hook der Pfeile in `staffel-pfeile.tsx` (Scroll- und Resize-Hörer). Die tatsächliche Wirkung misst `tools/buehne-pfeile-messen.mjs` in Playwright.
  - 15: Einmitten und Pfeil-Klick in `staffel-reiter.tsx` (`zeigeGewaehlten`, `rolleUm`-Verdrahtung). Beides braucht echtes Layout.
  - 5: optische Klassen (Punkt oder Ring der Marke, Akzentstrich, Pfeildrehung).
  - 3 gleichwertige Mutanten (`return undefined`, `useRef()`, `setWahl()`).
  - 14: verschobene Folgenzeilen und Paket-Beschriftung in `folgen-bereich.tsx`. Der Code ist unverändert und war vor dem PR schon so ungetestet.
- **Richtigstellung:** Die PR-Beschreibung sagte: „die Darstellung sichern die Panelbilder“. Das gilt nur für das Aussehen. Tastatur (`preventDefault`, Fokus) und ARIA (Rollen, Ids, Bezüge, tabIndex) sehen die Bilder nicht. Diese Punkte sichern jetzt die Tests oben.

Geprüft: `tools/buehne-staffel-reiter.test.ts` ok, `pipeline/check-folgen-staffeln.ts` ok, `npx tsc --noEmit -p .` ohne Fehler. `design-klassen` ist entfallen, weil keine Klasse berührt wurde.
