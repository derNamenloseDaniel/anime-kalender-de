<!-- titel: feat(pipeline): Joyn-Lücke meldet Titel und JustWatch-Beleg -->

Auftrag: check-bestand-jw-joyn

## Was

Der gewünschte Wächter „JustWatch nennt Joyn, der Titel hat keinen Joyn-Weg“ besteht schon seit 04.11.2026: `pipeline/check-joyn-luecke-bestand.ts` (in der Bestandsliste von `check:bestand`, Regel in `pipeline/lib/joyn-luecke.ts`, Ausnahmeliste mit Grund). Kein zweiter Wächter; dieser PR ergänzt nur, was fehlte:

- Jede offene Lücke meldet AniList-ID (Cartoons negativ), Titel und die Joyn-Adresse aus JustWatch (`beschreibeLuecke`), alle statt der ersten zehn.
- Commit 1 ist reiner Umbau (`joynBeleg` aus `joynLuecken` herausgelöst; Ausgabe beider Prüfungen vorher/nachher gleich), Commit 2 die Verhaltensänderung, Commit 3 ein Testfall.

## Beleg

- Messung am committeten Bestand (origin/main c7605613): 0 Lücken. 101 Titel haben JustWatch-Joyn mit Adresse, alle 101 tragen einen Joyn-Weg (Gegenprobe: keiner gemeldet). Joyn-Angebote nur in `staffeln[].angebote`: 0. Laufzeit 2,3 s; bleibt in `check:bestand` (liest den gebauten Bestand, gehört laut Bestandsliste nicht in `check:logic`).
- Probe: Joyn-Weg von Titel 15 in einer Kopie entfernt → `⚠ WARNUNG Joyn-Lücke: Titel 15 „Eyeshield 21“ — JustWatch: https://www.joyn.de/serien/eyeshield-21, bei uns kein Joyn-Weg …`.
- `pipeline/check-joyn-luecke.ts`: neue Fälle gegen die Basis rot (TypeError, `beschreibeLuecke` fehlt), nachher grün; Laufprüfung `check-joyn-luecke-lauf` grün; `npx tsc --noEmit -p .` grün.
- Mutationsanker in `tools/mutationen/joyn-luecke.json` nachgezogen (je im Commit der Codeänderung). Läufer: 0 von 30 überlebt.

| Mutationsprobe | Ergebnis |
|---|---|
| Diff-Mutanten | 18 Mutanten, 0 überlebt, 0 unbrauchbar |
| Mutationsläufer über `tools/mutationen/joyn-luecke.json` | 19 rot, 0 überlebt, 9 ohne Testbefehl (bestehend) |

Annahme: Warnung, kein harter Fehler (wie bisher; eine tote Joyn-Adresse kann jederzeit fallen, Rot stoppte den Bestandsbau).

## Live-Beleg

entfällt (interne Prüfung).

## Patch Notes

entfällt (interne Änderung).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zrVBv91YEYqqPQZRcY
