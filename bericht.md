# Bericht: OmU nirgends sichtbar (Zweig fix/kalender-omu-nie)

- OmU erzeugt keine Termine mehr (`expandEvents`), erreicht keine Ansicht (`baueDataset`) und keine Anbieter-Kachel (`wegeOhneNurUntertitel`); eine Stelle: `shared/nur-deutsch.ts`.
- Schnellweg auf echten Daten: Basis 3 OmU-Termine und Beelzebub mit Akibapass-„nur Untertitel“, Zweig 0 und nur Netflix; 28 Titel betroffen.
- Texte, ICS-Marke, Kino „nur OmU“, Karte „Mit Untertiteln ab“, News „keine Synchro angekündigt“ (10 in `news.json`) und Mailsatz entfernt.
- Black Clover S2: Hinweis im YAML entfernt; Bau streicht jeden Ankündigungs-Hinweis, sobald das deutsche Release läuft, `pruefung.ts` verbietet ihn.
- Wächter `pipeline/check-nur-deutsch.ts` (22 Zusicherungen), Mutationsprobe 11/11 rot; berührte Tests, `check-logic.ts`, beide `tsc`, Umfang, Anker grün; Budget 171.0 → 170.9 KB.
- Patchnote angelegt. Sichtbare Daten (events/releases/news.json) wechseln erst mit dem nächsten Bestandsbau; danach live messen.
- Offen: keine Bühnen-Screenshots (kein Server in der Cloud ohne Zustimmung); gerenderter Panel-Text per SSR geprüft.

Rückblick
- Gut: Ein Filter an `expandEvents` plus `baueDataset` schloss Kalender, ICS, Newsletter und Suche auf einmal; der Textwächter fand sofort den letzten Rest („Synchro und OmU“ beim Kino).
- Schlecht: Die Mutationsprobe zeigte zuerst 2 überlebende Mutanten (Bezugsweg, Untertitel-Termin als Synchro); erst die Gegenfälle machten den Wächter dicht.
- Unerwartet: 10 OmU-Meldungen standen live in `news.json`, nicht nur der Kalender; 14 Titel tragen veraltete `ankuendigung`, bleiben aber unsichtbar.
- Vorschlag: Nach dem Bestandsbau `events.json`, `news.json` und Black Clover live messen; die 14 veralteten `ankuendigung` in `data/ankuendigungen.yaml` abschließen.
- Veraltet: Die Regel „OmU-Termin mit Deutsch-Beleg bleibt“ (Tests, Kommentar `omu-ohne-termin.ts`, `news-omu.ts`-Kopfkommentar „keine Synchro angekündigt“) — Kopfkommentar in `news-omu.ts` beschreibt die alte Meldung noch und gehört nachgeführt.
