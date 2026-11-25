# Bericht staffel-ohne-seite-blind-2511

- Ursache: Die Erkennung verglich mit `episodes`; mit TMDB-Staffeln 8+8 (PR 4979) wird `episodes` 16, Folge 9 liegt nicht mehr dahinter, 0 Fälle, BEKANNT veraltet.
- Fix: Seitenumfang = Folgen der ersten Staffel, wenn `staffeln` da ist, sonst `episodes` (`pipeline/lib/staffel-ohne-seite.ts`, Zweig fix/staffel-ohne-seite-blind, d6fa0019). Fall wird in altem und neuem Stand erkannt (belegt an echten Daten).
- Wächter: 3 Testfälle in `check-staffel-ohne-seite.ts` (8+8 mit 16 = Fund, alter Stand = Fund, eine Staffel mit 16 = Gegenfall); vorher rot, nachher grün.
- Rest: Staffel 2 hat weiter keine eigene Seite (BEKANNT bleibt); kein weiterer Titel mit `staffeln` betroffen. PR legt der Dirigent an.
- Rückblick: gut — `staffeln` lag schon in titles-core, kein neues Feld. Schlecht — Hook sperrt Heredoc, kostete einen Anlauf. Unerwartet — Daten-Zweig 4979 hat noch kein neu gebautes public/data, Neustand musste simuliert werden. Vorschlag — Prüfungen auf Gesamtzahlen künftig auch gegen den Sammler-Zweig-Stand probefahren.
