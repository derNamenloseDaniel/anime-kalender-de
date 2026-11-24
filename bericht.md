Bericht f157-1a-nachbesserung-2411 — Kopf 6fb648289072 (feat/f157-horizonte-eine-seite, gepusht)
A1 ja: Ausnahme mit Bedingung „Kennungszeile in kennungen.json“ statt „Paar in ak-umleitung.json“; das Paar gibt es erst mit dem Folge-PR zuAk. A2 ja, A3 ja, A4 ja, A5 ja, A6 ja, A7 ja (Nachtrag), A8 entfällt (4896 nicht auf main). Lehre ja.
Tests grün: quarantaene-pruefungen (Riegel, 4/5 neue Fälle rot an a843ac562b), buehne-faelle-nur-lauf, anleitungs-pfade-test, check-horizonte-staffeln-bestand-lauf (18 Fälle, neuer Fall rot an der Basis), check-staffel-folge-tv(-schleife), check-horizonte-staffeln, ak-umleitung-versatz, staffel-altmeldungen, tsc --noEmit, eslint, mutationsanker-alle, sammler-lesezugriffe.
Mutanten: 2/2 rot. tests-alle --alle (8 Teile): alles grün außer schwer.test.mjs (Cloud-Umgebung, Datei nicht berührt).
Bau-Vergleich gegen die Merge-Basis: kein ABBRUCH; weg nur 7000001–3; 158871 mit s/sn; 117 Termine mit staffelFolge; tr um 3 verschoben; die News fasst die RTL+-Meldungen zusammen.

Rückblick
- gut: Der Bau-Vergleich bestätigt den Riegel und die Verdrahtung am vollen Bau.
- schlecht: Der erste Bau-Vergleich lief gegen origin/main, das inzwischen weiter ist; abgebrochen und gegen die Merge-Basis neu gestartet.
- unerwartet: Über sprecherRollen schreibt rolleTermineAus nach data/sprecher-quellen.json; Tests der Schleife brauchen daher eine Kulisse.
- Vorschlag: Der Folge-PR zuAk löscht staffel-wegfall.ts samt Testblock; dort die Bedingung „Paar in ak-umleitung.json“ nachholen, falls noch nötig.
- veraltet: In `plan-horizonte-staffel-eintraege.md`/`gegenentwurf-…` stehen gelöschte Dateien (historisch, nicht angefasst).
