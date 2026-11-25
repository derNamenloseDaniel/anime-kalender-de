# Mängel-Abbau 25.11.: deutsche Titel und Erstausgabe für sieben Titel belegt

Auftrag maengel-abbau-2511. Nur `data/titel-de.yaml` und `data/erstausgabe-von-hand.yaml`, nichts in `data/cache/`. Der Bau lief hier nicht (`data/cache/` leer), die Zahlen „nachher“ misst der Bestandsbau nach dem Merge.

| Titel | Mangel | Beleg-URL | Änderung |
|---|---|---|---|
| Cyborg 009: Call of Justice 1 (87481) | kein-weg, synchro-schwach | https://www.anime2you.de/news/866645/netflix-entfernt-cyborg-009-call-of-justice/ | Erstausgabe Netflix 10.02.2017 (wie Teil 2/3; 12 Folgen deutsch, bis 09.02.2025) plus deutscher Titel; mit dem vorhandenen Netflix-Nein vom 22.08.2026 erwartet `belegtes-nein` |
| Code Geass: Akito 4 (15201) | titel-de | https://www.primevideo.com/-/de/detail/Code-Geass-Akito-the-Exiled-4---From-the-Memories-of-Hatred---OVA/0GWI6KUP5WZPQ5L7YYU1B76SYG , https://tv.apple.com/de/movie/code-geass-akito-the-exiled-4---from-the-memories-of-hatred---ova/umc.cmc.1x0l3n8yt36sbaals80f2xkcf | `Code Geass: Akito the Exiled - From the Memories of Hatred` |
| Psycho-Pass SotS Case 2 (104382) | titel-de | https://www.filmdienst.de/film/details/614632/psycho-pass-sinners-of-the-system , https://www.filmstarts.de/kritiken/281603.html | `… Case 2 - First Guardian` |
| Psycho-Pass SotS Case 3 (104990) | titel-de | https://www.filmstarts.de/kritiken/281604.html (+ Filmdienst) | `… Case 3 - Jenseits von Liebe und Hass` |
| Pacific Rim: The Black S2 (10017229) | titel-de | https://www.moviepilot.de/serie/pacific-rim-the-animated-series/staffel/2 , https://www.fernsehserien.de/pacific-rim-the-black/episodenguide/staffel-2/42268 | `Pacific Rim: The Black - Staffel 2` |
| Date A Bullet: Dead or Bullet (111852) | titel-de | https://de.wikipedia.org/wiki/Dead_or_Bullet , https://www.anime2you.de/news/496297/date-a-bullet-kinotermin/ | `Date A Bullet: Dead or Bullet` (kein eigener deutscher Titel) |
| Date A Bullet: Nightmare or Queen (121034) | titel-de | dieselben | `Date A Bullet: Nightmare or Queen` |

Vorher (`node tools/maengel.mjs --top 20`, Stand 25.11. 14:20): 141391 Call of the Night, 13709, 2568, 2230, 4073, 3044, 10017963, 10020252, 10020253, 10017505, 130253, 116786, 3834, 2913, 2827, 3024, 1471, 15201, 109002, 87481. Nachher: erwartet ohne 15201 und 87481 (nach dem Bestandsbau zu messen). Die übrigen fünf Titel stehen mit `titel-de` weiter hinten in der Liste.

Nicht gelöst: Call of the Night (Anime2You: Sprachfassungen bei Netflix „noch offen“), Afro Samurai Movie (die deutsche Steelbox enthält Serie und Resurrection, nicht den Film von 2007), Code Geass Picture Drama (109002, kein deutscher Titel zu finden), Beyblade/Bakugan/Baby Shark (Anbieter-Seiten aus der Cloud nicht erreichbar).

Patch Notes: keine Zeile nötig (nur Titelnamen und eine Erstausgabe, keine neue Fähigkeit).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
