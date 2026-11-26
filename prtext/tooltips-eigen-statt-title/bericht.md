# Nachbesserung 3 – PR 5077 (feat/tooltips-eigen-statt-title)

- origin/main (5073) ohne Konflikte eingemergt und gepusht (53056a6d).
- Roter Check „Escape-Stapel“: Ursache gemessen im Browser. Nach dem ersten Escape liegt der Zeiger wieder über dem Quellen-Knopf (mouseenter) und der Fokus kehrt zurück (:focus-visible); beide öffneten eine Blase als oberste Ebene, das zweite Escape schloss sie statt des Panels. Mit geparktem Zeiger war es grün, die Option `begleiter` war nicht die Ursache.
- Fix: `escapeVorKurzem()` in `web/src/lib/escape.ts` (300 ms nach einem Escape); `fokusZeigtBlase`/`mausZeigtBlase` in `tooltip-einzeln.ts` öffnen dann nichts (ui.tsx, reiter-blase.tsx). `pruefeEscapeStapel` gegen dist: 10 Fälle, 0 Abweichungen.
- Touch: `Tooltip` (ui.tsx) schloss schon bei pointerdown außerhalb; die Reiter-Blase nicht – jetzt ebenso (Test in check-reiter-blase.ts).
- title: Zähler stand durch 5073 schon auf 0 Vorkommen; Grenze per `--festschreiben` auf 0.
- Geprüft: check-tooltip-bedienung (neuer Fall „Zeiger nach Escape“), check-reiter-blase, check-escape-hoerer, eslint, tsc --noEmit, check:umfang grün; Mutationsanker reiter-blase nachgezogen.

Rückblick: gut – Messen im Browser statt Raten fand die Ursache in einem Lauf; schlecht – die Vermutung „Fokuswechsel“ allein reichte nicht, der ruhende Zeiger war die zweite Quelle; unerwartet – der Test `ansicht-escape-stapel` klickt und lässt den Zeiger stehen, genau wie ein Nutzer; Vorschlag – Zeitfenster-Wächter ist heuristisch, ein Flag „Fenster eben geschlossen“ wäre präziser; veraltet – nichts.
