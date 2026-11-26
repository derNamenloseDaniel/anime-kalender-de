# Bericht: fix/kasten-heute-ohne-uhrzeit

- Kopfzeile am Starttag lautet jetzt „Alle N Folgen da“, Zusatz „genaue Uhrzeit unbekannt“ ist aus jeder Kopfzeile weg (ein Text in `i18n-antwort.ts`, Schlüssel `antwort.heuteDa`).
- Tests: `check-katalogstart-kasten` (11 Fälle) und `check-katalogstart-tag` grün; Mutationsprobe (Zusatz zurück) wird rot; `tsc --noEmit -p .` und `check:umfang` Exit 0. Patchnote ergänzt.
- Klasse: nur diese eine Kopfzeile trug einen Uhrzeit-Zusatz; verwandte „noch offen/nicht bekannt“-Texte stehen in pr.md.
- „Ab heute“ bei unbelegtem Start ist im Code nicht erreichbar (`fertig` heißt: erschienen ab 00:00); als eigener Auftrag vermerkt.
- Fool Night ist vom Zweig `fix/kalender-sprache-offen` abgedeckt (dub:true an Termin-Adresse); `antwort-regeln.ts` unberührt.

Rückblick
- gut: Ein Text, kein Logikeingriff, Merge-Konflikte ausgeschlossen.
- schlecht: Lokal nicht `check:vor-commit`, nur berührte Tests (Regel F40); Kette entscheidet.
- unerwartet: Der Auftrag setzte einen Zustand „unbelegt am Starttag“ voraus, den der Code nicht kennt.
- Vorschlag: Prüfer-Frage „Was fehlt dem Besucher ohne diesen Satz?“ für jede neue Kopfzeile; optional „ab heute“ aus Beobachtung ableiten.
- veraltet: Kommentare zu „genaue Uhrzeit unbekannt“ in `logic.ts`, `antwort-typ.ts`, `check-katalogstart-tag.ts` — nachgeführt.
