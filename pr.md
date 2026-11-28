<!-- titel: Trailer-Knopf zeigt keine Reviews mehr -->
<!-- zweig: fix/trailer-kein-review -->
## Was

Der Trailer-Knopf zeigte bei „Call of the Night“ (Titel 141391) das Anime-Review `iPvK4ORRTHA` statt eines Trailers. Jetzt lehnt der Trailerlauf Nicht-Trailer in allen automatischen Wegen ab, nimmt den nächsten echten Trailer und zählt jede Ablehnung. 14 Nicht-Trailer sind aus `data/trailer.json` entfernt.

Drei Commits (Umbau und Verhalten getrennt):

1. `refactor(trailer)`: TMDB-Videoauswahl als reine Funktion `waehleTmdbVideo`, Verhalten gleich (vier Verhaltensfälle halten es fest).
2. `fix(trailer)`: Ablehnungsregel und Verdrahtung.
3. `fix(data)`: Bestand bereinigt, Doku.

Geänderte Dateien:

- `pipeline/lib/trailer-ablehnung.ts` (neu): `ablehnungsgrund` (Review, Kritik, Reaktion, ganzer Film/Folge, Folgen-Upload, Ranking, Analyse, Fan-Edit, „wrong title“, Marathon), `macheAblehner`, `entferneAbgelehnte`, Zähler und Logtext. Geprüft wird der Videotitel **ohne Animenamen** (`animeNamen`: titleDe/En/Romaji + TMDB-Name).
- `pipeline/lib/trailer-auswahl.ts`: `waehleTmdbVideo` (Weg 3) mit Ablehner und Zähler.
- `pipeline/fetch-trailer.ts`: Regel in Weg 1 (Kanalindex), Weg 2 (KinoCheck), Weg 3 (TMDB); `entferneNichtTrailer` wirft Nicht-Trailer beim Lauf­start aus dem Bestand (sonst bliebe ein alter Eintrag liegen, auch ein fremdsprachiger „bleibt“ gegen neue Funde); Logzeile „Kein Trailer (abgelehnt): …“ und je Ablehnung eine Zeile mit Kennung und Titel.
- `pipeline/lib/trailer-label.ts`: Label-Weg lehnt ab, neue Verwerfung `abgelehnt` im bestehenden Zähler.
- `pipeline/lib/trailer-hand.ts`: `ladeTrailerSperre()`.
- `data/curated/trailer-sperre.yaml` (neu): 4 Videos ohne Titelmerkmal (Clip, Opening, Intro, Filmszene), je mit Grund.
- `data/trailer.json`: 14 Einträge entfernt (Liste unten und in `bericht.md`).
- `data/patchnotes/trailer-knopf-zeigt-nur-trailer.yaml`: Patch Note.
- `pipeline/check-trailer-auswahl.ts`: Wächter erweitert.
- `docs/wissen/datensatz.md`: Abschnitt „Trailer-Knopf: kein Review, kein ganzer Film“.

Handeinträge (`trailer-hand.yaml`) gehen nie durch die Regel. Disc-Werbung („Available now“, „Coming Soon“, „On Blu-ray“) bleibt Trailer.

## Beleg

**Ursache (bestätigt):** `ausTmdb` (Weg 3) nahm aus TMDBs nutzergepflegter Videoliste den jüngsten `Trailer`/`Teaser` je Sprache ohne den Videotitel anzusehen. Dazu: Der Bestand wurde nie gegen eine Regel geprüft, nur gegen „YouTube kennt die Adresse noch“.

**Rotlauf** (Auswahl wie auf origin/main, echte Fälle):

```
✖ 141391 Call of the Night (Review) — genommen: iPvK4ORRTHA
✖ 780 Detective Conan Movie 2 (Full Movie) — genommen: BlJsEmOWQ1E
✖ 4246 (wrong title) — genommen: _vJ49Lg__a8
3 Fälle rot
```

Wächter `check-trailer-auswahl.ts` mit den neuen Fällen vor der Bestandsbereinigung: `✖ data/trailer.json enthält keinen Nicht-Trailer — gefunden: [780 ganzer-film …, 903 fan-edit …, 1506, 2171, 4246 falscher-titel, 4447, 9963, 21688 marathon, 21709 marathon, 141391 review]`, Exit 1. Nach Commit 3: grün (Exit 0).

Behalten (Fälle im Wächter): `Ranking of Kings | Offizieller Trailer` (Name enthält „Ranking“; ohne Namensabzug würde die Regel anschlagen, ebenfalls getestet), `Let’s Play | Offizieller Trailer - OmU`, `Lupin III. vs. Detektiv Conan`, Disc-Werbung (Space Dandy, Kiss Him Not Me, Persona 3, Code Geass, Place Promised …), `Chainsaw Man | JETZT AUF CRUNCHYROLL`, `Episode 3 Preview`.

Lokal gefahren: `check-trailer-auswahl`, `check-trailer-label`, `check-trailer-lauf`, `check-patchnotes` (alle Exit 0), `tsc --noEmit -p .` (Exit 0), `node tools/umfang-pruefen.mjs` (in Ordnung).

**Fünf Stufen**

