<!-- titel: fix(oberflaeche): OmU nirgends sichtbar, veraltete Synchro-Hinweise weg -->

Daniel, 26.11.2026: „OmU is not allowed to be displayed anywhere, omu is only allowed in our data, not visible to users, because we are de synchro only website.“ Beispiele: Akibapass-Kachel „nur Untertitel“ unter „Kauf / Leihe“; Black Clover S2 (195604) zeigte OmU im Kalender und einen veralteten Hinweis „Synchro angekündigt, Termin offen“, obwohl die Synchro seit 07.11. läuft.

## Ursache

- `expandEvents` machte aus jedem Release mit `sprache: 'omu'` Termine; nur `ohneOmuTermine` (10-termine) strich sie, und das nur für Titel ohne Deutsch-Beleg. Black Clover hat einen Beleg, also blieb der Termin vom 28.11. im Kalender (3 Termine im heutigen `events.json`).
- Das Panel hatte für Untertitel-Wege eine eigene Anzeige (Blase „nur Untertitel“, Kopf „Anbieter, nur Untertitel“, Tooltip, Kino „nur OmU“, News „mit Untertiteln …“): gebaut als Kennzeichnung, nie als „nicht zeigen“.
- Der Hinweis am Release hatte keine Gültigkeit: nichts prüfte, ob die Synchro inzwischen läuft.

## Klasse (gezählt am Datenstand 26.11.2026)

| Fall | Zahl | Folge |
|---|---|---|
| Releases mit `sprache: 'omu'` | 3 (Vigilantes S1, S2 Netflix; Black Clover S2 Crunchyroll) | keine Termine mehr, nicht mehr in den Ansichten |
| Termine mit OmU im Kalender (`events.json`) | 3 | 0 (Schnellweg) |
| Titel mit „omu“-Adresse in Wegen | 36, davon 28 mit Kachel „nur Untertitel“ im Panel | Kachel entfällt (Schnellweg: Beelzebub 9513 zeigte Netflix + Akibapass, zeigt nur Netflix) |
| News-Meldungen „Start mit Untertiteln, keine Synchro angekündigt“ in `news.json` | 10 | entstehen nicht mehr, werden beim Schreiben entfernt |
| Übersetzungstexte mit OmU/Untertitel (statusOmu, nurUntertitel, omuAb, omuSeit, ausgabeNurUt, kinoFassungOmu, kinoFassungBeides, pilleNurOmu, pilleNurOmuOffen, news.omuOffen, news.kurz.omu, zurueckgezogenOmu, kal.omu, fachwort.omu) | 14 Schlüssel, dazu Mailsatz, ICS-Marke, Hinweis in `fuer-apps` | entfernt, Wächter liest die Textdateien |
| Veraltete Ankündigungs-Hinweise | 1 (Black Clover S2) | YAML bereinigt, Bau streicht jeden weiteren |
| Titel mit `ankuendigung`, deren Synchro schon läuft | 14 | unverändert: Karte und Kopf zeigen sie nur bei Antwort „ohne“, bei diesen 14 steht ein Termin da; nicht sichtbar |

## Ansatz

Eine Stelle: `shared/nur-deutsch.ts` (`istNurUntertitel`, `fuerBesucher`).

