# Plan: jede Staffel ein eigener Titel mit Reihe-Reiter (Auftrag 26.11.2026 13:22)

- **Untergrenze (Handtitel je Staffel ohne Schnitt):** geht nicht. Bei Horizonte hängen alle Quellen an 158871 (TOGGO, RTL+, Wikipedia, Handbelege 1–136), bei Mighty Nein setzt der TMDB-Sammler `episodes` 16, und der Prime-Weg 1–8 hängt an -219080 (K57). Beides bräuchte doppelte Pflege.
- **(a) Schnitt aus PR 4592/4603 zurückholen:** Gegendiff von 947559194b auf pipeline/shared/web/tools: 67 Dateien, +1798/−824. Probe-Revert: 10 Konflikte, davon 3 modify/delete. Dafür bringt der Code seine Riegel mit (Termine, `ev.id`, Wege, TOGGO vorher = nachher) und lief vom 20. bis 24.11. live.
- **(b) Handtitel plus Reihe in einer Kuratiert-Datei je Serie:** Das wäre eine neue Bauweise, alle Riegel neu und die Quellen doppelt. Verworfen.
- **(c) Schnitt erst in der Auslieferung:** Verworfen, denn Meldungen, Urteile und Worker sehen die Kennungen vor der Auslieferung.
- **Gewählt: (a), Datei für Datei** (kein `git revert`), verallgemeinert. Cartoons bekommen `data/curated/staffel-titel-cartoons.yaml` (Form aus `wip/cartoon-staffel-schnitt-lokal`: `behalteSlug`, kein geerbter Sprachhinweis). Der Titel wird in `schreibeCartoons` geschnitten, die Termine im selben `teileTermine`.
- **Kalender-UIDs:** `ev.id` bleibt. Das prüft der Riegel `gleicheKennungen`, dazu kommt ein Test.
- **Kennungen:** 7000001–7000003 tragen wieder ak 26469–26471, `zuAk` entfällt. 14839 bleibt Basis = Staffel 4, so folgen Favoriten und Abos der laufenden Staffel. 7000004 (Mighty Nein Staffel 2) bekommt eine neue ak.
- **ak-umleitung.json:** Die drei Paare entfallen, die Datei schrumpft also. Deshalb gibt es eine neue Marke im Browser (K56). „Gesehen bis“ an 14839 (seit 24.11. durchlaufend) geht an die Staffel, in der der Wert liegt. Tests decken drei Speicherstände ab. Der Worker bleibt unverändert, weil Favoriten bei 14839 bleiben.
- **news-historie.json:** Die Release-Slugs bleiben gleich (Basis-Slug bzw. `behalteSlug`), ein Test belegt das.
- **Urteile und Meldungen:** `staffelzaehlung` wird eine Liste von Fenstern (24.–25.11. und ab der Aktivierung). `fetch-urteile` liest sie über `staffelVonTiteln`, je Zeitraum ein Test.
- **Kennung live = ak:** `ausgabe-kennung` gibt Staffel-Titeln die ak, Probe am gebauten Datensatz.
- **Wächter:** `staffel-ohne-seite` verliert die Ausnahme `mitGrenzen`, Mighty Nein fliegt aus BEKANNT. Dazu kommt ein Fall „Staffel-Start nach der letzten erschienenen Folge“ mit festem `today`, rot am alten Stand.
- **Schnitt in PRs:** PR A ist reiner Umbau (Code zurück, ohne `basis`, `bau-vergleich` gleich). PR B bringt die Aktivierung von Horizonte und Mighty Nein, den Wächter, `berechneAntwort` und die Bilder.
