# Bericht fsk-abdeckung (26.11.2026)

1. Von 863 Titeln ohne FSK (310 mit Stream-Weg) hat JustWatch für 686 keinen Treffer, für 163 einen Treffer ohne `ageCertification`, für 13 einen Wert; der Code verliert davon nur 12 (geteilter TMDB-Film), 1 (8460) wäre übernehmbar.
2. Ursache ist die Datenseite (JustWatch kennt 80 % nicht, 19 % ohne Alter), nicht der Code-Pfad; die Stream-Anbieter der 310 sind Crunchyroll 166, Prime 106, Netflix 52, ADN 29.
3. Behoben im Code: jeder Verwerfungspfad der FSK-Übernahme wird gezählt und benannt (Bau-Log, `FskJwBilanz`); Test rot gegen main (Exit 1), grün (Exit 0), Mutanten 43/1 überlebt.
4. Hochrechnung: nächster Bestandsbau schließt durch diesen PR 0 der 863 (nur Zählung); 8460 kommt nach dem Bau von selbst, falls sein Befund dann gelesen wird.
5. Nicht in der Cloud prüfbar: warum 8460 im Bau vom 26.11. fehlt (Cache), und ob die Altfälle unten im echten Bau auftreten.
6. Vorschlag A (Code, klein, 2 Titel): `mehrdeutigeFilmzuordnungen` zählt Partner, die nicht im Bestand stehen (Spycies 163696 ↔ 10014868, Rohirrim 185613 ↔ 10019566); TMDB führt dort FSK 6 und 12 selbst. Braucht einen Bestandsbau-Probelauf, ändert auch Handlung und Plakat.
7. Vorschlag B (Abrufumfang, groß): eine zweite Altersquelle mit Netz (Crunchyroll-/Prime-Titelseiten tragen eine Einstufung; Katalogdateien im Repo tragen keine). Erst Rechte lesen (robots, AGB), dann Probe an 20 Titeln.

## Rückblick

- **Gut:** Der Auftrag ließ sich an `titles.json` und der Befunddatei komplett nachrechnen; der Vorher/Nachher-Vergleich des Umbaus lief byte-gleich.
- **Schlecht:** Die vermutete Code-Ursache gibt es nicht; der Zählfix ist klein, die Lücke bleibt.
- **Unerwartet:** TMDB trägt für die zwei Altfälle die Freigaben schon, nur verwirft `mehrdeutigeFilmzuordnungen` sie wegen eines aniSearch-Titels, der im Bestand fehlt.
- **Vorschlag:** Vorschlag A als eigenen Auftrag mit Bestandsbau-Probe; Mängelart `fsk` von `auto:justwatch` auf „Hand/Quelle offen“ umstellen, bis B entschieden ist.
- **Veraltet:** `quellen.md` („Abdeckung 84 %, rund 420 Titel“, 08.10.2026) stimmt nicht mehr: heute 0 von 863 offenen.
