<!-- titel: Trailer: deutsche Label-Kanäle (KSM Anime u. a.) für alle Titel mit Synchro -->

Auftrag: trailer-label-kanaele

## Plan (tragend, vor dem Bau)

**Untergrenze (einfachster Weg):** ein Handeintrag je Titel. Geht für 156040, löst aber keinen der übrigen Fälle. Ist als Sofortfix mit drin (`data/curated/trailer-hand.yaml`, im Bau vor `data/trailer.json`).

**Verglichene Ansätze** (Messung 26.11.2026 an `public/data/titles.json` + `data/trailer.json`; YouTube ist aus der Cloud gesperrt, Kontingent daher gerechnet, nicht gemessen):

| Ansatz | Deckt | Kontingent/Lauf | Urteil |
|---|---|---|---|
| A. Uploads-Playlist je Label-Kanal, Abgleich lokal gegen alle Titel (gebaut) | alles, was Labels hochladen, auch Serien | je Kanal ≈ 1 Einheit je 50 Videos; Auflösung einmalig (Beispielvideo 1, Kanalsuche 100 je Kanal, Fehlschlag 30 Tage Ruhe) → bei 7 Kanälen ≈ 100–400 Einheiten/Tag (Schätzung, Kanalgrößen erst im ersten echten Lauf bekannt), Tageskontingent 10.000 | gewählt |
| B. TMDB-Videoliste für alle Serien | nur was TMDB mit Sprachcode führt; für 156040 unbekannt, Serien liefern dort überwiegend en/ja (gemessen: 286 en + 41 ja bei Serien mit Trailer) | kein YouTube-Kontingent, 2 Abrufe je Titel, ≈ 1.900 Serien → 4 Läufe à 500 | als Folgeschritt, löst „Label lädt hoch“ nicht |
| C. Handweg | je Titel einzeln | 0 | nur Sofortfix |

**Klasse (b):** 2.452 von 2.929 Titeln ohne deutschen Trailer (Serien 1.952, Filme 500; davon 1.763 ganz ohne Trailer, 689 nur en/ja). 886 davon haben ein Label als deutsche Erstausgabe (KSM 201, peppermint 191, LEONINE 109, AniMoon 91, Anime House 56, Kazé 477 …) — das ist die Obergrenze dessen, was die Label-Kanäle treffen können. **Nachher** lässt sich erst nach dem ersten echten Lauf sagen; er schreibt die Zahl in die Logzeile.

## Was dieser PR tut

- **Ursache (a):** `pipeline/fetch-trailer.ts` (Kopfkommentar, `KANAELE`, `trailerKandidaten` in `lib/trailer-auswahl.ts:5`): Trailer nur aus KinoCheck-Kanälen, KinoCheck-API, TMDB; abgefragt nur Filme und Entdecken-Einstiege; Weg 1 (`ausIndex`) nur `format === 'MOVIE'` und nur exakter Name.
- **Fix (c):** `data/curated/trailer-label-kanaele.yaml` (Kanalname, optional `beispielVideo`) → `lib/trailer-label-kanaele.ts` löst die Uploads-Playlist per API auf (nie geraten: Beispielvideo oder Kanalsuche mit genau gleichem Namen; Ausfall wird nicht gestempelt) → Index → `lib/trailer-label.ts` gleicht gegen **alle** Titel ab. Riegel: `bewerteTreffer` über de/en/romaji, Videoname muss in der Schreibweise vollständig stehen, Gleichstand = mehrdeutig; Videotitel nennt Deutsch/German/dt./Synchro und weder OmU/Sub/GerSub/JapDub; Staffel gleich; Jahr −1/+3 um jp. Ausstrahlung/deutsche Erstausgabe. Deutscher Label-Trailer ersetzt en/ja, ein deutscher Bestand bleibt. KinoCheck-Videos bleiben bei Weg 1 (Kinokanal, nur Filme). Jede Verwerfung ist gezählt: Logzeile „Label-Trailer: n neu, n ersetzt · k von m Label-Kanälen · verworfen: …“; nicht aufgelöste Kanäle stehen als Warnung im Log.
- **Patch Notes:** `data/patchnotes/trailer-label-kanaele-fuer-serien.yaml` (Nutzen: deutsche Trailer der Anime-Labels jetzt auch für Serien).
- **Sofortfix 156040:** `n5yRD1JypBU` im Handweg (`data/curated/trailer-hand.yaml`, Beleg Daniel 26.11.2026) und über den neuen Weg beim ersten echten Lauf. Live nach dem nächsten Bestandsbau.
- Der Abgleich läuft vor der Wiedervorlage (`dran`): er kostet nichts und darf nicht an den 30-Tage-Stempeln hängen.

