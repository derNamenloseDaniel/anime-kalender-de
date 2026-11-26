# Nachtrag Runde 1

Stand: Kopf `83e74247b` auf `fix/maengel-stillstand-2611` (main eingemergt).

## B1 — `miss` ohne Kennung ist kein Beleg (fachlich)

- **Ursache:** `sucheBesten` (`pipeline/lib/tmdb-titel-lookup.ts:67-70`) fängt Suchfehler ab und liefert `{miss:true}`; `miss` ohne `tmdbId` heißt „Namensabgleich fand nichts“ oder „Suche scheiterte“. Von den offenen Banner-Titeln führt TMDB mindestens 18 (Beleg unten), darunter Rainbow Brite, Willy Fog, Funky Fables.
- **Änderung:** Die `miss`-Regel ist raus (`pipeline/bau/13-12-maengel.ts`, `titelOhneTmdbSerie` gelöscht). Als „TMDB hat keins“ gilt nur, was von Hand als `ohne: true` belegt ist (siehe B2). Handsuche je Titel auf themoviedb.org (Websuche, TMDB-Seite gelesen; kein API-Schlüssel in der Umgebung, `www.themoviedb.org` per WebFetch nicht erreichbar): neun neue Handkennungen in `data/tmdb-von-hand.yaml` (Zeilen 535–598), Format wie die Datei, `check-logic`-Block „TMDB-Kennungen von Hand“ erfüllt (keine doppelte AniList-Kennung, Grund und Datum je Eintrag).
- **Beleg:** `pipeline/lib/bild-sprache.ts:13-25` (Doku am Lookup, Funktion ab Zeile 18), `docs/wissen/maengel.md` Abschnitt „Stillstand 26.11.2026“ neu gefasst.

### Die 30 offenen Banner-Titel (Stand `data/maengel.json`; 9 + 9 + 12 = 30)

Kennung, schon vorhanden (Handzeile vom 23.11. oder früher, Namenssuche am 26.11. gegengeprüft, gleiche Kennung):
- 3201 Serendipity the Pink Dragon → tv 42945 (themoviedb.org/tv/42945)
- 4138 Scamper the Penguin → movie 56391
- 8764 Hajime Ningen Gon → tv 211680
- 21271 Pokémon: Pikachu, What's This Key? → movie 332485
- 10005407 Dante's Inferno → movie 31967
- 10006242 Yosuga no Sora → tv 68005
- 10014545 Wheely → movie 488397
- 10021510 Modern Love Tokyo: He's Playing Our Song → movie 1524424
- 5000002 Zorros Geheimnis → movie 1717866 (Suche 26.11. zeigt „The Legend of Zorro“ 290462; bestehende Zeile unberührt, Abgleich offen)

Kennung neu (Handzeile, Quelle die TMDB-Seite):
- 10018543 Rainbow Brite → tv 572
- 2579 Around the World with Willy Fog → tv 5150 (TMDB 1983, AniList 1987, gleiche Serie)
- 10004442 Willy Fog: Journey to Center of the Earth → movie 134902 (TMDB 1995, AniList 1993)
- 10004821 Willy Fog: 20,000 Leagues → movie 101433 (TMDB 1995, AniList 1993)
- 10003453 Funky Fables → tv 241802
- 2282 In The Beginning: Stories from the Bible → tv 16962 (TMDB-Übersetzung de: „Der kleine Bibelfuchs“)
- 153734 Shen Bi → movie 487758 („Magic Brush“, 1955)
- 7252 The Enchanted Journey → movie 279987 („Enchanted Journey“, Pippo, US 10.12.1984)
- 196840 I Want You To Show Me Your Panties … Returns → tv 80867 (TMDB-Reihe mit Staffel 3 für 2026)

Offen (gesucht, kein eindeutiger Treffer, nicht als `ohne` belegt):
- 669 Kujibiki Unbalance (OVA 2004): TMDB 20736 ist die TV-Serie 2006, die OVA steht dort nur als Specials; Zuordnung unklar
- 5167 Cream Lemon: New Generation (2006): TMDB 201032 (2011) und Staffel 3 der Reihe 115290 (2006) widersprechen sich
- 9978 Return of the Dinosaurs (1976 TV): TMDB kennt nur einen Film von 1984
- 11421 Iruka to Shounen (1975), 7625 Fairy Dick (1992), 10016854 Doomfist Origin Story, 10019036 Pecharunt, 10019909 Yi Ge Xin Zuqiu, 10020137 Zizuocongming Di Xiao Lu, 10021154 Nalgaedallin Ryongma, 99643 Ookami Heart, 102651 The Perfect World: kein Treffer in der Websuche (Suchbegriff Originaltitel + Jahr + themoviedb.org). Eine Websuche belegt kein Fehlen, darum kein `ohne`.

Zähler: 18 Titel mit Kennung (9 vorhanden, 9 neu), 12 offen. Den Banner holt der TMDB-Lauf vom 30.11. (`holeBanner` fragt nur Titel mit Kennung); bis dahin bleiben auch diese 18 offen.

**Restweg `bild-fremdsprachig`:** 409 offene Titel mit `miss` ohne Kennung (davon 0 mit Handkennung), nicht angefasst. Vorschlag, eigener PR: Der Sammler (`fetch-tmdb-titles.ts`) speichert, ob die Suche fehlerfrei lief (`miss` nach Suchfehler ≠ `miss` nach leerer Antwort); erst die leere Antwort ist ein Befund, die Fehler werden wiederholt. Danach Handsuche der größten Brocken.

