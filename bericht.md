Ergebnis: Zweig fix/diff-mutanten-klassen (3 Commits). Die fünf Klassen lagen schon seit PR 4529 auf main; ergänzt: Parameter-Vorgabe auch → leerer Wert gleicher Art, Doku aller Klassen im Skill pruef-technik, Kopfkommentar diff-mutanten.mjs.
Beleg: neuer Test erst rot (2 Fälle), dann grün; beide Testdateien, tsc, eslint, Anker grün; Mutationsprobe eigener Diff 20/0 überlebt/0 unbrauchbar.
Laufzeit: typische Diffs unverändert (101/114/534 Mutanten vorher wie nachher), Bestand +0,03 %; Grenze +30 % eingehalten.
Offen: nichts. Kein PR eröffnet (Auftrag: nur Zweig plus prtext).
Schätzung vs. Ist: 45 min / ca. 35 min. Prozesse: keine übrig.

Rückblick
- gut: Vorgänger-PR über die REST-Suche schnell gefunden, statt die Klassen doppelt zu bauen.
- schlecht: shallow clone verbirgt die Herkunft (git log zeigt nur einen Daten-Commit als Ursprung).
- unerwartet: der Auftrag war zu 90 % erledigt; die geplante Aufgabe lief offenbar nach dem Merge von 4529 erneut.
- Vorschlag: geplante Bauer-Aufträge vor dem Feuern gegen gemergte PRs mit gleicher „Auftrag:“-Zeile prüfen (oder nach Merge den Zeitplan beenden).
