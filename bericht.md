# Bericht maengel-sprecher-wikipedia (26.11.2026)

- Zweig `fix/maengel-sprecher-wikipedia` (3 Commits: Parser, Test, Daten), gepusht; PR-Text auf `prtext/maengel-sprecher-wikipedia`, PR nicht eröffnet (kein `gh pr` in der Cloud).
- Handliste `data/wikipedia-sprecher-seiten.yaml`: 4 → 48 Seiten, 6 → 87 Ziele; 81 der 356 offenen `sprecher`-Titel zugeordnet (Ziel 80 erreicht). Offene Zeilen 356 → 356: kein Bau-Anschluss, also keine Schließung.
- 77 von 87 Zielen mit `unsicher` + Grund (Film/OVA/Special/Staffel nicht in der Tabelle genannt); belegt ohne Vorbehalt nur 10.
- Parser erweitert („Deu.“/„dt.“, Fettdruck, Fortsetzungszeilen); neuer Test rot gegen main (Exit 1), grün danach; Diff-Mutanten 14/14 erkannt (erster Lauf 2 Überlebende, behoben); `tsc` grün.
- Nicht gebaut: Bau-Anschluss der Handliste (liest sie `pipeline/bau/`?) — eigener Auftrag, bis dahin ändert sich keine Anzeige.
- **Gut:** `/wiki/<Seite>?action=raw` liefert ohne Sperre; 44 von rund 160 probierten Seitennamen führten zu einer brauchbaren Synchro-Tabelle. **Schlecht:** Seitennamen raten kostet Abrufe (404, Weiterleitungen, Begriffsklärungen); `api.php` ist robots-gesperrt und wurde nach 3 Abrufen gedrosselt. **Unerwartet:** viele Tabellen tragen keine Staffeltrennung; Tabellenköpfe mit „Deu.“/„dt.“/Fettdruck. **Vorschlag:** Bauphase, die die Handliste liest und `unsicher` als „≈“ zeigt; Seitennamen aus Wikidata (`wikidata-titel.json`) statt Raten. **Veraltet:** Satz „Noch ohne Bau-Anschluss“ gilt weiter; die alte Aussage „4 Fixtures“ im Testkopf ist nachgeführt.
