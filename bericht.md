# Bericht livestream-prosieben-fun (26.11.2026)

- Ergebnis: nichts eingetragen, kein Code-PR. Die Joyn-Adresse von ProSieben FUN ist nicht sicher belegbar.
- Websuche (standard): keine Quelle nennt die `channel_id` von ProSieben FUN. Indexierte Joyn-Adressen (`live-tv?channel_id=2`, `165`, `1012`) tragen keine Senderzuordnung. Raten wäre erfunden.
- `joyn.de` ist aus der Cloud nicht auflösbar (ENOTFOUND, Netzwerkliste); die Seite selbst war nicht lesbar. Dasselbe Hindernis wie in docs/wissen/maengel.md Z. 574.
- Hinweis aus der Suche: ProSieben FUN ist bei Joyn nur im kostenpflichtigen Tarif (Joyn PLUS+); ein Link führte Gratisnutzer also eventuell zu einer Bezahlschranke.
- Zählung in `public/data` (Termine mit `sender` ProSieben FUN): events.json 28, releases.json 3. So viele bekämen den Link, sobald die Adresse belegt ist.
- Super RTL (Teil 2): Quellen (Giga, rtv.de) sagen, Joyn führt Super RTL nicht; der Livestream läuft über RTL+. Eine RTL+-Livestream-Adresse fand die Suche nicht. Nichts eingetragen. Betroffen wären events.json 134, releases.json 2, woche.json 13, woche-kacheln.json 2 Zeilen.
- Rest: Adresse von Hand an `joyn.de/live-tv` (Sender wählen, `channel_id` aus der URL) und an `plus.rtl.de` ablesen oder `joyn.de` für die Cloud freigeben; dann ist es eine Zeile in `web/src/lib/live-adresse.ts` plus ein Fall in `pipeline/check-live-adresse.ts` und ein Eintrag in `ERLAUBT` (`check-beleg-href.ts`).

Rückblick
- gut: Belegpflicht hielt; keine geratene ID im Code.
- schlecht: Cloud ohne joyn.de, Websuche ohne Zuordnung.
- unerwartet: FUN nur im Bezahltarif, Super RTL gar nicht bei Joyn.
- Vorschlag: vor dem Eintrag prüfen, ob der Link Gratisnutzer ins Leere führt.
