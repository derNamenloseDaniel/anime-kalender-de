<!-- titel: feat(sprecher): Wikipedia-Sprecherliste an den Bau angeschlossen (81 sprecher-Mängel, 77 mit ≈) -->
Baut auf: fix/maengel-sprecher-wikipedia (zuerst mergen)
Auftrag: sprecher-bauanschluss

## Was

Die Handliste `data/wikipedia-sprecher-seiten.yaml` (48 Seiten, 87 Ziele; inhaltlich unverändert, kommt aus dem Basis-Zweig samt den Fixtures unter `pipeline/fixtures/wikipedia-sprecher/` und `pipeline/check-wikipedia-sprecher.ts`) wird jetzt gesammelt und gebaut:

- **Sammler** `pipeline/fetch-wikipedia-sprecher.ts` (Kern `pipeline/lib/wikipedia-sprecher-sammeln.ts`, `npm run data:wikipedia-sprecher`): holt je Seite `https://de.wikipedia.org/wiki/<Seite>?action=raw`, 2 s Abstand, je Seite höchstens einmal je Woche (`FRISCH_TAGE = 7`), liest nur den Abschnitt mit „Synchron“ in der Überschrift (`pipeline/lib/wikipedia-sprecher-seite.ts`; sonst träfe der Parser die Episodenliste mit „Deutsche Erstausstrahlung“). Störung (HTTP ≠ 200, Weiterleitung, Netzfehler) behält den alten Stand und wird gemeldet; in der Quellen-Gesundheit zählen nur gelungene Abrufe als gearbeitet, ein Lauf mit lauter Störungen ist rot. Ablage im Sammler-Ort `data/wikipedia-sprecher.json` (eine Tabellenzeile je Textzeile, 108 KB), eingetragen in `tools/quellen-liste.sh` und `tools/pr-nachrechnen-bot-erzeugt.mjs`; Schritt im Tageslauf `.github/workflows/refresh-data.yml` hinter den Wikipedia-Folgen; Frist 4 Tage in `tools/quellen-fristen.mjs` (+ `tools/quellen-fristen-takt.test.mjs`); Skript in `package.json`. Erster Lauf aus der Cloud am 27.11.2026 ist mitcommittet: 48/48 Seiten HTTP 200, 47 mit deutscher Spalte.
- **Parser** `pipeline/lib/wikipedia-sprecher.ts`: zweite Stimme auf eigener Zeile ohne `<br>` wird getrennt, wenn die Zeile mit einem Großbuchstaben beginnt (Live-Ranma 27.11.: „Thomas Rauscher“ + „Torsten Münchow (ab Staffel 3)“ waren ein Name), Komma am Ende fällt weg. Gegen alle 48 Fixtures und 48 Live-Seiten: 7 Tabellen ändern sich, alle durch getrennte Namen (Mushoku Tensei, Ranma, Re:Zero, Record of Ragnarok).
- **Bauphase** `pipeline/bau/sprecher-wikipedia.ts`, aufgerufen in `sprecherRollen` (`pipeline/bau/sprecher-anisearch.ts`) nach der aniSearch-Besetzung: Ziele der Handliste bekommen die Tabelle ihrer Seite (Fassung filtert; ein weiterer Zusatz wie „ab Staffel 3“ und ein Klammerzusatz am Namen wie „Matthias Klie (Staffel 1)“ wandern an die Figur, damit die Sprecher-Suche einen Namen nicht in mehrere spaltet) als Rollen `von: 'wikipedia'` in `public/data/voices/<id>.json`, mit Vermerk `wikipedia: { seite, url, unsicher? }` — **Quelle je Titel mitgeführt**. Nur für Titel ohne Rollen aus aniSearch, AniList oder ANN (Wikipedia füllt Lücken); wiederholbar (Wikipedia-Rollen werden jedes Mal neu abgeleitet, die aniSearch-Phase sieht sie nicht mehr). `unsicher` nur, wenn die Synchro anderweitig belegt ist (Weg mit `dub: true` ohne `dubAbgeleitet` oder `deErstausgabe.synchro`): `hasVoices` zählt im geteilten `hatDeutsch` als Deutsch-Beleg, eine vermutete Besetzung darf keinen erzeugen. `pipeline/bau/sprecher-index.ts` nimmt vermutete Besetzungen nicht in die Sprecher-Suche. Typ `von` in `pipeline/bau/sprecher-zusammen.ts` erweitert.
- **Anzeige** `web/src/components/detail/weitere.tsx`: Quellenzeile „Angaben von Wikipedia („<Seite>“)“ mit Link (CC BY-SA 4.0 verlangt ihn); vermutete Besetzung bekommt über der Liste „≈ Vermutet: <Grund>“ (`web/src/lib/i18n-spaet.ts`), Felder in `web/src/lib/data.ts`. `pipeline/check-beleg-href.ts`: der eine `href` der Quellenzeile heißt jetzt `l.url` (ANN oder Wikipedia).
- Doku: `docs/wissen/maengel.md` (Abschnitt `sprecher`), `docs/wissen/quellen.md` (neuer Abschnitt „Deutsche Sprecher aus de.wikipedia“).

