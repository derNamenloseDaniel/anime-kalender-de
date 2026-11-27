# Nachbesserung 1, PR 5089

- Auflage 1 → Commit „Kommentare gemeinsam lesen“: `leseKommentare` (patchnotes-kommentar.mjs) trägt Zugangswarnung und Abruffehler; `mockup-freigabe-pflicht.mjs` nutzt sie statt der Kopie (Filter bleiben, Mutationsliste gültig). Grep: weitere Leser (`pr-pruefer-*`, `pr-nachtraege`, `nacht-merger-welt`) sind keine Prüfungen der Liste/keine Freigabe-Ausweg-Leser, unverändert.
- Test: Kind-Prozess mit `ohneCiToken`-Umgebung im PR-Ereignis, je Prüfung der Durchreichungstabelle: Warnung vorhanden; mit Durchreichung und außerhalb des Ereignisses leer.
- Auflage 2 → gleicher Commit: Warnzeile getestet über stderr; Mutant `if (false)` wird von beiden Prüfungen gefangen. „Laut“ = Logzeile (`console.error`), nicht rot (in betrieb.md benannt).
- Auflage 3: nicht umgesetzt (Verdrahtungs-Regex bleibt), da `umgebung()` in `check-logic-alle.mjs` nicht exportiert ist; ohne Umbau keine echte Prüfung.
- Geprüft: berührte Tests, `tsc --noEmit -p .`, `check:umfang`, eslint, workflow-ohne-pakete grün.
- Rückblick: gut: eine Funktion statt zwei Kopien; schlecht: die Kopie hatte der erste Bau übersehen (Klasse „Leser mit Zugang“ erst jetzt per Grep gezählt); unerwartet: Pflicht-Prüfung exportiert die Funktion nicht; Vorschlag: `umgebung()` aus check-logic-alle exportieren (eigener Umbau); veraltet: nichts.
