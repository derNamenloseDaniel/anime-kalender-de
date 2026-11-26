# Bericht maengel-bild-fremdsprachig (26.11.2026)

- Vorher 509 offen (315 Ausnahmen); nachher nicht gemessen (braucht Bau mit Cache), Hochrechnung an titles.json: 527 → 274 (ohne geteilte Filme), 399 Banner ersetzt.
- Ursache Cover: 238 Titel mit TMDB-Plakat `ja` ohne `nurJa` (Altbestand, Reparatur PR 4790 wartet auf den Plakat-Lauf: 98 mit Kennung im ersten Lauf, 140 über Staffelsuche). Der Plakat-Bestand speichert nur das gewählte Bild, ein falsch gewähltes de/textloses Plakat ist im Repo nicht messbar.
- Größere Ursache: 348 Titel tragen nur ein AniList-Banner, 331 davon haben in der Reihe ein eigenes TMDB-Banner → neu `ersetzeAnilistBanner`, Test rot (Exit 1) → grün, 24 von 26 Mutanten getötet, 2 Überlebende nur Protokollzeile.
- Nicht gebaut: 66 Reihenserien (Special/OVA/ONA) mit Plakat `ja` ohne eindeutige Staffel; TMDB ohne Schlüssel von hier nicht erreichbar.
- `data/cover-von-hand.yaml` nicht angefasst; keine aniSearch-Bilder.

Rückblick
- Gut: Die Alternative lag schon im Repo (Reihen-Banner), nicht im Cover-Code.
- Schlecht: Die Ausgangsfrage (Cover) ließ sich aus dem Repo nicht beantworten, weil nur das gewählte Plakat gespeichert wird.
- Unerwartet: Die 238 Plakate sind Altbestand von Oktober bis 16.11., der Plakat-Lauf hat sie seit PR 4790 noch nicht erneuert.
- Vorschlag: Nach dem Bau die offenen Zeilen gegen die Hochrechnung halten; die 66 Reihenserien an einen Rechercheur mit TMDB-Zugang.
- Veraltet: Der Abschnitt „Ursachen der offenen Titel“ in docs/wissen/maengel.md nennt das Banner „nicht gebaut“; der neue Abschnitt darunter löst das ab.
