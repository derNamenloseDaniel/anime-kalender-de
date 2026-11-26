# Bericht: prime-suchlink-direkt

- Zweig `fix/prime-suchlink-direkt` (3 Commits) gepusht, kein PR angelegt; Text in `pr.md`.
- Ursache: `adresseDesWegs` las nur `streams`; der Kanal-Weg stand in `watchLinks`; die Pille sucht erst im Browser, der Bau kannte den Suchlink nicht (kein Suchauftrag).
- Fix: Direktlink desselben Kanals aus `watchLinks` (3 Titel), jede verbleibende Prime-Pille wird Suchauftrag (23, davon 5 neu auf `prime-suche.json`), 18 Titel mit Handbeleg ohne Kanal bleiben offen (Ratsche).
- Wächter: Fixture + Bestandswache + Worker-Test; 4 + 7 Mutanten rot (ein Mutant überlebte zuerst, Fall ergänzt).
- Sofort live: Worker stößt nach Prime-Such-Meldung `bestand-bauen.yml` an, erwartet 21–35 min statt bis 95 min; **wirkt erst nach `wrangler deploy` des Workers** (Daniel/Inhaber).
- Nicht gebaut: Zusammenlegen von Pille und „Weitere Anbieter“ in der Oberfläche; Disc-/RTL+-/Netflix-Suchen.

Rückblick
- gut: Kulisse (Kopie von `data/`) rechnet Bau-Funktionen am echten Bestand ohne Cache durch; Klassenzahl vor dem Bau bekannt.
- schlecht: erste Bestandswache war zu großzügig (zählte die Bau-Liste als Erweiterungsliste), erst die Kulissenrechnung zeigte die 18 offenen; Heredoc-Hook kostete mehrere Anläufe.
- unerwartet: 18 Aniverse-Titel haben eine gemeldete Prime-Seite ohne Kanalangabe, die Pille sucht trotzdem; die Erweiterung überspringt sie als „geprüft“.
- Vorschlag: (1) Pille mit dieser kanallosen Seite verlinken und kennzeichnen, oder Handbeleg um Kanal ergänzen; (2) Oberfläche: Wege, deren Seite eine Termin-Pille schon trägt, nicht zusätzlich unter „Weitere Anbieter“; (3) Suchlinks bei Disc/RTL+/Netflix derselben Wache unterstellen.
- veraltet: Kommentar in `weg-doppel.ts` und Doku „Panel führt dann zur Suche“ bleiben richtig nur für den mehrdeutigen Fall; sonst nichts gefunden.