## B2 — `ohne: true` gilt als „TMDB hat kein Banner“

- **Ursache:** `uebernimmVonHand` (`pipeline/lib/tmdb-von-hand.ts`, `ohne`-Zweig) löscht den Cache-Eintrag; ein `miss`-Lookup sah den Titel danach nicht mehr, genau der belegte Fall blieb offen.
- **Änderung:** `bannerOhneTmdbSerie` bekommt `ohneKennungen()` (alle `ohne: true` der Handdatei, schon vorhanden und für die Plakatsuche genutzt) statt der `miss`-Menge; `pipeline/bau/13-12-maengel.ts:47`. Ein vorhandener Banner-Eintrag gewinnt weiter.
- **Beleg:** Kulissenfall Titel 25 (`miss` + `ohne: true`) → Ausnahme `banner:kein-banner-bekannt`; Zähler `ausnahme` 1.

## B3 — Kulissentest bis zum Zähler

`pipeline/check-maengel-bau-lauf.ts` (Kulisse mit eigener `data/tmdb-titles.json` und `data/tmdb-von-hand.yaml`, fester Zustand, keine Uhr, kein `public/data`): Titel 21 `miss` ohne Kennung → offen; 22 `miss` mit Kennung → offen; 23 kein Eintrag → offen; 24 Handkennung auf `miss` → offen; 25 `miss` + `ohne` → Ausnahme. Erwartung `banner offen 4, ausnahme 1` in Lauf 1, Registerschlüssel in Lauf 1 und 2 angepasst. Der Test lief gegen die alte Verdrahtung rot (Titel 21 Ausnahme, 25 offen), gegen die neue grün (20 ✓).

**Mutationsprobe** (Skill `pruef-technik`; Basislauf vorher grün; Anker je genau 1 Treffer; Skript `mutanten.cjs` im Scratchpad, Datei danach aus der Kopie zurück; gegen Kulisse und `check-maengel-regeln.ts`):

| Mutant | Kulisse | Regeln | Ergebnis |
|---|---|---|---|
| M1 Verdrahtung: alter Banner-Lookup statt `bannerOhneTmdbSerie` | rot | grün | getötet |
| M2 Menge der Ausnahmen leer | rot | grün | getötet |
| M3 Bedingung `ohneSerie.has(id)` entfernt | rot | rot | getötet |
| M4 vorhandener Eintrag gewinnt nicht | grün | rot | getötet |
| M5 Bedingung negiert | rot | rot | getötet |
| M6 `ohneKennungen` nimmt alle Handzeilen | rot | grün | getötet |
| M7 `ohneKennungen` ohne `anilistId`-Prüfung | grün | grün | überlebt, gleichwertig (ein `undefined` in der Menge trifft nie eine Titelkennung) |

„mitHandvorrang entfernt“ entfällt: der Bau liest die Handzeilen jetzt direkt über `ohneKennungen()`, `mitHandvorrang` ist an dieser Stelle weg.

## Messung (offen je Art, gleicher Stand, Bau lokal ohne `data/cache`)

| Stand | banner offen | bild-fremdsprachig offen | gesamt offen |
|---|---|---|---|
| origin/main-Code | 31 | 527 | 2689 |
| PR-Kopf `c7f9218` (`miss`-Regel) | 19 | 259 | 2409 |
| Runde 1 (nur belegte `ohne`) | 31 | 527 | 2689 |

Die 12 Banner- und 268 Bildtitel, die die `miss`-Regel zu Ausnahmen erklärte, waren unbelegt; sie sind wieder offen. Gewinn dieses PR bis zum Lauf vom 30.11.: 9 neue Handkennungen (Banner folgt mit dem Lauf) und die Ausnahme am belegten Fall.

## Prüfungen

Exit 0: `check-maengel-bau-lauf.ts`, `check-maengel-regeln.ts`, `check-tmdb-von-hand-abgeleitet.ts`, `check-sammler-lesezugriffe.ts`, `npx tsc --noEmit -p .`, `npm run check:umfang`, `tools/check-workflows.mjs`, `tools/mutationsanker-alle.test.mjs`, `tools/uhr-in-tests.mjs`. `check:handbelege` nicht gefahren (`data/dub-confirmed.yaml` unberührt). `check-logic` nicht lokal (Vollauf gesperrt); der Block „TMDB-Kennungen von Hand“ (`pipeline/check-logic.ts:1909-1928`) liest dieselbe Datei und ist von Hand nachgeprüft (kein Duplikat der AniList-Kennung, jede Zeile mit Grund und Datum).

## Rückblick

- Gut: Der Kulissenfall zeigte sofort, dass die Verdrahtung noch alt war (ein Hook hatte meinen ersten Umbau still verhindert, erst der Test merkte es).
- Schlecht: TMDB selbst ist aus der Cloud nicht erreichbar; die Handsuche lief über die Websuche, Beleg je Titel ist die gelesene TMDB-Seite, nicht die API.
- Unerwartet: Neun der 30 Titel hatten schon eine Handkennung, die Namenssuche vom 26.11. bestätigt sie unabhängig.
- Vorschlag: Sammler speichert Suchfehler getrennt von leerer Antwort (eigener PR); Zorros Geheimnis (5000002) gegen TMDB 290462 abgleichen.
- Veraltet: Der Satz „banner 31 → 10“ im PR-Text von Runde 0 gilt nicht mehr (siehe Messung).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