- Kalender, ICS, Feeds, Newsletter: `expandEvents` gibt für OmU nichts zurück; `buildIcs` filtert zusätzlich; `pruefung.ts` meldet ein Ereignis zu einem OmU-Release als Fehler. `ReleaseEvent.sprache` kennt nur noch „offen“.
- Ansichten, Suche, Filter, Panel: `baueDataset` (`web/src/lib/data.ts`) gibt Releases und Termine ohne OmU weiter; die OmU-Releases bleiben als `nurUntertitelByTitle` nur zum Ausblenden der Wege.
- Panel-Kacheln: `wegeOhneNurUntertitel` (`legende-zeilen.ts`) filtert Pillen und Bezugswege mit Untertitel-Status vor jeder Anzeige; Blase, Kopfzeile, Tooltips, Ausgaben-Pille („ohne DE“), Kino-Fassung, Karte „Termin offen“ (Start mit Untertiteln) und `ankuendigungZeile` sagen nichts mehr dazu.
- News/Mail: Meldung „synchro-offen“ entfällt (Quelle und Ausgabe), „synchro angekündigt“ heißt „Deutsche Synchro bei X angekündigt“.
- SEO: `build-og.ts` und `build-share-pages.ts` lesen nur noch `fuerBesucher(releases)`.
- Hinweise: `pipeline/lib/veraltete-hinweise.ts` (anderes Release derselben Titel/Anbieter ohne `sprache`, nicht widerlegt, erster Tag bis heute): Bau streicht den Hinweis mit Warnung, `pruefeErgebnis` verbietet ihn. Datenkorrektur in `data/curated/streaming-herbst-2026.yaml` (kein `data/cache`).
- `public/data/*` nicht von Hand angefasst; der nächste Bestandsbau übernimmt (events.json, releases.json ohne Hinweis, news.json).

## Beleg

Schnellweg auf echten Daten (`public/data`), Basis = origin/main, Zweig = dieser Stand:

- Basis rot: 3 OmU-Releases mit Ereignissen (Vigilantes S1/S2, Black Clover S2 am 2026-11-28), Black-Clover-Hinweis im Datensatz, Beelzebub 9513: Wege `netflix, Akibapass-OmU` mit Status `belegt, omu`.
- Zweig grün: keine Ereignisse, Beelzebub zeigt nur `netflix` (Status `belegt`). Der Hinweis steht noch im ausgelieferten `releases.json`, weil der Bestandsbau fehlt; im YAML ist er weg und der Bau streicht ihn ohnehin.

Wächter `pipeline/check-nur-deutsch.ts` (22 Zusicherungen, in `check-logic-liste.txt`): OmU-Fixture durch `expandEvents`, `merkbareTermine`, `buildIcs`, `wegeOhneNurUntertitel` (Plattform, Termin „nur Originalton“, Ankündigung, Bezugsweg), News, alle Übersetzungsdateien und Mailsätze, `veralteteSynchroHinweise`, `pruefeErgebnis`. Mutationsprobe: 11 Mutanten (Guard in `expandEvents`, `buildIcs`-Filter, beide Wege-Filter, Termin-Zweig der Wege, Datumsvergleich und Sprache der Hinweisregel, beide Prüfzeilen, News-Filter, Übersetzungstext mit „OmU“), 0 überlebt (erst 2 überlebten, dafür Fälle ergänzt: Bezugsweg, Untertitel-Termin als vermeintliche Synchro).

Angepasst, weil ihre Aussage überholt ist: `check-omu-ohne-termin` (nie ein Ereignis, auch mit Beleg), `check-nur-omu-hauptbestand`, `check-kopfzeile-premiere`, `check-termin-offen-karte`, `check-ankuendigung-news`, `check-news-felder-fest`, `check-dub-anbieter-pille`, `check-ics-folgen`, `check-ics-zweitanbieter`, `check-kachel-anbieter`, `check-logic` (ICS-/Newsletter-Marke, Ankündigungszeile, OmU-Meldung), dazu fünf Panel-Tests mit dem neuen Feld `nurUntertitelByTitle` in der Dataset-Attrappe. Berührte Tests grün; `check-logic.ts` ganz grün; `tsc --noEmit -p .` und `-p tools/tsconfig.worker.json` grün; `check:umfang` grün (Ketten wieder ≤ 280, nachdem die neue Prüfdatei 8 Ketten hatte); `mutationsanker-alle` 0 tote Anker (zwei Anker zu `omuZeile`/Start-Zeile in `termin-offen-karte.json` entfernt); `design-klassen`, `uhr-in-tests` unverändert.

