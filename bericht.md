# Bericht warnung-bekannt-bis

- Vorher: jede Bestandsbau-Warnung „Mängel Stillstand“ einzeln per `--erledigt` abnehmen. Nachher: Eintrag in `tools/bekannte-warnungen.json` (bis 2026-11-30), die Wache nimmt selbst ab oder zeigt `bekannt bis …`.
- Der Warnungstext nannte die Art nicht, das Muster wäre zu breit gewesen. Jetzt hängen die Artnamen (ohne Zahlen) am Text; Muster nur auf „— gestiegen: sprecher“ (Ist-Stand mit check-qualitaet geprüft).
- Tests, Mutationsprobe (4 Mutanten einzeln rot) und tsc grün. `laeufe-abruf.test.mjs` hängt in dieser Sandbox auch auf main; Verdrahtung nur per Syntaxprüfung.
- Gut: reine Funktion `wendeBekannteAn`, leicht testbar. Schlecht: Einbau in `laeufePruefen` ohne eigenen Test.
- Unerwartet: erst der erste Bestandsbau nach dem Merge schreibt die Namen in die Notiz; ältere Warnungen ohne Namen passen nicht und bleiben einmal sichtbar (von Hand abnehmen).
- Vorschlag: nach 30.11. Eintrag entfernen oder verlängern (die Wache meldet `abgelaufen`).
