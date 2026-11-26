# Bericht kalender-n3-tv-sendetage (26.11.2026)

- Ursache: `belegeHandTermine` (`pipeline/lib/tv-hand-belege.ts`) fand für One Piece keine belegte Sichtungsreihe, weil ältere Sendungen außerhalb der Folgenliste die Nummern sperrten.
- Fix: Fallback auf Sichtungen ab Start des Handtermins; Zweig `fix/kalender-n3-tv-sendetage`, ein Commit, kein PR angelegt.
- Probe an echten Daten: One Piece 97 → 88 ≈-Termine (Folgen 780–789 belegt, 05.–20.11.).
- Rest bleibt ≈, bis EPG-Tage nach 14.11. eingelesen sind (Stand `data/tv-programm.json`); das liefert der nächste Lauf.
- Test rot gegen main (Exit 1), grün mit Fix (Exit 0), drei Mutanten alle rot; tsc, check:umfang, eslint grün.
- `shared/logic.ts` nicht angefasst.

## Rückblick
- **gut:** Der Mechanismus (`belegeHandTermine`) existierte schon; der Fix ist ein Fallback, 23 Zeilen.
- **schlecht:** Die Inventur nannte „observed per EPG-Lauf setzen“ als Vermutung; wirklich fehlte die Nummernzuordnung. Der Rest hängt am Datenstand von `tv-programm.json`.
- **unerwartet:** Die Zuordnung 780–789 deckt sich exakt mit den `skipDates` (16.11. = 786, 18.11. = 787).
- **Vorschlag:** Wächter auf den echten Datensatz: Hand-TV-Release mit Sichtungen im Bereich, aber ohne `observed`.
- **veraltet:** Inventur-Zeile N3 („EPG-Lauf für Hand-Releases“) trifft nicht zu; Ursache war die Zuordnung, nicht der Lauf.
