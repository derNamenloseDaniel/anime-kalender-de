Akibapass-Sprache Teil 2: HTTP 404 als eigene Zählung „geo-gesperrt“

Aus CI liefern Akibapass-Produktseiten 404 (Lauf 46139426422, 28 Seiten), von einer deutschen IP 200. Bisher stille Einzelwarnung je Adresse.

Geänderte Dateien:
- `pipeline/lib/akibapass-sprache.ts`: `HostZahl.geoGesperrt`; 404 wird je Host gezählt (Host läuft weiter); Host mit 404 und ohne einen Treffer → eine Sammelwarnung.
- `pipeline/fetch-akibapass-sprache.ts`: Lauf-Zeile nennt „N geo-gesperrt (404)“.
- `pipeline/check-akibapass-sprache.ts`: vier Prüfungen (vorher rot, nachher grün).
- `prtext/akibapass-geo/bericht.md`: Befund und Alternativen. Ein Weg aus CI wurde nicht gefunden: der Cloud-Proxy sperrt alle Akibapass-/VHX-Hosts, nichts messbar (offen).

Geprüft: `npx tsx pipeline/check-akibapass-sprache.ts` ok; `tsc --noEmit` zeigt 3 Fehler, gleich auf main, keiner in diesen Dateien.

Patch Notes: keine - Pipeline-intern: Zählung und Warnung im Sammlerlauf, für Besucher nichts sichtbar.
