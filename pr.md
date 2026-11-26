<!-- titel: TMDB-Suche: Suchfehler getrennt von „kein Treffer“ speichern -->
Auftrag: tmdb-reste

## Was jetzt anders ist
Eine gescheiterte TMDB-Suche (Netz, 5xx, 429) steht in `data/tmdb-titles.json` nicht mehr als „kein Treffer“, sondern als `suchfehler: true`; `faelligeTitel` legt solche Titel im nächsten Lauf wieder vor (statt nach 7 Tagen). Keine Datenänderung.

## Stand und Zuordnung (nicht erledigt, mit Grund)
Heute (26.11.2026, `public/data/folgen` + `data/tmdb-titles.json` + `data/tmdb-von-hand.yaml`): **18 Titel mit 133 Dub-Lückenfolgen ohne `tmdbId`** (05.11.: 16 / 107). Keine Zuordnung von Hand: In dieser Sitzung fehlt `TMDB_API_KEY`, `www.themoviedb.org` ist gesperrt (ENOTFOUND), WebSearch liefert keine TMDB-Seiten (außer Ranma 2024: `themoviedb.org/tv/259140`, Hauptserie). Kennungen werden nie geraten.

Liste (AniList-ID, Titel, Folgen/Lücke, Suchbegriff; „Kandidat“ = TMDB-Kennung eines Geschwister-Titels derselben Franchise, nur Hinweis, nicht belegt):

- 2994 Death Note: Relight (Special 2007, 2/2), „Death Note Relight“; Franchise 13916 (Serie), vermutlich Teil von dieser oder Film
- 4094 Batman: Gotham Knight (OVA 2008, 6/6), „Batman: Gotham Knight“ (TMDB führt es vermutlich als Film)
- 109002 Code Geass: Akito 2 Picture Drama (Special, 1/4), „Code Geass Akito the Exiled“
- 108972 Space Dandy 2 Picture Drama (Special, 3/3), „Space Dandy“ (Serie 60874)
- 109085 Cells at Work! Specials (Special 2018, 5/5), „Cells at Work“ (80671)
- 128390 Fire Force Mini Anime (ONA 2021, 30/30), „Enen no Shouboutai Mini Anime“; Serie 88046
- 187055 Calico Critters: Mini Episodes – Peony (TV_SHORT 2020, 12/12), „Sylvanian Families Mini Story Peony“
- 154982 The Way of the Househusband S2 (ONA 2023, 5/5), Kandidat 112160 (Geschwister teilen sie)
- 7000003 Pokémon Horizonte Staffel 3 (47/33), „Pokémon Horizons: The Series“, TMDB-Serie wie Staffel 1/2 prüfen
- 176298 Tales of Wedding Rings S2 (2025, 13/13), Kandidat 218493
- 178083 Tokyo Revengers: War of the Three Titans (2026, 13/2), Hauptserie 105009; Doku `folgentitel-quellen.md` Z. 100 hat Zuordnung bewusst unterlassen
- 181244 KonoSuba 3 Bonus Stage (OVA 2025, 2/2), „Konosuba Bonus Stage“; Serie 65844
- 185756 Reincarnated Aristocrat S3 (2026, 12/1), Kandidat 237150
- 189123 Blue Box S2 (2026, 12/3), Kandidat 207347
- 190054 My Happy Marriage Special Episodes (Special 2026, 3/3), Serie 196944
- 204389 A Wild Last Boss Appeared S2 (ONA 2026, ?/1), Kandidat 280042
- 209872 Ranma ½ (2024) S3 (2026, ?/4), Kandidat 259140
- 176317 Blue Lock Episode Nagi (Special 2024, 4/4), Serie 131041

Auffälligkeit der Klasse: 6 der 18 sind spätere Staffeln, deren Serienjahr bei TMDB das der ersten Staffel ist; die Jahresprüfung in `waehleBesten` (`jpYear` 2025/26 gegen `first_air_date` 2024) verwirft die richtige Serie. Fix an dieser Klasse ist ein Verhaltenswechsel mit Folgen für Handlung und Anbieter der Fortsetzung (`tmdb-hauptserie.ts`) und braucht eine Messung mit API-Schlüssel; nicht in diesem PR.

## Fünf Stufen (Suchfehler)
(a) Ursache: `pipeline/lib/tmdb-titel-lookup.ts` (alt Z. 62–70) verschluckt den Fehler per `warn` + `continue`; `lookup` (alt Z. 113) gibt dann `{ miss: true }` zurück.
(b) Klasse: ein Pfad, alle TMDB-Titel; wie viele der 18 echte Suchfehler sind, ist am Bestand nicht ablesbar (genau das fehlte).
(c) Fix an der Klasse: `sucheBesten` zählt Fehler, `lookup` gibt `{ miss, suchfehler }` zurück, `faelligeTitel` nimmt `suchfehler` sofort wieder vor.
(d) Test `pipeline/check-tmdb-suchfehler.ts` (festes `fetchedAt`, Kulisse ohne Netz), Eintrag in `tools/check-logic-liste.txt`. Basis-Beleg gegen die `origin/main`-Fassung von `tmdb-titel-lookup.ts` und `tmdb-faellig.ts`: Exit 1, drei Rot-Zeilen: „✖ beide Suchen scheitern: Suchfehler — gefunden: {"miss":true}“, „✖ eine scheitert, die andere ist leer: Suchfehler …“, „✖ frischer Suchfehler ist fällig, frischer Fehlschlag nicht — gefunden: []“; mit dem Fix Exit 0. Mutationsprobe: die beiden rückgängig gemachten Zeilen (`fehler ? … : …`, `e.suchfehler`) sind genau diese Mutanten, beide rot. Berührte Tests (film-suche, ablauf, 404-neusuche, genre, folgen-auswahl, folgen-404), `tsc --noEmit -p .`, `check:umfang`, eslint: Exit 0.
(e) Warum durchgelassen: Der Test der Film-Nachsuche prüfte „Serien-Suche scheitert → Film wird trotzdem gefunden“, aber nie „alle Suchen scheitern → was wird gespeichert“; kein Wächter fragte, ob `miss` mehr als eine Ursache hat.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zqFcZu5K1vpL1gB36N
