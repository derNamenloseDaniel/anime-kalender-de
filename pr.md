<!-- titel: Synchro-Urteile aus de.wikipedia: 18 Prime-Kanal-Titel belegt, 3 Erstausgaben, 1 Nein -->
Auftrag: synchro-urteil-2
Baut auf: fix/maengel-synchro-urteil (zuerst mergen)

## Was
Abbau der Mängel `sprachurteil-offen` und `synchro-schwach` mit Belegen aus de.wikipedia (`?action=raw`, 26.11.2026). Entschieden sind 22 von 107 Titeln, die Ziel-Marke von 40 ist nicht erreicht: aus der Cloud sind nur de.wikipedia und AniList erreichbar, alle anderen Quellen sind gesperrt (Rest und Suchbegriffe im Bericht).
- `data/dub-confirmed.yaml`: `zweiteQuelle` (Wikipedia, Satz oder Abschnitt, Adresse) an 46 Prime-Kanal-Zeilen von 18 Titeln. Sie machen Amazons Ja zum Beleg (Kanal-Regel vom 11.10.2026). Titel: 2116, 2418, 2570, 4654, 8937, 9989, 16049, 17895, 19115, 20552, 20727, 21676, 101166, 102365, 10004750, 10005217, 10005293, 10012621.
- `data/erstausgabe-von-hand.yaml`: 3 Einträge mit Datum und Quelle: 1023 (Animax, 02.01.2009), 4792 und 4793 (Kino-Vorfilme zu Pokémon 2 und 3, 21.12.2000 und 21.06.2001).
- `data/ohne-synchro-von-hand.yaml`: Nein für 2108 Rockman.EXE AXESS (Wikipedia: nur die erste Staffel lief auf RTL II; zweite Quelle Synchronkartei laut Bericht vom 06.10.2026).
- `data/patchnotes/synchro-urteil-wikipedia-belege.yaml`: Patch Note.

## Beleg
- Mängelzahlen, vorher aus dem Register dieses Zweigs, nachher gerechnet (offene Zeilen der Art, abzüglich der gelösten Titel): `sprachurteil-offen` 51 → 33 (18 gelöst), `synchro-schwach` 56 → 52 (4 gelöst: 2108 verlässt den Bestand, 1023, 4792, 4793 steigen von `low` auf `normal`).
- Gegenprobe mit dem Bau-Vergleich (Ersatz-Cache, Basis 677a9cfb gegen diesen Zweig): genau 21 Titel ändern `dub`, `dubConfidence` oder `deErstausgabe`, dazu 2108 (aus dem Bestand), keiner sonst. Im Ersatz-Cache zählt 20552 schon vorher als gelöst (anderer Stream), deshalb dort 85 → 68 und 56 → 52. Keine Kennung wird neu offen.
- `npm run check:handbelege` gegen die Ersatz-Bau-Daten des Zweigs: nur 179950 (Petals of Reincarnation), den der Ersatz-Bestand nicht führt und der auch ohne diese Änderung fehlt. Gegen die eingecheckten `public/data` zeigt er 17 Handprüfungen mit `dub=undefined`: das ist der Stand vor dem Bestandsbau. `npx tsc --noEmit -p .` und `npm run data:validate` grün.
- Annahmen: (1) Eine Wikipedia-Aussage zur deutschen Synchronisation, Ausstrahlung oder Disc gilt als tonführend (wie bei den Anime2You-Belegen der Kanal-Titel). (2) 1023: „Animax“ steht im Abschnitt zur deutschen Ausstrahlung (MTV 2007, Animax 2009, ProSieben Maxx 2014), gemeint ist Animax Deutschland. (3) 4792/4793: Die Spalte „Pikachu-Vorfilm“ nennt den deutschen Titel zum Kinostart; das Datum deckt sich mit dem PokéWiki-Befund vom 06.10.2026 (pokewiki.de aus der Cloud nicht erreichbar, nicht neu gelesen). (4) 2108: Die Synchronkartei-Adresse stammt aus dem Bericht vom 06.10.2026 und ist nicht neu gelesen; sie ergänzt die ausdrückliche Wikipedia-Aussage als zweite Stimme.

## Live-Beleg
entfällt (Datenänderung, Wirkung erst nach dem nächsten Bestandsbau).

## Patch Notes
`data/patchnotes/synchro-urteil-wikipedia-belege.yaml`: „21 Titel mit belegter deutscher Synchro, etwa AnoHana“ (18 Kanal-Titel plus 1023, 4792, 4793; das Nein zählt nicht mit).
