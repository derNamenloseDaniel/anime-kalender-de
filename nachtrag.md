# Nachtrag

Auflagen des CI-Prüfers zu Kopf a5eba71b7, umgesetzt in 724a121d.

- Zweite Quelle für die Reihenfolge Folgennummer → Titel nicht erreichbar: TMDB (API-Schlüssel fehlt, 401), Kitsu, TVmaze, fernsehserien.de, Sender-Seiten und Wikidata sind aus der Cloud gesperrt; eine Stichprobe war daher nicht möglich.
- Entfernt aus `data/folgentitel-hand.yaml` (nur de.wikipedia als Beleg):
  - Super Wings Staffel 1 (10012621, 52 Titel)
  - Super Wings Staffel 2 (10014353, 52 Titel)
  - Super Wings Staffel 3 (10014354, 40 Titel)
  - Es war einmal … der Mensch (10004749, 26 Titel)
- Damit entfällt auch der doppelte Titel „Verschwunden im Bermuda-Dreieck“ (Staffel 2, Folge 23/24); ob Zweiteiler oder Fehler, bleibt offen, bis eine zweite Quelle lesbar ist.
- Geprüft: `check-folgentitel-luecke` ok (99 Fälle), `tsc --noEmit -p .` grün.
- Nicht berührt: die übrigen Wikipedia-Einträge (Miraculous, Es war einmal … Amerika / Entdeckung / Entdecker und Erfinder).
