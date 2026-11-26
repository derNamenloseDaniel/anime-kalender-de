# Bericht fsk-filmpartner

- Zweig `fix/fsk-filmpartner` (von `origin/fix/fsk-abdeckung`), 3 Commits: Test rot → Fix → Test-Nachtrag (Grenze, Rückfall). Baut auf: fix/fsk-abdeckung (zuerst mergen).
- Ursache: Die zwei Partner (10014868, 10019566) sind die aniSearch-Zeilen derselben Werke; sie fallen im Bau weg, weil der AniList-Titel ihre Seite trägt (`vergebeneSeiten`), zählten aber in `mehrdeutigeFilmzuordnungen` mit.
- Fix: Partner, deren aniSearch-Seite ein anderer Titel der Gruppe trägt, zählen nicht (aniSearch-Brücke). Bau und Rückfall `ladeGeteilteFilme` verdrahtet.
- Wirkung: Spycies (FSK 6) und Rohirrim (FSK 12) behalten TMDB-Angaben ab dem nächsten Bestandsbau; Akito, Kitaro, Digimon usw. bleiben verworfen.
- Klasse: 8 Filmgruppen gemessen, nur diese zwei mit Partner außerhalb des Bestands. Staffel 0, Reihenprüfung, Filmgruppen-Ratsche, JustWatch-Kennungen geprüft: schon abgesichert oder nicht betroffen (Begründung im PR).
- Wächter `pipeline/check-tmdb-film-zwilling.ts` (10 Zusicherungen, in check-logic-liste). Mutanten 30, 1 überlebt (von `check-tmdb-geteilt-plakat-bau` gefangen, von Hand belegt).
- Offen: Bauvergleich am echten Bau (kein Cache in der Cloud) — nächster Bestandsbau zeigt 4 verworfene TMDB-Zuordnungen weniger.

## Rückblick
- Gut: Messung über alle Filmgruppen zeigte sofort, dass die Klasse genau die Seitenzwillinge sind.
- Schlecht: Erster Testlauf ignorierte `AK_ROOT`, weil ein statischer Import `ROOT` vorher festlegte.
- Unerwartet: „Bestand“ ist in `ladeQuellen()` nicht bekannt (Kreis über den Plakatfilter in Phase 02); die Brücke ist der frühe Stellvertreter.
- Vorschlag: In `bauer.md` bei Wegwerf-Wurzeln ergänzen: Tests mit `AK_ROOT` importieren jedes Pipeline-Modul dynamisch nach dem Setzen.
