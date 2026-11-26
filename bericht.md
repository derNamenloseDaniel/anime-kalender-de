# Bericht check-bestand-jw-joyn

- Wächter gab es schon: `pipeline/check-joyn-luecke-bestand.ts` (04.11.2026, in check:bestand). Gebaut nur die fehlende Ausgabe: AniList-ID, Titel, JustWatch-Joyn-Adresse, alle Lücken statt zehn.
- Heute 0 Lücken bei 101 Titeln mit JW-Joyn (alle mit Joyn-Weg) → keine echten Lücken, kein Rauschen.
- Befund: beide Ausnahmen in `data/joyn-luecke-ausnahmen.json` (8246, 10589, Naruto-Filme) sind veraltet — JustWatch führt dort kein Joyn mehr. Streichen braucht `data/**` (verboten) und die Ratsche in `pipeline/check-joyn-luecke.ts`: eigener kleiner Folgeauftrag.
- Laufzeit 2,3 s, bleibt in check:bestand (Bestandsprüfungen sind in check:logic gesperrt).
- Zweig `fix/check-bestand-jw-joyn`, 3 Commits (Umbau / Verhalten / Test), Mutanten 0 überlebt, tsc grün.

Rückblick
- gut: „Schon erledigt?“-Prüfung sparte einen doppelten Wächter.
- schlecht: Umbau-Commit brach Mutationsanker; erst der Push-Hook fiel es auf.
- unerwartet: Edit verschluckte ein Leerzeichen (`&&!`), erst der Anker fand es.
- Vorschlag: Auftragsvorlage für Wächter um „gibt es den schon? `grep -l <Stichwort> pipeline/check-*`“ ergänzen.
