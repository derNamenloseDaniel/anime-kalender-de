Zweig `fix/sprecher-wikipedia-2` gepusht (ein Commit auf `fix/maengel-sprecher-wikipedia`, zuerst mergen). Zugeordnete offene sprecher-Titel 81 → 110 von 356: Ziel +80 verfehlt, +29 erreicht.
20 neue Seiten samt Fixtures, drei bestehende Seiten um je einen Titel ergänzt; 5 Titel nennt die Tabelle selbst, 24 stehen mit `unsicher` und Grund.
Von 577 Kandidatennamen der ersten Runde (je Franchise aus titles.json, 1 Abruf/1,1 s) lieferten 136 eine Seite, 69 Seiten einen Abschnitt mit „synchron“ im Titel; die meisten offenen Titel sind alte Filme, Kurzserien und Specials ohne eigene Wikipedia-Seite.
Draußen bleiben Seiten ohne deutsche Spalte (Blue Lock, Go! Go! Loser Ranger!, Yozakura Family, Dimension W, Joker Game, IS, 91 Days, Cyborg 009) und Seiten, die der Parser nicht liest (Seven Deadly Sins, Pokémon, Strike Witches, siehe Vorschlag).
Tests: check-wikipedia-sprecher und tsc grün; Vorprüfung grün. Kein PR (Cloud), kein Auto-Merge.

Rückblick
- gut: Franchise-Kennung aus titles.json als Namensquelle; die Projektparser-Gegenprobe je Seite fing El Hazard (Fußnote nennt die OVA) und Strike Witches (rowspan verschiebt Spalten) ab.
- schlecht: 439 von 577 Namensraten waren 404; die zweite Runde mit „(Anime)/(Fernsehserie)/(Film)“ brachte bei 443 Abrufen keinen einzigen Treffer, Abbruch.
- unerwartet: `hole`-Läufe liefen im Hintergrund trotz beendetem Startbefehl weiter; Pokémon-Seite hat deutsche Spalte, der Parser findet sie wegen verschachtelter Tabellen nicht.
- Vorschlag: Parser (Auftrag sprecher-bauanschluss): Kopf „Synchronsprecher“ neben „japanischer Sprecher“ als deutsche Spalte, rowspan-Zellen und verschachtelte Tabellen lesen; das hebt Seven Deadly Sins (2 Titel), Pokémon (7+), Strike Witches (3) über die Grenze (zusammen 12 offene Titel; ob die Tabellen die Titel tragen, ist ungeprüft).
- veraltet: Kommentar am Kopf der Handliste („Stand 26.11.2026: 44 weitere Seiten“) nennt die zweite Tranche nicht; nicht angefasst.
