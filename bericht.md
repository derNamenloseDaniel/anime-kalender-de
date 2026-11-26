Bauer-Bericht fix/prime-suchauftrag-fehler (Commit deb1d004)

- Fehler 2: Kandidatenliste aus `beurteileTreffer.namensgleich`, nicht aus allen Kacheln.
- Fehler 1: Namensvergleich Auftrag↔Seitentitel gilt auch ohne `zielAsin` (Merker hielt 10 min).
- Fehler 3: SPA-Wechsel ersetzt den Suchkasten durch die Hülle (`akPrimeKastenNeu`), wenn kein Bauer neu baut.
- Neuer Test `amazon-auswahl-nur-treffer.test.cjs`, Mutationsprobe zweimal rot; Erweiterungstests, tsc, umfang, eslint grün.
- Nicht am echten Amazon-DOM gemessen (keine Seite abgerufen); Selektor unverändert.

Rückblick
- gut: Fix ohne Zeilenzuwachs in amazon.js (Helfer ausgelagert).
- schlecht: Wirkung auf der echten Seite unbelegt; Daniel sollte nach Deploy Black Butler erneut starten.
- unerwartet: Der Kasten der Titelseite und der Suchseite teilen sich einen Merker ohne Seitenbindung.
- Vorschlag: Prüfer-Vorgabe „Fremdkarten-Fixture bei Seitenlisten, Seitenwechsel-Test bei Merkern" aufnehmen.
- veraltet: Kommentar in `amazon-genau-kasten.test.cjs` („alle Karten zum Ankreuzen") meint jetzt „alle Namenstreffer".
