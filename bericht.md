# Bericht tmdb-reste (26.11.2026)

- Heute 18 Titel / 133 Dub-Lückenfolgen ohne `tmdbId` (05.11.: 16 / 107); Liste mit Suchbegriffen in pr.md.
- Keine Zuordnung von Hand: kein `TMDB_API_KEY`, themoviedb.org gesperrt, WebSearch ohne TMDB-Seiten; geraten wird nicht.
- Lücke im Sammler bestätigt und geschlossen: Suchfehler wurden als `miss` gespeichert; jetzt `suchfehler: true`, im nächsten Lauf wieder fällig.
- Test `check-tmdb-suchfehler.ts` rot gegen main (Exit 1, 3 Zeilen), grün mit Fix; tsc, umfang, eslint, Nachbartests grün.
- Zweig `fix/tmdb-reste` gepusht, PR nicht angelegt.

Rückblick
- gut: Fixture mit festem `fetchedAt`, Basis-Beleg über die main-Fassung der zwei Dateien.
- schlecht: Zuordnung der Reste unmöglich ohne API-Schlüssel; Auftrag setzte WebSearch auf TMDB-Seiten voraus, die nicht indexiert sind.
- unerwartet: 6 der 18 sind spätere Staffeln; Jahresprüfung gegen das Serienjahr der ersten Staffel verwirft die richtige TMDB-Serie.
- Vorschlag: Lauf mit Schlüssel (`data:tmdb` mit `--limit`) und danach Messung, ob Fortsetzungen mit Jahres-Toleranz gegen Geschwister-Kennung zugeordnet werden sollen.
- veraltet: `folgentitel-quellen.md` Z. 79 (22 Titel ohne `tmdbId`, 24.10.) ist Stand 24.10., kein Fehler.
