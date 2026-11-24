# Bericht f157-1c-kette-2411 (Bauer, 24.11.2026)

- Neuer Kopf `feat/f157-staffel-reiter`: **11aba78e9a** (a06f4b51 K2, 87dc7b66 K1, 11aba78e Lehre in bauer.md).
- K1 erledigt: ja — `translate('kal.folgen')`, Test n = 1/n = 2, Mutant rot.
- K2 erledigt: ja — gewählter Reiter per Ref statt `querySelector` im Effekt; zweite Ursache dahinter: `ResizeObserver` fehlte in der Prüfung (jetzt wie check-panel-eigenes-werk).
- Grün (Exit 0): check-einzahl-folge (604), check-staffel-anzeige-panel, check-folgen-staffeln, check-panel-eigenes-werk, check-folgenflaggen, check-serienbeleg-folgenbereich, check-leerer-kasten, check-nachlade-vorwaermen, check-panel-cover, check-panel-reihenfolge, check-termin-offen-karte, check-titelwechsel, check-effekt-abhaengigkeiten, buehne-staffel-reiter.test, `tsc --noEmit -p .`.
- Mutationsliste staffel-reiter-liste.json: 68 rot, 0 überlebt; mutationsanker-alle 0 tote Anker; design-klassen, uhr-in-tests, leerzeichen ok.
- Offen (nicht mein Diff): `diff-mutanten` meldet 54 Überlebende aus älteren PR-Commits, 21 in `shared/logic.ts`, 33 in `tools/buehne-pfeile-messen.mjs`.

**Rückblick**
- Gut: Ref-Lösung macht den Effekt mini-DOM-fest, kein Prototyp-Flicken nötig.
- Schlecht: `start-budget` nur am PR-Stand (170,0 KB gzip von 190, `vite build` grün), Basis nicht gegengemessen.
- Unerwartet: hinter K2 lag eine zweite Lücke (`ResizeObserver`); Worktree-Hook verlangt wörtlich `C:/code/_worktrees` auch unter Linux (relativ zu `/` angelegt).
- Vorschlag: `ResizeObserver`/`querySelector` einmal in `tools/mini-dom.ts` statt je Prüfung.
- Veraltet: nichts gefunden.
