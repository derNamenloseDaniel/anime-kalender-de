# Bericht reste-funde-2411 (26.11.2026)

1. **Katalog ohne `anisearch.json`-Eintrag:** 269 von 2.924 Titeln (155 Katalog ab 10.000.000, 114 AniList), 248 mit Disc-Weg. Ursache Bauart (Katalogtitel stehen nie in der Datei); der Weg ist seit PR 4854 zu, am Bestand bestätigt: 149 Titel mit frischem/künftigem Termin, 3 ohne Eintrag werden nachgelesen, Wächter 0 Verstöße. Kein Code nötig.
2. **Fristen:** alle drei bleiben. TMDB 60 Tage: Handlung/FSK ändern sich bei 1,2 % der 6.104 Neuabrufe, Anbieter/Kino hängen an eigenen Läufen. aniSearch-Titel 180: `titel` ändert sich bei 0,2 % von 13.024 Neuabrufen. -Artikel 180: 4 von 104 Neuabrufen geändert, Spanne nur 53 Tage, im Januar neu messen.
3. **TBT-Drift-Wächter:** `pipeline/check-tbt-drift.ts` + `pipeline/lib/tbt-drift.ts` in `check:logic`; Mutationsprobe 115 Mutanten, 0 überlebt (vorher 23). Basis rot (Modul fehlt, Exit 1), danach grün.
4. **Offen (Cloud-Grenze):** Dem Wächter fehlt eine fortlaufende Läufe-Tabelle; die Läufe liegen nur in CI-Artefakten. Ohne sie meldet er „zu wenig“. Der PR-Text nennt die Annahme.

## Rückblick
- **Gut:** Die REST-API gibt die komplette Commit-Historie der Datendateien her (Raw-Fassungen je SHA): damit ist Änderungshäufigkeit messbar, obwohl der Klon flach ist.
- **Schlecht:** `stand.md` fehlt in der Cloud-Kopie, der Auftrag ließ sich nur aus `betrieb.md` rekonstruieren; die Zeile „Reste“ war nicht lesbar.
- **Unerwartet:** Teil 1 war durch PR 4854 schon geschlossen; Katalog-Titel haben bauartbedingt nie einen Eintrag. Die Prüfung `Set`-JSON in meinem ersten Test war wirkungslos (`JSON.stringify(Set)` = `{}`), erst die Mutationsprobe zeigte das nicht, die Durchsicht schon.
- **Vorschlag:** `lighthouse-messen` hängt je Lauf eine Zeile an eine persistierte Tabelle (Datenzweig); dann kann der Wächter nachts laufen und warnen.
- **Veraltet:** Der Satz „sie bekommt einen eigenen Wächter“ in `betrieb.md` ist nachgeführt.
