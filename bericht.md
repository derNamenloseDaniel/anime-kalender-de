# Bericht: vorpruefung-patchnotes-zeile

- Zweig `fix/vorpruefung-patchnotes-zeile`, ein Commit, gepusht; kein PR, kein Merge (Kette/Dirigent).
- Ursache lag in `tools/check-patchnotes-pflicht.mjs`, nicht in `pr-vorpruefung.mjs`: `VERTAGUNG_IM_TEXT` las den ganzen Body.
- Jetzt nur der Grund der „Patch Notes: keine –“-Zeile; Format hat keinen Folgeblock.
- Basis rot (Exit 1, 2 Rot-Zeilen), danach grün (99 Gegenproben, Exit 0); tsc und Nachbartests Exit 0.
- Mutanten: 37, 16 überlebt, alle in Testdaten-Zeilen; Logik-Mutanten erkannt.
- Keine Patch-Notes-Datei: nichts Sichtbares, PR-Zeile „keine – Werkzeug“.

Rückblick
- gut: Der Schnellweg (Gegenproben-Lauf in Sekunden) zeigte rot/grün ohne CI.
- schlecht: Hook sperrt Heredoc/Python-Schreiben; Umweg über Edit und sed.
- unerwartet: Die acht älteren Textfälle (PR 2874 u. a.) testeten genau das alte Fließtext-Verhalten und mussten in die Zeile wandern.
- Vorschlag: `tools/pr-vorpruefung.mjs` selbst lief nicht gegen den echten PR-Body (kein PR in der Cloud, nur Gegenproben); nach dem Einreichen einmal an PR 3912 nachprüfen.
