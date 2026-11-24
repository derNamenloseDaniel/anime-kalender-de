# Bericht f157-1c-nachbesserung-2411

- Kopf `feat/f157-staffel-reiter`: **583c89d57e** (ein Commit auf 317b5a683c, normal gepusht)
- A1 ja · A2 ja · A3 ja (Reiter, Pfeile, Aufklapp-Knopf) · A4 ja · A5 ja · A6 ja (Test und Warum-Kommentar, keine Verhaltensänderung) · Lehre in pruef-technik ja
- Tests: buehne-staffel-reiter ok, check-folgen-staffeln ok, `tsc --noEmit -p .` ok; design-klassen entfällt, weil keine Klasse berührt wurde
- Mutationsprobe Darstellung (166 diff-mutanten + 21 Hand-Mutanten): vorher 91 von 187 überlebt, jetzt 74 von 187. Alle 21 Hand-Mutanten sind rot; an der Basis waren davon 15 grün.
- Die 74 Überlebenden: Mess-Hook der Pfeile, Einmitten und Pfeil-Klick (alles braucht Layout, Playwright-Messung vorhanden), optische Klassen, 3 gleichwertige Mutanten und 14 verschobene alte Folgenzeilen
- Abweichung: Die Reiterseite von A2 (aria-controls, Id, tabIndex) war mit meinen Mutantenformen schon an der Basis rot. Neu sind die Box-Seite und die Paarprüfung Id ↔ Bezug.

## Rückblick
- Gut: Ein Lauf mit Basis- und neuem Stand auf derselben Liste (Kopien per `git archive`) belegt Rot und Grün in einem Schritt.
- Schlecht: Die Hooks sperren `git worktree` außerhalb von `C:/code/_worktrees` und `python -` per Heredoc. In der Linux-Cloud gibt es diesen Pfad nicht, deshalb `git archive` in den Scratchpad.
- Unerwartet: `diff-mutanten` erzeugt für `staffel-abschnitt.tsx` nur einen Mutanten, weil es keine JSX-Attribute mutiert. Die Zahl 259 des Prüfers ist mit dieser Liste nicht nachzustellen; er hat das Mockup oder Hand-Mutanten mitgezählt.
- Vorschlag: `diff-mutanten` um die Klasse „JSX-Attribut entfernt“ erweitern (role, aria-*, id, tabIndex).
- Veraltet: Die Worktree-Sperre (Hook) kennt keinen Cloud-Pfad.
