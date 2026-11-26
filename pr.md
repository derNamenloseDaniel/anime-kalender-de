<!-- titel: feat(og): Vorschaubild der Startseite zeigt das wichtigste Release des Tages -->
## Was ändert sich

Der Link `anime-kalender.de` (und `#/woche`, `#/heute`, die Crawler nur als Startseite sehen) zeigt in Discord, WhatsApp und Co. nicht mehr nur das feste Markenbild, sondern an Tagen mit belegtem Release dessen Karte: Cover, Titel, Datum, „Alle 12 Folgen auf Netflix“, Marke AK. Ohne Release (oder ohne Bilddatei) bleibt das Markenbild.

Beispiel 26.11.2026 (Fool Night, einziger Komplettstart des Tages): `vorschau-2026-11-26.jpg` im Zweig `prtext/linkvorschau-tageshighlight` (1200×630, 51.530 Byte). **Hinweis zum Beispielbild:** In der Cloud-Umgebung war `image.tmdb.org` gesperrt; das Plakat im Beispiel ist aus dem schon vorhandenen Release-Bild `auto-10021751-netflix.jpg` ausgeschnitten. Im Lauf lädt `build-og.ts` das Cover wie bei allen Release-Bildern von TMDB/AniList.

## Wie

- `shared/tages-highlight.ts`: reine Auswahl. Rang: Erstausgabe > Komplettstart/Kinostart > Katalog „im Angebot ab“ > Staffelstart (Folge 1) > Einzelfolge; gleicher Rang: `dubConfidence`, dann Slug (kein Beliebtheitsfeld im Datensatz). Nur Termine mit `sources`, nicht fortgeschrieben, keine Sichtung, TV-Wiederholung, Disc, OmU, kein Titel mit `dubConfidence: low`. Folgenzahl nur, wenn belegt.
- `pipeline/lib/og-tag.ts`: zeichnet `public/og/tag-JJJJ-MM-TT.jpg` mit der vorhandenen Release-Karte (`zeichneKarte`, keine neue Abhängigkeit), löscht Tagesbilder älter als 7 Tage, setzt `og:image`, `twitter:image` und `og:image:alt` der Startseite nur, wenn die Datei in `dist` liegt.
- `build-og.ts` (Schritt „Vorschaubilder“ im Bestandsbau) ruft es auf; `build-share-pages.ts` tauscht die Adresse. Das Datum im Dateinamen ist die neue Adresse je Tag (Discord/WhatsApp cachen je URL).
- Test `pipeline/check-tages-highlight.ts` (in `check:logic`): Fixture 26.11.2026 mit festem `today` → Fool Night; dazu Rangfolge, Ausschlüsse, 7-Tage-Aufräumen, Seitentausch.

## Zu wissen

- **Fool Night hat `sprache: offen`** (Quelle nennt die Sprache nicht), der Titel trägt aber `dubConfidence: very-high` und einen Netflix-Stream mit `dub: true`. Die Auswahl schließt deshalb nur `omu` aus, nicht `offen`; das Bild behauptet nichts über die Synchro, das tut die Marke („Alles mit deutscher Synchro“) nicht anders als bisher.
- **Zeitpunkt:** Das Bild entsteht im ersten Bestandsbau des Tages (etwa alle 4,5 h) und geht mit dessen Deploy live. Dazwischen (ab 00:00 Berlin) bleibt das Markenbild. Kein neuer Cron; ein früher Lauf lohnt erst, wenn das stört.
- Ein Commit je Tag (~50 KB) in `public/og`, sieben Dateien gleichzeitig.

## Geprüft

`npx tsx pipeline/check-tages-highlight.ts` (auch mit `bestand-sperre.cjs`), `npx tsc --noEmit -p .`, `node tools/umfang-pruefen.mjs`, `check-og-termin`, `check-leerzeichen-gleich`. Erzeugung des Beispielbilds: 485 ms. Nicht lokal gefahren: `check-teilseiten` (braucht `dist`), Deploy-Messung.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zos3j6Jzss9MuKv4JN
