# Bericht: Reiter schaltet sofort um

- Ursache bestätigt: `useReihenWechsel` öffnete erst im `finally` nach `ladeTitelBestand`.
- Gebaut: sofortiges Öffnen, Platzhalter-Panel (Reiter, Cover/Name, Blöcke), stale-sichere `useTitelNachladen`, Saison-Klasse mitgeschlossen.
- Wächter `tools/panel-reiter-sofort.test.tsx`, Rotlauf gegen origin/main im PR-Text.
- Offen: Messung gedrosselt im Browser fehlt (nur Dateigrößen gerechnet), Optik nicht per Screenshot geprüft.

Rückblick: gut: Provider-Kontext machte den Wechsel einfach; schlecht: node_modules fehlten, `npm ci` nötig; unerwartet: Mutationsanker-Hook sperrte den Push; Vorschlag: Bauer-Vorgabe um Pflichtfrage „await vor Klickziel?“; veraltet: Kommentar in `useReihenWechsel` zur Doppelladung entfällt.
