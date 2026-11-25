# Bericht tmdb-key-testlauf-2511
- Ursache: Testlauf startet fetch.ts mit `...process.env`; TMDB-Zweig läuft nur mit Schlüssel, `fetchJson`-Fehlertext enthält die Adresse samt `api_key`.
- Austrittsstelle: `pipeline/lib/util.ts:106` (Meldung) → `pipeline/lib/tmdb.ts:88` (warn) → stderr des Kindes → `check-anilist-mangel-lauf.ts:72` (Ausgabe). Echte Dienste: nein (fetch-Attrappe, 404).
- Klasse: ~270 Dateien mit `...process.env`, rund 75 starten fetch.ts/Sammler; zentral in `sperreUmgebung`/`check-logic-alle` entschärft statt einzeln.
- Wächter: `check-geheimnis-testlauf.ts` (vorher rot: Schlüssel im Kind und in der Ausgabe), `check-schluessel-maskiert.ts`; beide in check-logic-liste.
- Offen: Skripte außerhalb der Listen (npm-Skripte, `tools/*.mjs`-Aufrufe) erben weiter die Umgebung; Maskierung gilt nur für fetchJson (fetch-tmdb-kino.ts u. a. mit eigenem fetch nicht geprüft).
- Rückblick gut: Eine zentrale Stelle statt 75 Einzelfixes. Schlecht: Test war mit Schlüssel zusätzlich rot (`media?.title.english`, fetch.ts:58) — Attrappe ohne title; jetzt durch fehlenden Schlüssel verdeckt. Unerwartet: Heredoc-Hook blockiert Skripte mit Backslash. Vorschlag: Prüfer-Regel „Kind-Prozess in Tests nie mit rohem process.env“.
