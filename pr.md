<!-- titel: data(sprecher): Wikipedia-Sprecherseiten, zweite Tranche (20 Seiten, 29 Titel) -->

Auftrag: sprecher-wikipedia-2
Baut auf: fix/maengel-sprecher-wikipedia (zuerst mergen)

## Ansatz

Zweite Handtranche der Liste Seite → Titel für die Wikipedia-Sprechertabellen. Zugeordnete offene `sprecher`-Mängel: **81 → 110 von 356** (Ziel war +80, erreicht +29; Grund unten). Kein Code im Bau, nur Daten und Testdaten.

Vorgehen: Seitennamen nicht geraten, sondern je Franchise-Kennung aus `titles.json` abgeleitet (Titel, Englisch, Romaji, ohne Staffelzusatz; 577 + 32 Namen, ein Abruf je 1,1 s, `?action=raw`, nie `api.php`). Eingetragen nur, was einen Abschnitt „Synchronisation“ mit deutscher Spalte hat und vom Projektparser gelesen wird; Gegenprobe der ersten Zeilen je Tabelle. Specials, Filme, OVAs und Staffeln, die die Tabelle nicht nennt, stehen mit `unsicher` und Grund; 5 Titel nennt die Tabelle selbst.

Nicht eingetragen (Grund je Seite im Bericht): Seiten ohne deutsche Spalte (Blue Lock, Go! Go! Loser Ranger!, Mission: Yozakura Family, Dimension W, Joker Game, IS, 91 Days, Cyborg 009), Seiten, die der Parser nicht liest (Seven Deadly Sins: Kopf „Synchronsprecher“ ohne „deutsch“; Pokémon: verschachtelte Tabellen; Strike Witches: rowspan verschiebt die Spalten), und Seiten, deren Tabelle einen anderen Titel trägt (El Hazard: Fußnote nennt die OVA, der Titel ist die TV-Serie; Willy Fog; Bleach: Tabelle nennt Thousand-Year Blood War nicht).

## Geänderte Dateien

- `data/wikipedia-sprecher-seiten.yaml`: 20 neue Seiten (26 Titel), je ein Titel bei Ron Kamonohashi, Kaiju No. 8 und My Hero Academia ergänzt.
- `pipeline/fixtures/wikipedia-sprecher/*.wikitext`: 20 neue Abschnitte, Wortlaut unverändert, Quellen- und Lizenzzeile (CC BY-SA 4.0) im Kopf.
- `pipeline/check-wikipedia-sprecher.ts`: Zählgrenzen angehoben (68 Seiten, mindestens 116 Ziele, 15 Ziele ohne `unsicher`).

## Prüfung

`npx tsx pipeline/check-wikipedia-sprecher.ts` grün (Exit 0), `npx tsc --noEmit -p .` grün. Vorher/Nachher aus dem Mängel-Register: zugeordnete offene sprecher-Titel 81 → 110.

Annahmen: Specials und Filme einer Reihe tragen dieselbe Besetzung nur vermutlich, deshalb `unsicher`; Kandidaten mit abweichender Fassung (El Hazard, Bleach, Willy Fog 20.000 Meilen) bleiben draußen.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zogSWXyARxkfdMDEbb
