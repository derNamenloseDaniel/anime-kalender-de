## Nachbesserung – PR 5286 (feat/akibapass-sprache)

- Sperre je Host: Die Schleife liegt jetzt in `holeAkibapassSeiten` (`pipeline/lib/akibapass-sprache.ts`). Ein 403/429 sperrt nur den Host dieser Adresse, dessen weitere Adressen werden übersprungen, andere Hosts laufen weiter (vorher `break` über den ganzen Lauf). Das Log zählt je Host: geholt, gesperrt, übersprungen.
- Parser: Die fünf echten Textausschnitte (call-of-the-night-de → de, fruits-basket-omu → omu, beelzebub-omu → omu, wolf-s-rain-de mit „Keine“ → de, sword-of-the-stranger-de → de) stehen in `check-akibapass-sprache.ts`. Neu: Test, dass ein 429 auf Host A die Abrufe auf Host B nicht stoppt, A danach übersprungen wird und die Zählung je Host stimmt.
- Geprüft: `check-akibapass-sprache` grün. `tsc --noEmit` lokal nicht aussagekräftig (Sitzung ohne `node_modules`: fehlende Typen `vite/client`, `baseUrl`-Meldung); die PR-Kette prüft es.

Rückblick: gut – Testbarkeit kam durch Herausziehen der Schleife mit eingespeistem Abruf; schlecht – lokales tsc war nicht lauffähig; unerwartet – ein Teil der Nachbesserung (Host-Sperre mit `continue`) stand schon im Zweig, die Zählung fehlte; Vorschlag – nach dem ersten Lauf Zählung je Host prüfen; veraltet – nichts.
