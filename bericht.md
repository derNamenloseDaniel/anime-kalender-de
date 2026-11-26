# Bericht handlung-satz-teil-06 (26.11.2026)

1. Zweig `daten/handlung-satz-teil-06`, eine neue Datei `data/curated/ein-satz-handlung/teil-06.yaml`: **244 Sätze** für 244 Titel (ids 20553–21505), **0 Lücken**.
2. **3 × `umfang: reihe`** (20750 Maken-ki! Privates, 20769 No Game No Life OVAs, 21279 Highschool D×D BorN Mini-Episoden): die Quellen des Titels nennen nur „Bonusfolgen“, der Satz beschreibt die Reihe bzw. Staffel aus deren Repo-Quellen.
3. **Nähe-Treffer (5 Wörter gleich): vorher 41 Sätze, nachher 0.** Fast alle Treffer waren Namensketten („A, B und C“) oder Eigennamen mit Artikel; behoben durch Umstellen. Länge: höchstens 160 Zeichen (Maximum genau 160).
4. Prüfskript im Scratch-Ordner mit `vergleiche()` aus `tools/handlung-fakten/naehe.ts` gegen alle Quelltexte je Titel (aniSearch, TMDB, ausgelieferter de-Text, AniList, eigener Text). `tools/handlung-naehe.ts` selbst passt nicht: es verlangt eine Faktenkarte je Titel.
5. Quellenlage (Familien aniSearch, TMDB, AniList, eigener Text): 156 Titel mit 3, 85 mit 2, 3 mit nur AniList (21270, 21271, 21368). Für diese drei eine Websuche: Bulbapedia (Familie `fandom`) bzw. Anime News Network (`ann`); nur Suchergebnis gelesen, nichts gespeichert.
6. **Stichprobe 10 Sätze** (Zufall, Seed 2611: 21192, 21390, 20839, 20626, 20736, 21077, 20741, 21128, 20572, 20905) gegen die vollen Quelltexte: richtige Staffel/Teil 10 von 10, Kern getroffen 9 von 10. 20741 (Date a Live Movie) war zeitlich ungenau („gerade beim Konzert“) und ist nachgeschärft. 20626 (Fairy Tail 2014) nennt nur den Eclipse-Strang, nicht das Turnier.
7. Grenzen: Ich habe je Quelle die ersten 300–400 Zeichen gelesen und Einzelheiten gezielt im Volltext nachgeschlagen, nicht jeden Volltext ganz. Was im gelesenen Teil nicht stand, steht nicht im Satz (z. B. 20807 Prison School ohne Gefängnis, 20994 Gate ohne Namen des Helden).
8. Namen: Schreibung wie im deutschen Text; wo der deutsche Text einen Tippfehler hat (20884 „Kozue“, 21235 „Satuski“) steht der Vorname bzw. der Name aus AniList. 21271 nennt das Schlüssel-Pokémon nicht beim Namen (kein deutscher Beleg).
9. PR-Text liegt als `pr.md` daneben; `tools/pr-vorpruefung.mjs` auf dem Datenzweig grün (nur Hinweise zu genannten Pfaden). Kein PR angelegt.
10. Abweichungen: Commits bei 40, 160, 200 und 244 Titeln, die Stände 80 und 120 fehlen als eigene Commits (mein Abgabeskript brach wegen eines zu langen Satzes vor dem Commit ab, ich habe es erst am Ende gesehen). Die Sitzung startete auf einem main vom 24.11.; der Zweig ist auf main vom 26.11. 22:06 umgesetzt (ein Force-Push auf den eigenen Zweig), gleiche 244 Titel, Prüfung gegen die aktuellen Quelltexte erneut 0 Fehler.

## Rückblick
- gut: Ein Skript baut die YAML aus einer Satzliste und prüft Länge, Satzform, Nähe und Vollständigkeit in einem Lauf; jeder 40er-Block war in zwei Runden sauber.
- schlecht: 160 Zeichen sind knapp; rund ein Viertel der Sätze musste nach dem ersten Wurf gekürzt werden, dabei fällt meist die zweite Figur oder der Schauplatz weg.
- unerwartet: Die 5-Wort-Regel schlägt vor allem bei Namenslisten und festen Titeln an („Dai San Hikou Shoujo Tai“ ist allein schon 5 Wörter), nicht bei abgeschriebenen Formulierungen. Der ausgelieferte de-Text ist bei den meisten Titeln der aniSearch-Text ohne Quellenzeile, zählt also nicht als eigene Quelle.
- Vorschlag: Für die Einbindung eine Ausnahme der Nähe-Regel für reine Eigennamenfolgen erwägen; Bonusfolgen ohne eigene Handlung gleich mit der Reihen-id beliefern (`franchiseId`), dann entfällt das Nachschlagen von Hand.
- veraltet: Auftrag nennt die Commit-Endzeile fest mit einem Modellnamen; die Sitzung kann auf einem anderen Modell laufen, die Zeile ist dann nur Vorgabe, kein Beleg.
