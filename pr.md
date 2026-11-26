<!-- titel: data(folgentitel): 227 deutsche Folgentitel aus de.wikipedia-Episodenlisten, 9 Titel vollständig -->
Auftrag: folgentitel-wikipedia-2
Baut auf: fix/maengel-folgentitel (zuerst mergen)

## Was
Nur `data/folgentitel-hand.yaml`: 227 deutsche Folgentitel für 10 Titel aus den de.wikipedia-Episodenlisten (`/wiki/<Seite>?action=raw`, Abruf 26.11.2026). fernsehserien.de nicht benutzt.

| Titel | Kennung | Folgen neu | benannt danach |
|---|---|---|---|
| Es war einmal … der Mensch | 10004749 | 26 | 26 von 26 |
| Es war einmal … die Entdeckung unserer Welt | 10005217 | 26 | 26 von 26 |
| Es war einmal … Entdecker und Erfinder | 10005293 | 26 | 26 von 26 |
| Super Wings (Staffel 1) | 10012621 | 52 | 52 von 52 |
| Super Wings (Staffel 2) | 10014353 | 52 | 52 von 52 |
| Super Wings Mission Teams (Staffel 3) | 10014354 | 40 | 40 von 40 |
| Mushoku Tensei Staffel 2 (Folge 13) | 146065 | 1 | 13 von 13 |
| K-On! (Folge 13) | 5680 | 1 | 13 von 13 |
| K-On!! (Folgen 25, 26) | 7791 | 2 | 26 von 26 |
| Pokémon Reisen: Die Serie (Folge 131) | 112153 | 1 | 132 von 136 |

## Beleg
- **Reihenfolge geprüft, nie geraten:** Mushoku Tensei 12 von 12 vorhandenen Titeln gleich (Nummer = Wikipedia-gesamt minus 24), K-On! 10 von 12 und K-On!! 19 von 24 per Handparser gleich, der Rest Schreibweise oder Zeilen mit `rowspan`; Pokémon Reisen 124 von 131 gleich, 7 nur Schreibweise (Nummer = gesamt minus 1087); Entdeckung unserer Welt und Entdecker und Erfinder 25 von 26 gegen TMDB Staffel 1 auf derselben Nummer.
- **Ohne zweite Quelle** (Mensch, Super Wings): nur eingetragen, weil die Liste mit unserer Folgenzahl lückenlos aufgeht (26, 52 + 52 + 40 = 144 Laufnummern ohne Lücke, Staffelgrenzen gleich unseren Folgenzahlen); Annahme, Prüfer bitte bestätigen. Beim Mensch gilt der Haupttitel, wenn die Zelle einen Zweittitel in Klammern trägt.
- **Bewusst nicht eingetragen** (Reihenfolge weicht ab oder unsicher): Transformers: Armada (Wikipedia zählt deutsch, unsere Titel 8 bis 20 stehen dort unter 40 bis 52), Captain Future (Wikipedia nennt selbst eine andere Reihenfolge, nur 16 von 40 gleich), Miraculous Staffel 2 und 4 (wie im Basis-PR), Pokémon Folge 161 (unsere 160 trägt den Titel, den Wikipedia unter 161 führt), Lupin III. Part 6 (Folge 25 ist bei Wikipedia „Episode 0“, Nummer unklar), Wundersame Geschichten (26 von 41 Folgen, keine Gegenprobe), Titel ohne deutsche Fassung (vier Pokémon-Folgen mit „—“).
- **Zahlen Mangel `folgentitel`** (Quelle: Mängelliste des Bestands plus echte Stufe `mitFremdTiteln` mit der Handliste): vorher 280 offen (Stand des Basis-PR, 283 minus 3), nachher 271 erwartet; Messung erst nach dem Bestandsbau (Cloud ohne `data/cache`). Mit der Stufe an den 10 Titeln gerechnet: 9 schließen den Mangel, Pokémon Reisen bleibt bei 132 von 136.
- Geprüft: `npx tsc --noEmit -p .` Exit 0; `pipeline/check-folgentitel-*.ts` und `pipeline/check-tmdb-folgentitel-*.ts` Exit 0; Handliste lädt ohne Fehler (`ladeHandTitel`), keine Folge über der Folgenzahl, kein vorhandener Titel überschrieben.

## Live-Beleg
Entfällt bis zum Bestandsbau; danach die Folgenliste von Es war einmal … der Mensch (26) und Super Wings (52) auf benannte Folgen messen.

## Patch Notes
Entfällt: der Basis-PR führt den Eintrag zu Folgentiteln; dieser PR ändert nur Daten derselben Art.

## Basis
Der Diff gegen `main` enthält zusätzlich die Dateien des Basis-PR (`fix/maengel-folgentitel`, zuerst mergen): `pipeline/bau/folgentitel-hand.ts`, `pipeline/bau/folgentitel-stufen.ts`, `pipeline/check-folgentitel-luecke.ts`, `tools/mutationen/folgentitel-luecke.json`, `docs/wissen/maengel.md` und `data/patchnotes/miraculous-fehlende-folgentitel-ergaenzt.yaml`. Diese Auftragsänderung berührt nur `data/folgentitel-hand.yaml`.
