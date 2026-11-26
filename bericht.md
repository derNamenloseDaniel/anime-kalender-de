# Bericht folgentitel-wikipedia-2 (26.11.2026)

- Zweig `fix/folgentitel-wikipedia-2` (Basis `fix/maengel-folgentitel`, zuerst mergen), 1 Commit, gepusht; kein PR geöffnet, Text in `pr.md`.
- Alle 281 offenen `folgentitel`-Mängel gegen de.wikipedia sondiert (feste Seitennamen inkl. `Liste der <Serie>-Episoden`, `/Episodenliste`, 1 s Abstand, `?action=raw`); nur 10 Titel haben eine brauchbare deutsche Liste.
- Eingetragen: 227 Folgentitel in `data/folgentitel-hand.yaml` für 10 Titel (Es war einmal … der Mensch / Entdeckung unserer Welt / Entdecker und Erfinder, Super Wings Staffel 1 bis 3, Mushoku Tensei S2 Folge 13, K-On! Folge 13, K-On!! Folgen 25 und 26, Pokémon Reisen Folge 131).
- Vorher/nachher `folgentitel`: 280 offen (Stand Basis-PR) → 271 erwartet (9 Titel vollständig; mit der echten Stufe `mitFremdTiteln` gerechnet, Messung erst nach dem Bestandsbau).
- Gegenproben: Mushoku 12/12, Pokémon Reisen 124/131 (Rest Schreibweise), K-On! 10/12 und K-On!! 19/24 (Rest Zeilen mit `rowspan`), Es war einmal … Entdeckung und Entdecker je 25/26 gegen TMDB; Mensch und Super Wings nur mit lückenloser Nummernfolge (Annahme im PR-Text).
- Nicht eingetragen, weil Reihenfolge abweicht oder unklar: Transformers: Armada, Captain Future, Miraculous S2/S4, Pokémon 161, Lupin III. Part 6 (Folge 25 = „Episode 0“?), Wundersame Geschichten (26 von 41).
- Geprüft: `tsc --noEmit -p .` und alle `check-folgentitel-*`/`check-tmdb-folgentitel-*` Exit 0; `pr-vorpruefung` grün. Cloud-Grenzen: kein `data/cache`, kein Bestandsbau, kein aniSearch.

## Rückblick
- **gut:** Die Gegenprobe gegen vorhandene Titel fing zwei Fälle ab, in denen die Wikipedia-Nummern verschoben sind (Armada, Captain Future); drei Listen stehen nicht unter dem Standardnamen (klein geschriebenes „die“ bei Entdeckung unserer Welt, Pokémon-Unterseiten, `K-On!/Episodenliste`).
- **schlecht:** Ausbeute 10 von 281; 4 % der offenen Titel haben überhaupt eine deutsche Liste, viele Wikipedia-„deutsche Titel“ sind nur Übersetzungen der Autoren (Yosuga no Sora, Black-Butler-OVAs englisch).
- **unerwartet:** Fehler im Bestand: Transformers: Armada trägt die Titel 8 bis 20 aus der deutschen Zählung (Wikipedia 40 bis 52, Kitsu stimmt dazu), Pokémon 160/161 trägt „Revanche in Dukatia City“ eine Nummer zu früh.
- **Vorschlag:** Armada und Pokémon 160/161 als eigene Datenfälle prüfen (aniSearch-Nummern); `fetch-wikipedia-folgen` um die Vorlage `{{Episodenliste|TitelDE}}` und die Zellenlisten (Super Wings, Pokémon-Unterseiten) erweitern, sonst bleibt der Weg Handarbeit.
- **veraltet:** `docs/wissen/maengel.md` nennt weiter 280 bzw. 283 offene Titel; nach dem Bestandsbau auf den gemessenen Wert nachführen.
