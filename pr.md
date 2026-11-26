fix(maengel): Titel ohne TMDB-Serie zählen als „TMDB hat kein Banner“ (banner 31→10, bild-fremdsprachig 527→259)

## Ursachen je Art (Stand 26.11.2026, `main` 233f3d7f)

| Art | offen | Ursache | Beleg |
|---|---|---|---|
| banner | 30 | Übernahme fehlt: Alle 30 haben in `data/tmdb-titles.json` `miss` ohne Kennung. `holeBanner` fragt nur Titel mit Kennung, also entsteht nie ein Eintrag in `data/tmdb-banner.json`; die Regel (`maengel-regeln.ts:158`, `keinBannerBekannt`) verlangt `null` und liest „kein Eintrag“ als „nie gesucht“. Beispiele: 669 Kujibiki Unbalance, 2282 In The Beginning, 2579 Around the World with Willy Fog | `data/tmdb-titles.json` |
| bild-fremdsprachig | 509 | gleiche Ursache für 268 (miss ohne Kennung, Plakat `null`, AniList-Cover und -Banner, nur der Banner fehlt als „null“); Rest: Plakat `ja`/`en` wartet auf Nachwahl (Fix 24.11., Lauf erst 30.11.). Beispiele: 44 Rurouni Kenshin OVA, 336 Ginyuu Mokushiroku, 351 Ojamajo Doremi Sharp | `bild-sprache.ts:28`, `tmdb-poster.json` |
| folgentitel | 281 | Sammler läuft wöchentlich: Fix „nie abgerufen“ (`abrufLuecke`) kam nach dem Lauf vom 23.11.; 92 mit Kennung ohne Folgenabruf warten auf 30.11. Rest 111 ohne TMDB-Kennung (`miss`), Rest TMDB ohne deutsche Titel. Beispiele: 51, 105, 115 | `data/tmdb-folgen.json` (letzter Lauf 23.11.) |
| fsk | 863 | Quelle liefert nichts: JustWatch führt bei diesen Titeln keine Einstufung; Franchise-Ableitung (`11-2-1-fsk-franchise.ts`) ist schon gebaut; Rest braucht die FSK-Datenbank (Zustimmung nötig, maengel.md Lösungskarte Rang 12). Beispiele: 7, 44, 46 | `maengel.md` fsk-Tabelle |
| genre | 11 | Quelle liefert nichts: 9 AniList-Titel mit `genres: []` (99643 Ookami Heart, 102365 Pororo Racing, 113178 Wuya) und 2 Eigentitel (5000001, 5000002; Handweg `data/eigene-titel.yaml`) | `titles.json` |
| laufzeit | 10 | Quelle liefert nichts: 7 Ankündigungen/frisch gestartet (178083 Tokyo Revengers, 185515, 213457 Fool Night; AniList `duration` null), 3 reine aniSearch-Titel ohne `min` (10017352, 10017963, 10020137) | `anisearch-eintraege.json`, `titles.json` |
| wertung (0→1) | 1 | Ausnahme `noch-ohne-start` endete: Fool Night 213457 startete heute (26.11.), AniList gibt noch keinen Wert | `maengel-wertung.ts:9` |
| sprecher 356, weg-ohne-adresse 4 | | nicht angefasst (Wochenlauf 30.11. bzw. lokaler Prime-Durchgang) | |

## Änderung (ein Verhaltens-Commit, kein Umbau)

- `pipeline/lib/bild-sprache.ts`: neue Funktion `bannerOhneTmdbSerie` (Titel ohne TMDB-Serie → Lookup `null`, vorhandener Eintrag gewinnt).
- `pipeline/bau/13-12-maengel.ts`: `titelOhneTmdbSerie()` (liest `tmdb-titles.json` mit `mitHandvorrang`), `bildLeser` wickelt den Banner-Lookup.
- `pipeline/check-maengel-regeln.ts`: 4 neue Prüfungen (Lookup, Ausnahme, Teil mit Banner bleibt offen, bild-fremdsprachig).
- `docs/wissen/maengel.md`: Abschnitt „Stillstand 26.11.2026“.

## Messung (`schreibeMaengel` am selben Datensatz, ohne `data/cache`; Skript im Scratchpad)

| Art | vorher | nachher |
|---|---|---|
| banner offen | 31 | 10 (Ausnahme 28 → 49) |
| bild-fremdsprachig offen | 527 | 259 (Ausnahme 297 → 565) |
| alle Arten offen | 2689 | 2400 |

Es kommt kein Titel neu hinzu (0 neu offen). Die 10 übrigen Banner-Titel haben seit 23.11. eine Handkennung (`tmdb-von-hand.yaml`) und warten auf den TMDB-Lauf 30.11. (Gegenprobe: `mitHandvorrang` greift). Geprüft: `check-maengel-regeln`, `check-maengel-bau-lauf`, `check-qualitaet-maengel-lauf`, `check-tmdb-hand-vorrang-bau`, `tsc --noEmit`, `check:umfang`, `mutationsanker-alle`, eslint.

## Restwege

- folgentitel (281): Wochenlauf 30.11. holt die 92 Titel mit Kennung (erwartet −3 bis −10); 111 ohne Kennung nur per Handzeile mit Beleg.
- bild-fremdsprachig (259): Nachwahl-Fix wirkt am 30.11. (erwartet rund −170, vgl. maengel.md 24.11.).
- fsk (863): nur über FSK-Anfrage; kein Code-Hebel.
- genre (11): 2 Eigentitel per `eigene-titel.yaml` mit Quelle (−2); AniList-9 warten auf AniList.
- laufzeit (10): Ausnahme `noch-ohne-start` (wie wertung) für Ankündigungen (≈ −5, eigener PR, Regelfrage); aniSearch-Seiten ohne `min` per Hand.
- wertung (1): heilt von selbst, sobald AniList Fool Night wertet; sonst kurze Gnadenfrist als Ausnahme.
- Besitzer-Vorschlag: banner/fsk/folgentitel/bild-fremdsprachig meldeten „Stillstand“, obwohl der Sammler nur wöchentlich läuft; Warnschwelle auf 8 Tage prüfen.

## Rückblick

- gut: ein Ausnahmefall (miss ohne Kennung) erklärte zwei Arten zugleich (−289).
- schlecht: ohne `data/cache` weicht die lokale Basis leicht ab (527 statt 509); Vergleich nur am selben Stand.
- unerwartet: 10 der 30 Banner waren schon von Hand zugeordnet, nur der Sammler fehlte.
- Vorschlag: Stillstand-Warnung um „Sammler läuft wöchentlich“ ergänzen.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