**Annahmen (selbst entschieden):** (1) `unsicher` schließt den `sprecher`-Mangel (die Regel zählt `hasVoices`), ist aber an der Liste mit ≈ gekennzeichnet und fehlt im Sprecher-Index. (2) Wikipedia ersetzt nie Rollen anderer Quellen, auch nicht AniList-Teilbesetzungen. (3) Der Kommentar „Noch ohne Bau-Anschluss“ in der Handliste bleibt stehen, weil die Datei laut Auftrag unberührt bleibt (paralleler Auftrag sprecher-wikipedia-2); bitte dort nachziehen.

## Beleg

- **Basis rot:** `pipeline/check-sprecher-wikipedia-bau.ts` gegen die Basisfassung von `pipeline/bau/sprecher-anisearch.ts` (38441799): `BASIS EXIT 1`, Rot-Zeile `TypeError: Cannot read properties of undefined (reading 'titel')` in `zaehle` (die Basis kennt keine Wikipedia-Rollen und schreibt keine). Parser-Fälle gegen die Basisfassung von `pipeline/lib/wikipedia-sprecher.ts`: `BASIS EXIT 1`, `✖ Zeile mit großgeschriebenem Namen ist eine zweite Stimme …`, `✖ Komma am Ende einer Stimme fällt weg …`. Die neuen Dateien `pipeline/check-wikipedia-sprecher-sammeln.ts` und `pipeline/check-sprecher-wikipedia-anzeige.ts` sind an der Basis rot, weil Sammler und `VoiceQuellen`/`VoiceVermutet`-Export fehlen.
- **Danach grün** (Exit 0): `npx tsx pipeline/check-sprecher-wikipedia-bau.ts` (echter `sprecherRollen`-Aufruf in Wegwerf-Wurzel: sicher, unsicher mit/ohne/nur abgeleitetem Synchrobeleg, AniList bleibt, aus Liste gefallen, Fassung, Zusatz an der Figur, leerer AniList-Merker, kaputte Datei, Dublette, ohne Titel, ohne deutsche Spalte, Zählzeile, zweiter Bau ohne Schreiben, Index ohne Vermutung, aniSearch ersetzt Wikipedia und behält AniList, Bau ohne Sammlung), `pipeline/check-wikipedia-sprecher-sammeln.ts`, `pipeline/check-sprecher-wikipedia-anzeige.ts`, `pipeline/check-wikipedia-sprecher.ts`, `check-sprecher-anisearch`, `pipeline/check-beleg-href.ts`, `tools/quellen-fristen-takt.test.mjs`, `pr-nachrechnen-bot-erzeugt.test`, `check-workflows`, `stumme-pfade`, `umfang-pruefen`, `npx tsc --noEmit -p .`; die drei neuen Prüfungen stehen sortiert in `tools/check-logic-liste.txt` und laufen grün mit `bestand-sperre.cjs`.
- **Start-Budget** (`start-budget` nach `npx vite build`): Basis 38441799 171,2 KB gzip, PR 171,2 KB gzip (Änderung nur im nachgeladenen Detail-Panel).
- **Hochrechnung nächster Bestandsbau** (Skript im Scratchpad, ruft `rollenFuer`/`wendeAn` der Bauphase auf Mängelliste, Titeldatensatz und Sprecherdateien vom 26.11.2026 sowie `data/wikipedia-sprecher.json` vom 27.11.2026): von **356** offenen `sprecher`-Mängeln schließen **81** (4 belegt, 77 mit ≈), **275** bleiben. 0 Ziele ohne Titel, 0 ohne Rollen, 0 unsicher ohne Synchrobeleg; die 6 übrigen Ziele (die vier Seiten vom 22.11.) sind keine offenen Mängel, alle 6 haben schon Rollen anderer Quellen (14–49 je Titel) und bleiben unverändert. Grenze: der Synchrobeleg wird im Bau in Phase 10 geprüft, die Hochrechnung nimmt den Endstand des Titeldatensatzes; ein Weg, der erst in Phase 11 dazukommt, würde einen `unsicher`-Titel zurückhalten (Logzeile „Sprecher aus Wikipedia: … unsicher ohne Synchrobeleg“ im Bau zeigt die Zahl).
- **Merge-Verlust-Probe** (`merge-verlust-probe`): 24 „verlorene“ Zeilen, alle bewusst ersetzt (Typen, Logzeile, Quellenzeile, Parser-Split, Basis-Test-Zählwerte des Basis-Zweigs).

