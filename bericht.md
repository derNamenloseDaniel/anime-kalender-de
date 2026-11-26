# Bericht: Crunchyroll-Folgen je Staffel (fix/kalender-cr-absolut)

- Ursache: absolute CR-Nummer 174 aus dem Slot landet unverändert in `observed` (`05-releases.ts`), danach hebt `hebeFolgenzahlAufBeobachtung` die Folgenzahl auf 174; der OmU-Begleiter bekommt denselben deutschen Slot.
- Fix: `crZaehlungAb: 171` (Katalog: nummer 171 = Staffel-Folge 1) rechnet den Slot um; OmU-Eintrag übernimmt keinen deutschen Slot.
- Wächter `crAbsoluteZaehlungFehler` in `pruefung.ts`; Test `check-cr-zaehlung.ts` mit Mutationsprobe (3/1/1 rot).
- Klasse: 1 Crunchyroll-Release (plus OmU-Begleiter); 3 TV-Fälle außerhalb Crunchyroll nur gemeldet.
- Zweig `fix/kalender-cr-absolut` gepusht; kein PR (Cloud). Voller Bau lokal nicht möglich (`data/cache` fehlt), live messen nach Bestandsbau + Deploy.

## Rückblick
- gut: Katalogdaten (`nummer`/`laufend`) liefern den Versatz belegt; Wächter trifft den Live-Fall.
- schlecht: kein lokaler Bau, Wirkung am Datensatz nur per Funktionsaufruf auf Fixtures belegt.
- unerwartet: der Sprung-Wächter reicht für den OmU-Begleiter nicht (nur eine Nummer); dort hilft nur die OmU-Regel.
- Vorschlag: Versatz automatisch aus `crunchyroll-dub.json` (nummer − laufend) statt per Handfeld; 3 TV-Fälle separat prüfen.
- veraltet: nichts gefunden.
