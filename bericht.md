# Bericht handlung-de-wikipedia

- Ergebnis: 13 von 63 Titeln beschrieben (Ziel mindestens 45 nicht erreicht); offen 63 → 50 (gerechnet).
- Grund: Die Quellregel verlangt zwei Quellfamilien, die den Inhalt selbst tragen. Aus der Cloud sind nur de.wikipedia.org und AniList lesbar; Kitsu, Jikan, MAL, TVmaze, Wikidata sind nicht auflösbar, die Wikipedia-Suche liefert 429.
- Weggelassen, weil nur AniList den Titel trägt (keine passende de.wikipedia-Seite gefunden): Pokémon-Specials (16678, 19099, 21270, 21271, 167418, 170535), Kater Tom 17657, Silver Twilight 18325, Sinbad 21368/100658, Ookami Heart 99643, The Perfect World 102651, Gauko S2 115794, Chuck 126438, Princess Principal 129759, Grisaia 120892, GREEN DA KA RA 145850, Tayo/Titipo (188055–188067), T・P Bon S2 10019323, Hyperventilation 10016095, Renako-Folgen 199112, Bakugan 177166 und alte chinesische Kurzfilme (113178, 145564, 153734, 215520).
- Weggelassen, weil keine Quelle erreichbar (kein AniList-Eintrag, keine Wikipedia-Seite): 5000002, 10014545, 10015166, 10015334, 10016854, 10017352 (Super Wings: nur Wikipedia), 10018944, 10019036, 10019845, 10019909, 10020137, 10020251–10020253, 10020559, 10020560, 10021154, 10021510. Ebenfalls weggelassen: Fate/Kaleid Liner Mini-Episoden 87488 (AniList nennt nur „Kurzspecials“, kein Inhalt).
- Weg zum Rest: lokaler Bauer mit freiem Netz (aniSearch, ofdb, fernsehserien.de) oder `freigabe: "Daniel, TT.MM.JJJJ: …"` je Titel für Einzelquellen-Texte.

## Rückblick
- Gut: AniList-Abruf per idMal samt Wikipedia-Seitensuche über `?action=raw` funktioniert zuverlässig; 5-Wort-Abstand per Skript gegen beide Quellen gemessen.
- Schlecht: Der Auftrag setzt 45+ an, die Quellregel in der Cloud trägt aber nur etwa ein Fünftel der Titel.
- Unerwartet: `Wikipedia`-Seiten über `/wiki/<Name>?action=raw` folgen Weiterleitungen nicht immer (Treffer „WEITERLEITUNG“ im Text), und ein Seitenname führte zu einem nicht erreichbaren Wikibooks-Host.
- Vorschlag: Für Titel, bei denen AniList nur einen Satz liefert (Tayo, Titipo, Pokémon-Specials), eine ausdrückliche Freigabe für Einzelquelle erwägen, oder Auftrag an lokalen Bauer mit aniSearch.
- Veraltet: `docs/wissen/maengel.md` Abschnitt Lehre 22.11. nennt „nur Wikipedia und AniList lesbar“ weiter zutreffend; Zähler dort (63) sinkt mit dem nächsten Bestandsbau.