- **Mutationsprobe** (`diff-mutanten --basis 38441799 --liste`, Tests je Datei zugeordnet: Bauphase → `pipeline/check-sprecher-wikipedia-bau.ts` + `check-sprecher-anisearch`, Sammler → `pipeline/check-wikipedia-sprecher-sammeln.ts`, Parser → zusätzlich `pipeline/check-wikipedia-sprecher.ts`, Anzeige → `pipeline/check-sprecher-wikipedia-anzeige.ts`, Frist → `tools/quellen-fristen-takt.test.mjs`; gefahren mit `mutationslaeufer <liste> --timeout 120`). Runde 1: 93 Überlebende, daraus Tests und zwei Fixes (Zusatz an die Figur, gescheiterte Abrufe zählen nicht als gearbeitet); Runde 2 am Kopf a81a79a10: 332 rot, 22 überlebt; Runde 3 (nur die 22 + geänderte Zeile 104, Kopf 45028863f): 10 rot, 12 überlebt, Kontrolle unmutiert grün. Der letzte Commit danach ändert nur `pipeline/check-wikipedia-sprecher-sammeln.ts` (Quellen-Gesundheit über `readSourceHealth`), kein Quelltext.

| Datei | Mutanten | rot | überlebt (gleichwertig) |
|---|---|---|---|
| pipeline/bau/sprecher-anisearch.ts | 16 | 14 | 2 |
| pipeline/bau/sprecher-index.ts | 3 | 3 | 0 |
| pipeline/bau/sprecher-wikipedia.ts | 139 | 134 | 5 |
| pipeline/fetch-wikipedia-sprecher.ts | 57 | 56 | 1 |
| pipeline/lib/wikipedia-sprecher-sammeln.ts | 50 | 49 | 1 |
| pipeline/lib/wikipedia-sprecher-seite.ts | 43 | 40 | 3 |
| pipeline/lib/wikipedia-sprecher.ts | 13 | 13 | 0 |
| tools/quellen-fristen.mjs | 2 | 2 | 0 |
| web/src/components/detail/weitere.tsx | 23 | 23 | 0 |
| web/src/lib/data.ts | 7 | 7 | 0 |
| web/src/lib/i18n-spaet.ts | 1 | 1 | 0 |
| **gesamt** | 354 | 342 | 12 |

Die 12 Überlebenden, je mit Grund gleichwertig: `sprecher-anisearch.ts:47` (2×, Wächter-`throw` in `quelleVon` ist unerreichbar, weil `liesDateien` Wikipedia-Rollen vorher filtert; er sichert die Typerweiterung ab); `readFileSync(…, 'utf8')` ohne Kodierung an `sprecher-wikipedia.ts:102/113/119` und `fetch-wikipedia-sprecher.ts:30` (`JSON.parse`, `Buffer.includes` und `yaml.load` nehmen auch einen Buffer); `sprecher-wikipedia.ts:105` und `wikipedia-sprecher-sammeln.ts:69` (`return undefined`/`return null` weg ergibt dasselbe falsy Ergebnis); `sprecher-wikipedia.ts:113` `&& → ||` (in `voices/` liegen nur `.json`-Dateien; eine andere Datei ergäbe `NaN` ohne Titel und Ziel); `wikipedia-sprecher-seite.ts:22` (`kopf[2] → kopf[0]`: die ganze Überschriftszeile enthält denselben Text) und `:25` (2×, `findIndex` mit `j > i` liefert nie 0).

## Live-Beleg

Entfällt vor dem Merge (kein Fix an Live-Daten, die Wirkung kommt mit dem nächsten Bestandsbau). Abnahme danach: die Sprecherdatei von „Attack on Titan: The Last Attack“ (10019527) trägt den Vermerk Wikipedia „Attack on Titan“ mit „Film nicht genannt (Tabelle: Staffel 1–4 und OVA)“, und die Mängelliste zählt 275 offene `sprecher`-Zeilen.

## Patch Notes

`data/patchnotes/deutsche-stimmen-aus-wikipedia.yaml`: „Deutsche Stimmen für 81 weitere Titel“ — „Aus Wikipedia, vermutete Besetzung mit ≈ markiert“.

Leerraum: unverändert (nur eigene Zeilen).

Schätzung vs. Ist: 120 min geschätzt, rund 190 min (drei Mutationsrunden).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Bx77znPs5UYzuHQPpUHFLH
