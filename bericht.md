# Bericht kein-weg-trotz-nachtrag (26.11.2026)

- Zweig `fix/kein-weg-trotz-nachtrag`, 4 Commits (1 Verhalten, 3 Wächter/Tests); PR-Text in `pr.md`.
- Ursache: `ueberholteNeins` (Bauphase 11-7) hob ein älteres „Suche ohne Treffer“ nur bei Kanal-Terminen auf; Kuroko Movie 2 (102836) behielt so trotz Nachtrag-Termin 13.09. kein-weg. Seit Handbeleg 22.11. ist der Einzelfall auf main schon behoben (Zeile `behoben` ab 23.11.); der Cloud-Befund maengel-weg-b sah einen älteren Stand.
- Klasse: 20.11. genau 1 (Kuroko), 26.11. 0 von 196 Titeln ohne Weg (364 Zeilen); gerechnet mit den echten Funktionen.
- Fix: jeder sichere, begonnene Termin überholt ein älteres Nein; Schlüssel mit jüngerem Ja-Beleg ausgenommen (sonst Abdeckungsverlust in check-handbelege bei 3 Titeln). Am heutigen Bestand 0 Änderungen.
- Wächter `check-kein-weg-trotz-quelle-bestand` (check:bestand): Rückprobe 20.11. rot mit Kuroko, main grün.
- Mutationen: 117 Mutanten, 2 überlebt, beide gleichwertig.
- Annahme: Umkehr der Entscheidung vom 17.11. („ohne Kanal gilt das Nein“) — bitte beim Abnehmen bewusst bestätigen.
- Nicht in der Cloud: kein voller Bau (kein data/cache), daher kein bau-vergleich; nur berührte Tests lokal.

Rückblick: gut — Rückprobe per `git archive` + `AK_ROOT` am alten Stand belegt den Wächter in Sekunden. Schlecht — erst rohe YAML statt `loadDubChecks` gerechnet (falsches Vorher/Nachher), korrigiert. Unerwartet — der gemeldete Fall war auf main schon behoben; die Verallgemeinerung hätte ohne `jaNachNein` still drei Ja-Belege aus check-handbelege genommen. Vorschlag — Cloud-Läufe sollten Befunde vor dem Bericht gegen den aktuellen `data/maengel.json` prüfen. Veraltet — Kommentar „Nur mit kanal“ in 11-7 (ersetzt).
