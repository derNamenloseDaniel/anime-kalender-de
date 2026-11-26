# Bericht maengel-weg-a (26.11.2026)

Auftrag: Weg-Mängel (kein-weg / erstausgabe-ohne-weg), id < 10000. **Kein Eintrag geliefert, kein PR** — Beleg fehlt, nichts erfunden.

- Offene Zeilen vorher: 201 Zeilen auf 107 Titeln (id < 10000); nachher unverändert 201 (keine Datei angefasst, `weg-handrecherche-a.yaml` nicht angelegt).
- Davon 64 mit deutscher Erstausgabe ≤ 2020 (Jahr belegt), 43 ohne Jahr; keiner ab 2021.
- Grenze der Cloud: WebFetch scheitert für `ofdb.de` und `fernsehserien.de` (Host nicht freigegeben); WebSearch (US) liefert fast nur eBay/ANN-Treffer mit US-UPC, keine Seite, die deutsche Tonspur, Publisher und EAN zusammen nennt.
- Geprüft ohne Beleg: Beyblade G-Revolution/V-Force, Kirby, Medabots, Cutey Honey, Transformers Cybertron, Calimero, Goldorak, Die Schwarzen Brüder, Familie Robinson, Prinzessin Erdbeer.
- Spuren (nicht belegt, nur Ansatz für Handrecherche mit OFDb-Zugang): Calimero (eBay-Listing „Calimero 1, DVD 2006“ nennt Dolby Digital 1.0 deutsch, Publisher offen); Goldorak: Kampf der Welten (Anime Stars DVD 2016, Bavaria Film; Tonspur nicht belegt); Beyblade-Staffeln (OFDb führt Staffel 1 mit deutschen DVDs von Universal, G-Revolution dort ungeprüft; Schnittberichte.com ID 37813).
- Nächster Schritt: Lauf mit freigegebenem Netz (OFDb, fernsehserien.de, bluray-disc.de) oder lokal von Hand; dann `weg-handrecherche-a.yaml` im Format von `disc-archiv-handrecherche.yaml`.

Rückblick
- Gut: Zählung und Sortierung der 107 Titel nach Jahr stehen (Skript in der Sitzung, Liste = `node tools/maengel.mjs` gefiltert auf id < 10000).
- Schlecht: Auftrag „mindestens 40 Titel“ in der Cloud nicht erreichbar.
- Unerwartet: Hosts für Direktabruf gesperrt, obwohl der Auftrag OFDb nennt.
- Vorschlag: OFDb und fernsehserien.de in der Umgebung freigeben oder den Auftrag lokal fahren.
