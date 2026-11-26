# Bericht: Trailer aus deutschen Label-Kanälen (Zweig feat/trailer-label-kanaele)

1. Ursache: `fetch-trailer.ts` las nur KinoCheck-Kanäle, KinoCheck-API und TMDB und fragte nur Filme/Entdecken-Einstiege ab; Label-Kanäle (KSM Anime u. a.) fehlten ganz.
2. Gebaut: Label-Kanalliste (`data/curated/trailer-label-kanaele.yaml`), Auflösung der Uploads-Playlist per API (nie geraten), lokaler Abgleich gegen alle 2.929 Titel mit Sprach-, Namens-, Staffel- und Jahresriegel; jede Verwerfung gezählt in der Logzeile.
3. Sofortfix 156040: Handweg `data/curated/trailer-hand.yaml` (`n5yRD1JypBU`), wirkt im nächsten Bestandsbau; der neue Weg findet ihn beim ersten echten Lauf ebenfalls.
4. Klasse: 2.452 von 2.929 Titeln ohne deutschen Trailer, 886 davon mit Label-Erstausgabe (Obergrenze der Wirkung); Nachher erst nach dem echten Lauf messbar.
5. Geprüft: neue Tests (Fixtures, `main()`-Fall A7), Mutationsprobe 11 Mutanten → 0 überlebt (3 im ersten Durchgang, dafür Tests ergänzt), tsc, Umfang, Wächter grün.
6. Nicht geprüft: echter YouTube-Abruf (kein Schlüssel, Host aus der Cloud gesperrt); Kontingent gerechnet (≈100–400 Einheiten/Tag), nicht gemessen.
7. Nach Merge: Trailer-Lauf anstoßen, Logzeile „Label-Trailer: …“ und Warnung „Kanal nicht gefunden“ lesen (Kanalnamen außer KSM Anime/peppermint anime sind Vermutungen), 156040 live messen, 20 Zuordnungen stichprobenartig prüfen.

**Rückblick**
- gut: Gleichzeitige Staffel-Filterung vor dem Rang löste den Fall „zweite Staffel trägt ein Wort mehr“; Fehlversuch-Stempel und Ausfall-Trennung verhindern Kontingentverbrauch bei falschem Namen.
- schlecht: Ein per Timeout abgebrochener Mutationslauf ließ einen Mutanten im Quelltext liegen (erst am „ANKER FEHLT“ des Zweitlaufs bemerkt); Mutationsläufe gehören in den Hintergrund und enden mit Wiederherstellung (git checkout).
- unerwartet: Keine Prüfung kennt die Abdeckung „Synchro mit deutschem Trailer“; Weg 1 war aus gutem Grund (KinoCheck = Kinokanal) filmgebunden, ein bestehender Test hielt das fest und führte zur Trennung KinoCheck/Label.
- Vorschlag: Kennzahl „Synchro ohne deutschen Trailer“ mit Ratsche; Kanalnamen nach dem ersten Lauf berichtigen; Folgeschritt TMDB-Videoliste für Serien (Ansatz B).
- veraltet: der Kopfkommentar „Wer abgefragt wird … Serien gehen nur über Weg 2 und 3“ (ergänzt, nicht entfernt).
Nachbesserung: Merge von main (Historie entschallowt, Konflikt quellen.md beide Abschnitte behalten), Patchnote trailer-label-kanaele-fuer-serien ergänzt, Dateipfad der Laufausgabe aus dem PR-Text entfernt; Vorprüfung ohne ✖.
