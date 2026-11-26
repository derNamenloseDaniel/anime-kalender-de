# Bericht: nein-aufheben-streaming

- Zweig `fix/nein-aufheben-streaming`, 4 Commits, gepusht; PR-Text auf `prtext/nein-aufheben-streaming`. Kein PR eröffnet (kein `gh pr`), nie gemergt.
- `ueberholteNeins` gilt jetzt für jeden sicheren Termin; ein Nein mit echter Titeladresse und `dub: false` bleiben.
- Aufgehobene Neins am Bestand: 2 → 5 (Kuroko 102836, Spy × Family 140960 Disney+, Overgeared 212888 Crunchyroll kommen dazu).
- Mängelzahlen offline unverändert: `erstausgabe-ohne-weg` 168 → 168, `erschienen-ohne-weg` 0 → 0, `kein-weg` 196 → 196; die drei neuen Titel haben im Datensatz schon einen Weg.
- Basis rot (Exit 1, 3 Fehlzeilen) → grün; Mutationen 37, 0 überlebt; tsc, check-handbelege, Anker-Test grün.
- Patch-Notes-Eintrag `anbieter-trotz-altem-nein.yaml`. Rest: echte Wirkung erst nach Bestandsbau (Cloud ohne data/cache).

Rückblick
- gut: Mutationstabelle fand die Lücke „Termin genau heute“, ein Test schließt sie.
- schlecht: Ein Wächter-Lauf-Fall „Nein mit Adresse“ ließ sich nicht sinnvoll bauen (Weg trägt dort keine Adresse), nur im Einheitstest abgedeckt.
- unerwartet: Alle fünf Fälle haben schon Wege im Datensatz; offline messbarer Gewinn 0.
- Vorschlag: Nach dem nächsten Bestandsbau `weg-ohne-adresse` und `erstausgabe-ohne-weg` neu zählen.
- veraltet: Kommentar „Nur mit kanal“ in `ueberholteNeins` angepasst; `docs/wissen/maengel.md` Abschnitt „Überholtes Prime-Nein“ nachgeführt.
