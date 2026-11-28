## Nachbesserung – PR 5286 (feat/akibapass-sprache)

- Sperre je Host: Die Schleife liegt jetzt in `holeAkibapassSeiten` (`pipeline/lib/akibapass-sprache.ts`). Ein 403/429 sperrt nur den Host dieser Adresse, dessen weitere Adressen werden übersprungen, andere Hosts laufen weiter (vorher `break` über den ganzen Lauf). Das Log zählt je Host: geholt, gesperrt, übersprungen.
- Parser: Die fünf echten Textausschnitte (call-of-the-night-de → de, fruits-basket-omu → omu, beelzebub-omu → omu, wolf-s-rain-de mit „Keine“ → de, sword-of-the-stranger-de → de) stehen in `check-akibapass-sprache.ts`. Neu: Test, dass ein 429 auf Host A die Abrufe auf Host B nicht stoppt, A danach übersprungen wird und die Zählung je Host stimmt.
- Geprüft: `check-akibapass-sprache` grün. `tsc --noEmit` lokal nicht aussagekräftig (Sitzung ohne `node_modules`: fehlende Typen `vite/client`, `baseUrl`-Meldung); die PR-Kette prüft es.

Rückblick: gut – Testbarkeit kam durch Herausziehen der Schleife mit eingespeistem Abruf; schlecht – lokales tsc war nicht lauffähig; unerwartet – ein Teil der Nachbesserung (Host-Sperre mit `continue`) stand schon im Zweig, die Zählung fehlte; Vorschlag – nach dem ersten Lauf Zählung je Host prüfen; veraltet – nichts.

## Runde 1 – Vorgaben des Dirigenten (Kommentar vom 28.11.), je Punkt eine Zeile

1. Kette: Kopf nach diesem Push abwarten; abgebrochene Jobs einmal neu starten (Stand siehe PR).
2. Mutation Host-Sperre: `pipeline/check-akibapass-sprache.ts`; Sperre global → 4 rote Zeilen („429 auf Host A: Host B wird weiter abgerufen“, „Zählung je Host“, robots 5xx/Timeout „anderer Host läuft weiter“); `z.gesperrt++` entfernt → 1 rote Zeile („weitere Adressen von A übersprungen“); robots-Fehler ohne Host-Ruhe → 2 rote Zeilen („Fehler wird je Host nur einmal abgerufen“); Parser „erster Treffer“ → 1 rote Zeile („abweichendes ‚Sprache:‘ …“). Alle zurückgesetzt, Wächter grün.
3. robots: `robotsAusAntwort` (404/410 → alles erlaubt, sonst Fehler) und `holeAkibapassSeiten` (Fehler → Host ruht, Warnzeile, Ergebnis je Host einmal abgerufen); Tests 404, 5xx, Timeout in `pipeline/check-akibapass-sprache.ts`.
4. Fixture: echter Ausschnitt COTN S1 (Fundstelle im Test: URL, curl, 28.11.2026 11:31) plus Negativfälle; `spracheAusSeite` urteilt nur, wenn alle „Sprache:“-Treffer gleich lauten und jeder „/ Untertitel“ trägt (`pipeline/lib/akibapass-sprache.ts`).
5. Folgenzahl: `folgenAusSeite` liest „Enthält alle N Episoden“ (im Sammler gespeichert als `episoden`); `setzeAkibapassSprache` nimmt sie, sonst `episodes`; fehlt beides oder weichen beide ab, bleibt der Weg offen und die Zählzeile im Bau (`09-5-weitere-quellen.ts`) nennt die Zahl. Titel selbst trägt kein `episodeCountAssumed` (das gehört zum Termin).
6. Timeout: `AbortSignal.timeout(15000)` an Seiten- und robots-Abruf (`pipeline/fetch-akibapass-sprache.ts`).
