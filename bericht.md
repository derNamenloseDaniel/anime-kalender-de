# Bericht: Joyn-Folgen aus der TV-Ausstrahlung (fix/joyn-folgen-aus-tv)

- Zweig `fix/joyn-folgen-aus-tv` gepusht (Commit 1545caf82), kein PR (Cloud); Text in `pr.md` auf `prtext/joyn-folgen-aus-tv`.
- Ursache: TV- und Joyn-Termin kannten nur gesichtete Folgen (bis 10); alles danach war ≈, daraus „Takt unklar“, „Finale ≈“, „voraussichtlich 18:50“, Pille „≈ Fg. 1–10“.
- Neu: `schedule.sendeplanBelegt` (Handflag am TV-Plan), `leiteJoynAusTv` (Bau), Pille mit ≈ nur bei geschätzten Fenstern, „ab 18:50 Uhr“ statt „voraussichtlich“.
- Klasse: 5 Joyn-Releases, 1 betroffen (Yaiba); 1 Belegvermerk im Hinweis, geschlossen.
- Wächter `joynHinterTv` und `belegvermerkImHinweis` in `pruefung.ts`; Test mit 3 Mutanten (alle rot).
- Schnellweg auf echten Daten: vorher Folge 11–24 ≈ / Pille „1–10“ / Takt unklar, nachher ohne ≈ / „1–14 · 15 ab 27.11.“ / Finale 10.12.
- Grün: berührte Tests, tsc, check:umfang, data:validate, mutationsanker-alle. Nicht gefahren: Voll-Bau (kein Cache), `check:vor-commit` (Kette).
- `public/data` nicht angefasst; sichtbar erst nach dem nächsten Bestandsbau und Deploy (dann live messen).

**Rückblick**
- Gut: Der Panel-Pfad ließ sich ohne Browser per `berechneAntwort` auf echten Daten rot/grün messen.
- Schlecht: Joyn-Yaml-Termin und TV-Termin pflegen `skipDates` doppelt; die Ableitung übernimmt jetzt die des TV-Plans, aber Ereignis-IDs driften, wenn sie in den Dateien auseinanderlaufen (Wächter fängt es als „geschätzt“).
- Unerwartet: „voraussichtlich um“ steht im Kasten für jeden Termin mit Uhrzeit, nicht nur für geschätzte — hier nur für belegte Joyn-Termine geändert.
- Vorschlag: Für weitere TV→Joyn-Titel (ProSieben FUN: Dororo, Hells Paradise) erst das Muster messen, dann `sendeplanBelegt` setzen.
- Veraltet: Der Kommentar „daher ≈“ in `docs/wissen/quellen.md` (Joyn-Fenster) und die Legende zur Pille; die Legende liegt beim anderen Bauer.
