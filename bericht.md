# Bericht kalender-n1-n2-geschaetzt (26.11.2026)

- Zweig `fix/kalender-n1-n2-geschaetzt` gepusht (Commit cd713638), Prüfkette läuft erst im PR.
- Neues Eventfeld `vorBeobachtung`: Folge vor einer beobachteten Folge → Pille ohne „≈“; Tag bleibt `estimated`.
- `belegtBis` gilt bei `firstEpisodeNumber > 1` (Ranma S3). Vergangene `estimated`-Termine 81 → 78.
- 177 Termine in 3 Releases (Thunder 3, Blue Box S2, Black Clover S2 CR) verlieren das Pillen-„≈“.
- Bewusst nicht geändert: Katalogstarts ohne Gegenbeleg und Folgen nach der letzten Beobachtung (tank-chair): bleiben „≈“.
- Test `check-vor-beobachtung.ts` rot gegen main (Exit 1, 3 Verletzungen), grün mit Fix; zwei Mutationen gefangen.
- PR nicht angelegt (kein gh pr); Daniel/Dirigent legt aus `prtext/kalender-n1-n2-geschaetzt` an.

## Rückblick
- gut: Das Feld trennt „erschienen“ sauber von „Tag geschätzt“ und widerspricht `check-beleg-bis-anker` nicht.
- schlecht: Der Auftrag „≈ der Erscheinens-Aussage entfällt“ trifft real nur 3 Releases; die große N1-Zahl sind Folgen ohne spätere Beobachtung.
- unerwartet: Ohne Einschränkung auf `estimated` hätte das Feld 3158 Termine in `events.json` aufgebläht.
- Vorschlag: Für verstrichene Katalogstarts ohne Gegenbeleg eine Entscheidung (Hinweis „Termin vorausgesagt“) separat treffen.
- veraltet: Die Zeile in `docs/wissen/datensatz.md:1079` (belegtBis) kennt die Ausnahme `first > 1` noch nicht.
