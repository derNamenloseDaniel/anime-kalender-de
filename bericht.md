# Bericht sammler-502-geduld

- Vorher: 6 Merge-Versuche, 3–10 s Pause; der 502 vom 25.11. (≥ 16:07:08–16:09:00 UTC, Log 45650281762) war damit nicht abgedeckt. Lauf 45650286140 nicht gelesen.
- Nachher: `pr_mergen` — bei 5xx Pausen 15/30/60/120 s und Zustandsabfrage (MERGED) vor jedem Versuch; übrige Ablehnungen unverändert kurz.
- Tests: quellen-pr.test.mjs (+9 Merge-Fälle, +4 Aktion einreichen), Wächter-Test, tsc, eslint, Anker grün; beide Mutanten rot.
- Gut: Log war in der Cloud lesbar; Mutanten zeigten klare Rote.
- Schlecht: Funktion vor dem Rot-Zweig brach den Prüfschritt-Wächter (Textreihenfolge) — erst am Wächter-Test gemerkt, Anker angepasst.
- Unerwartet: GitHub meldete meist „GraphQL: Something went wrong while executing your query“ ohne „502“; die Erkennung musste das mitnehmen.
- Vorschlag: `gh pr create` (3 Versuche, 5–15 s) bekommt dieselbe 5xx-Geduld, wenn es wieder auftritt; hier nicht angefasst.
- Veraltet: nichts. Nicht gefahren: `check:vor-commit`; kein PR angelegt (Dirigent).
