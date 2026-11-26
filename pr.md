<!-- titel: Tests für 20 Werkzeuge ohne Test, Ratsche 160 → 140 -->
Auftrag: tools-tests-ratsche

Ergänzt je einen schlanken Test (Fixtures, kein Netz, keine Tokens) für 20 Werkzeuge der Liste `tools/werkzeug-ohne-test-bekannt.txt` und streicht sie dort: 160 → 140 Einträge. Nur neue `tools/*.test.mjs` und die Liste ändern sich, kein Werkzeug wurde angefasst. `tests-alle` findet die Tests selbst, keine Eintragung in `check-logic-liste.txt`.

Geprüft: Jeder Test ist grün. Mutationsprobe je Test mit einer gebrochenen Kernzeile, alle 20 werden rot (drei Tests wurden danach geschärft). `werkzeug-ohne-test-wache` grün, `tsc --noEmit` und `check:umfang` grün.
