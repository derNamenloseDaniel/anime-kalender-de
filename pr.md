# Staffel-ohne-Seite: Seitenumfang aus der ersten Staffel statt Gesamtzahl

Die Bestandsprüfung `check-staffel-ohne-seite-bestand` wird blind, sobald der Sammler-PR 4979 TMDB-Staffeln für The Mighty Nein bringt (`episodes` 8 → 16, `staffeln` 8+8). Folge 9 liegt dann nicht mehr hinter `episodes`, der BEKANNT-Eintrag `the-mighty-nein-s2-primevideo` gälte als veraltet und der Probebau würde rot, obwohl Staffel 2 weiter ohne eigene Seite hängt.

**Fix:** `staffelnOhneSeite` vergleicht bei Titeln mit `staffeln` (Cartoons) mit den Folgen der ersten Staffel, sonst mit `episodes` (`pipeline/lib/staffel-ohne-seite.ts`). Kein neues Feld: `staffeln` steht schon in `titles-core.json` (24 Titel).

**Beleg** (echte Daten, Mighty Nein auf den Stand aus `data/cartoons.json` von 4979 gesetzt):
- alter Code, alter Stand: 1 Fall; alter Code, neuer Stand (episodes 16): 0 Fälle (Wächter rot, s. u.)
- neuer Code, alter Stand: `the-mighty-nein-s2-primevideo`; neuer Code, neuer Stand: `the-mighty-nein-s2-primevideo`
- Bestandsprüfung auf main-Daten: ok, 1 Fall, alle in BEKANNT
- Außer Mighty Nein hat kein künftiges Release mit Folgennummer einen Titel mit `staffeln` (kein neuer Fall)

**Wächter** (`pipeline/check-staffel-ohne-seite.ts`): Staffeln 8+8 mit `episodes` 16, Release ab Folge 9 = Fund (vorher rot, nachher grün); alter Stand eine Staffel mit 8 = Fund; eine Staffel mit 16: ab 9 kein Fund, ab 17 Fund.

Lokal: Test grün, Bestandsprüfung grün, `tsc --noEmit` grün, `mutationsanker --diff` 0 tote Anker. `check:vor-commit` fährt die Kette.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