Start-Budget (`vite build`, `tools/start-budget.mjs`): Basis 171.0 KB gzip, PR 170.9 KB (Budget 190.0).

## Datei für Datei

- `shared/nur-deutsch.ts` (neu): die eine Stelle. `shared/logic.ts`: `expandEvents` ohne OmU, Termin trägt nur „offen“. `shared/types.ts`: `ReleaseEvent.sprache` ohne „omu“. `shared/ics.ts`: Marke/Hinweis „omu“ weg, `buildIcs` filtert. `shared/ankuendigung.ts`: `omuZeile` weg, `ankuendigungZeile` ohne Start mit Untertiteln.
- `web/src/lib/data.ts`: `baueDataset` filtert, `nurUntertitelByTitle`. `DetailPanel.tsx`, `detail/panel-antwort.ts`: reichen sie an den Wege-Filter. `detail/legende-zeilen.ts`: `wegeOhneNurUntertitel`, `alleNurUntertitel` weg. `detail/pille.tsx`: Blase „nur Untertitel“ weg. `detail/antwort-regeln.ts`, `antwort-kasten-props.ts`, `antwort-kopf.tsx`: Kopf „nur Untertitel“ und Kino „nur OmU“ weg. `detail/wege-zeilen.tsx`: Tooltip und Ausgabe-Text. `detail/termin-offen-karte.tsx`: Zeile „Mit Untertiteln ab“ weg. `kalender/Marken.tsx`: nur „Synchro offen“. `news-abgeloest.tsx`, `lib/news-text.ts`, `lib/i18n*.ts(x)`, `fachwort.tsx`, `fuer-apps.tsx`: Texte.
- `worker/src/mail-abschnitte.ts`: Mailsatz.
- `pipeline/lib/veraltete-hinweise.ts` (neu), `pruefung.ts`, `bau/10-termine.ts`, `bau/omu-ohne-termin.ts` (`ohneOmuTermine` weg), `lib/news-omu.ts` (+ `ohneUntertitelMeldungen`), `bau/13-5-kerndateien.ts`, `build-og.ts`, `build-share-pages.ts`.
- `data/curated/streaming-herbst-2026.yaml` (Hinweis Black Clover), `data/patchnotes/nur-deutsche-fassungen-sichtbar.yaml`, `docs/wissen/datensatz.md`, `tools/check-logic-liste.txt`, `tools/mutationen/termin-offen-karte.json`, Tests wie oben.

## Warum Prüfungen es durchließen

- Keine Prüfung kannte „nur deutsche Fassungen“ als Sichtbarkeitsregel: `check-omu-ohne-termin` sicherte ausdrücklich, dass ein OmU-Termin **mit** Deutsch-Beleg bleibt, und Tests prüften die OmU-Kennzeichnung als Soll.
- Der Hinweis am Release hatte keine Gültigkeitsprüfung; `pruefung.ts` las nur Termine, nie Hinweise. Neu: Hinweis gegen die Release-Lage.
- Die Panel-Tests rechneten Zeilen aus fertigen Wegen und prüften die Blase; kein Test fragte „steht OmU irgendwo im Text“. Neu: Wächter liest alle Übersetzungsdateien und Mailsätze.

## Offen / nicht gemacht

- **Keine Screenshots der Bühne** in beiden Themen: die Cloud-Sitzung startet ohne Zustimmung keinen Server; der Panel-Text ist stattdessen per Server-Render in `check-kopfzeile-premiere` und `check-termin-offen-karte` geprüft (kein „Untertitel“/„OmU“ im gerenderten Kasten, Pille entfällt).
- Der Satz auf der Startseite „Synchro ist nicht Untertitel“ (`pipeline/lib/startseite.ts`) bleibt: er nennt das Prinzip, keinen Titel.
- `Release.sprache: 'omu'` und `Meldung.omu` bleiben im Datensatz und in den Typen (interne Zwecke, Bau und Wächter).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