1. Ursache: Weg 3 übernimmt den deutschen TMDB-Eintrag, ohne den Videotitel zu prüfen; der Bestand wird nie gegen den Titel geprüft.
2. Klasse: 1259 Einträge in `data/trailer.json`; 85 ohne Trailer-Wort (80) oder mit Nicht-Trailer-Merkmal trotz Trailer-Wort (5, z. B. fünf „Trailer [Full Movie English Sub]“-Uploads und ein Fan-Made-Trailer). Verworfen: 14 (10 per Regel: 5× ganzer Film, 1× Review, 1× Fan-Made, 1× „wrong title“, 2× Marathon; 4 per Sperrliste). Alle 14 `herkunft: tmdb`. Hinweis: Mein Zähler ergibt 80 statt 119 Einträge ohne Trailer-Wort, weil ich `preview`, `promo`, `PV` und die japanischen Wörter schon als Trailer-Wort zähle; die Liste unten gilt für meine Zählung.
3. Dauerhaft schließen: Regel in jedem automatischen Weg (1, 2, 3, Label), Bestandsbereinigung bei jedem Lauf (ein neuer Eintrag mit Nicht-Trailer-Titel fliegt beim nächsten Lauf raus), Sperrliste für Fälle ohne Titelmerkmal.
4. Wächter: `check-trailer-auswahl.ts` mit echten Fällen aus dem Bestand und ein Bestandswächter, der `data/trailer.json` gegen Regel und Sperrliste hält (rot, sobald ein Nicht-Trailer drinsteht). Laufprotokoll: Zähler je Grund, jede Ablehnung mit Kennung und Titel (Stille-Ausfälle-Skill).
5. Warum Prüfer und Prüfkette es durchgelassen haben: Der Trailerlauf wurde gegen „TMDB-Typ = Trailer“ geprüft, und diesen Typ pflegen Nutzer; kein Wächter hielt den **Bestand** gegen den Videotitel. Vorschlag: Für jeden Auswahlweg, der eine fremde, von Nutzern gepflegte Liste übernimmt, verlangt die Prüfvorgabe eine Fixture mit einem echten Fehlgriff aus dem Bestand und einen Wächter über den Bestand (Klassenzahl im PR).

**Ersatz-Trailer:** Ohne TMDB-Token nicht belegbar; die 14 Titel stehen beim nächsten Trailerlauf wieder zur Suche an, und Weg 3 nimmt dann den nächsten echten Trailer (andere Sprache/anderer Eintrag) oder keinen.

**Rückblick:** Gut: die Namensabzug-Regel trifft die drei Fehlalarm-Fälle des Auftrags nicht. Unerwartet: fünf der Fehlgriffe tragen „Trailer“ im Titel („Trailer[Full Movie English Sub]“), die Trailer-Wort-Zählung hätte sie übersehen. Lokal fehlte `node_modules` (`npm ci` nötig, sonst scheitert der Commit-Hook am Paket `typescript`).

**Gesichtet, nicht belegt (offen):** 895 (Dragonball Z „Ocean Dub [Remastered Blu-ray]“), 457 (Mushishi „Crunchyroll“), 21857 (Masamune-kun „English Subbed“), 98603 (Promo-Video 第2弾): bleiben, weil der Titel kein Nicht-Trailer-Merkmal trägt; YouTube-Seiten waren in dieser Umgebung nicht abrufbar, Inhalt nicht gesehen.

## Live-Beleg

Noch offen: `public/data/titles.json`, `titles-core.json` und `woche.json` tragen `iPvK4ORRTHA` noch; der Bestandsbau zieht sie nach dem Merge nach. Messbefehl danach: `grep -c iPvK4ORRTHA public/data/titles.json` muss 0 sein, und https://anime-kalender.de/t/13665/#/woche darf keinen Trailer-Knopf mit dem Review zeigen. Live noch nicht gemessen.

## Patch Notes

`data/patchnotes/trailer-knopf-zeigt-nur-trailer.yaml`: „Der Trailer-Knopf zeigt nur noch Trailer“ / „Bei Call of the Night lief ein Review“.

## Liste: Schlüssel, Videotitel, Entscheid, Grund

Die vollständige Tabelle (85 Zeilen) steht in `bericht.md`. Verworfen:

| Schlüssel | Videotitel | Grund |
|---|---|---|
| 141391 | CALL OF THE NIGHT / … / Anime Review | Review |
| 780, 1506, 2171, 4447, 9963 | Detective Conan Movie 2/10/11/12/15 … [Full Movie English Sub] | ganzer Film |
| 903 | Dragon ball Z movie 10 … Fan-Made Trailer | Fan-Made |
| 4246 | wrong title, please delete | falscher Titel |
| 21688, 21709 | Ancient Magus' Bride Catch-Up Marathon; Yuri!!! on ICE Series Marathon | Marathon-Werbung |
| 5090 | Techno Police 21c Opening | Sperrliste: Opening |
| 6671 | Raumpatrouille 1978 Korea Intro Anime | Sperrliste: Intro |
| 101595 | Princess Principal Crown Handler 第1章 本編冒頭映像 | Sperrliste: Filmszene |
| 130586 | Mit 0 Punkten bestanden! / Deutsche Synchro | Sperrliste: Szenenclip |

71 Einträge bleiben (Disc-/Streamwerbung, Spots, nur Name im Titel).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77zptBiamVQJ2DzdGqFY
