# Bericht sprecher-bauanschluss

Ergebnis: PR #5248 (Zweig `fix/sprecher-bauanschluss`) — Wikipedia-Sprecherliste an den Bau angeschlossen: Sammler `pipeline/fetch-wikipedia-sprecher.ts` → `data/wikipedia-sprecher.json` → Bauphase `pipeline/bau/sprecher-wikipedia.ts` → `voices/<id>.json` mit Quelle; ≈ + Grund an der Liste, vermutete Besetzung nicht im Sprecher-Index. Basis `fix/maengel-sprecher-wikipedia` ist seit 27.11. als #5158 gemergt.
Dieser Lauf (Kopf 51293c7b): Kette am alten Kopf rot, weil sechs Kulissen-Prüfungen ohne Handliste mit ENOENT abbrachen; Bauphase liest die fehlende Handliste jetzt als „keine Ziele“ mit Warnzeile. Test rot (Exit 1) → grün; die sechs Prüfungen lokal grün; tsc grün; 13 Mutanten, 12 rot, 1 gleichwertig.
Hochrechnung (unverändert): 81 von 356 offenen sprecher-Mängeln schließen beim nächsten Bestandsbau (4 belegt, 77 mit ≈), 275 bleiben.
Offen: Kette am neuen Kopf abwarten; Kommentar „Noch ohne Bau-Anschluss“ in die Handliste wikipedia-sprecher-seiten (Auftrag sprecher-wikipedia-2). Prozesse: keine übrig.
Schätzung vs. Ist: 30 min / rund 30 min.

Rückblick
- Gut: die drei roten Jobs hatten eine gemeinsame Ursache, aus den Logs in einem grep sichtbar.
- Schlecht: der erste Lauf fuhr nur die eigenen Tests, nicht die Bau-Kulissen anderer Prüfungen.
- Unerwartet: Basis-Zweig war schon gemergt, der Auftrag nannte ihn noch als offen.
- Vorschlag: `diff-mutanten`/Bauer-Ablauf um „Bauphase berührt → Kulissen-Prüfungen (`bauePhasenfolge`-Nutzer) mitfahren“ ergänzen.