## Tests (d) — Fixtures, kein Netz

- `pipeline/check-trailer-label.ts`: echter Titel 156040 + KSM-Videotitel; Sprachriegel (OmU/German Sub/JapDub GerSub/Untertitel/English); Namensauszug; Staffel 1/2; Elysium-Jahr; Gleichstand; Deckung (Naruto ≠ Naruto Shippuden); Fensterränder; Übernahme in den Bestand; Handtrailer-Datei.
- `pipeline/check-trailer-lauf.ts` (Fall A7, `main()` gegen Wegwerf-Verzeichnis): Serie bekommt KSM-Trailer statt englischem TMDB-Trailer, OmU nicht, kein TMDB-Abruf für den Treffer, Kennung aus der API, Fehlversuch-Stempel, ausgefallene Abfrage ohne Stempel, zweiter Lauf löst nichts neu auf.
- **Mutationsprobe** (11 Mutanten an `trailer-label.ts`: OmU-Riegel, Jahresfenster, Fensterrand +3→+9, Staffelriegel, mehrdeutig, Deckung, Schwelle, Trailer-Pflicht, Bestand bleibt, Rang Teaser, jüngster→ältester): 3 überlebten im ersten Durchgang (Fensterrand, Deckung, Bestand), dafür je ein Test ergänzt; Zweitlauf **0 überlebt** (Rang-Mutant im Zweitlauf durch einen abgebrochenen Vorlauf nicht angewendet, im Erstlauf gefangen).
- `npx tsc --noEmit -p .`, `node tools/umfang-pruefen.mjs`, `check-sammler-lesezugriffe`, `check-workflows`, `uhr-in-tests`, `stumme-pfade`, `mutationsanker-alle` grün. Neue Dateien in `tools/quellen-liste.sh` (die Laufausgabe trailer-label-kanaele, JSON, entsteht beim ersten Lauf), `check-logic-liste.txt`, `sammler-lesezugriffe.jsonl`, `pr-nachrechnen-bot-erzeugt.mjs`.

## Nicht geprüft / nach dem Merge

- Kein YouTube-Schlüssel und kein Netz zu youtube.com in der Cloud: Abrufcode nur gegen Fixtures. **Echter Lauf nach Merge** (`gh workflow run` des Trailer-Schritts): in der Logzeile lesen, wie viele Label-Kanäle aufgelöst wurden (Namen in der Liste außer „KSM Anime“ und „peppermint anime“ sind Vermutungen und stehen sonst als „Kanal nicht gefunden“ im Log — Namen berichtigen), wie viele Titel neu, wie viele Verwerfungen je Grund. 156040 danach live messen.
- Erste Fehltreffer-Stichprobe nach dem Lauf: 20 Zuordnungen von Hand gegen den Videotitel (Einführungsbeobachtung: am ersten Fall, nach ~5 Läufen, nach einem Tag, einer Woche).

## (e) Warum Prüfungen die Lücke nicht gemeldet haben

Keine Prüfung kennt die Frage „hat dieser Titel mit Synchro einen deutschen Trailer?“: `check:logic` und die Trailer-Prüfungen prüfen nur, ob vorhandene Einträge stimmen und der Lauf rund läuft, nie die Abdeckung; der Lauf selbst meldete „0 Fehler“, weil Serien gar nicht abgefragt wurden (keine Auskunft ≠ Befund). Die Ausnahme „nur Filme und Entdecken“ stand nur im Kopfkommentar.

**Wächter-Vorschlag:** Kennzahl „Synchro ohne deutschen Trailer“ (Zahl und Anteil, aus `public/data/titles.json` + `data/trailer.json`) in die Logzeile des Trailerlaufs und in `pruefstand.json`; Ratsche „darf nur sinken“ (Stand 26.11.2026: 2.452 von 2.929). Nicht in diesem PR gebaut (eigene Entscheidung: Schwelle und Ort).
